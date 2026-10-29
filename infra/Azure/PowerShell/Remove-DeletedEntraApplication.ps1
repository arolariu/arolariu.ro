#Requires -Version 7.0
<#
.SYNOPSIS
Permanently purges one explicitly acknowledged deleted home-tenant application.
.DESCRIPTION
Accepts only an actual deleted application type and rejects live/recovered objects.
Never deletes or purges a linked principal, restores an object, or elevates Graph/directory authority.
.EXAMPLE
.\Remove-DeletedEntraApplication.ps1 -TenantId $tenant -DisplayName '*experiments*' -WhatIf
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High', DefaultParameterSetName = 'ById')]
[OutputType([pscustomobject])]
param(
    [guid] $TenantId,
    [Parameter(ParameterSetName = 'ById')] [guid] $ApplicationObjectId = [guid]::Empty,
    [Parameter(ParameterSetName = 'ByName')] [string] $DisplayName,
    [guid] $ExpectedApplicationClientId = [guid]::Empty,
    [string] $AcknowledgePermanentDeletion,
    [ValidateRange(1, 1800)] [int] $VerificationTimeoutSeconds = 120,
    [switch] $NonInteractive
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$quiet = @{ ErrorAction = 'Stop'; WarningAction = 'SilentlyContinue'; InformationAction = 'SilentlyContinue'; Verbose = $false; Debug = $false }
$taskParameters = @{} + $PSBoundParameters
$taskCommand = $PSCmdlet
$headers = @{}
$selection = 'id,appId,displayName,signInAudience,publisherDomain,uniqueName,deletedDateTime'

function Test-AmbientConsentDefault {
    if ($null -eq $PSDefaultParameterValues -or
        ($PSDefaultParameterValues['Disabled'] -is [bool] -and $PSDefaultParameterValues['Disabled'])) { return $false }
    foreach ($key in $PSDefaultParameterValues.Keys) {
        $separator = $key.LastIndexOf(':')
        if ($separator -lt 0) { continue }
        $pattern = [WildcardPattern]::new($key.Substring($separator + 1).Trim(), [Management.Automation.WildcardOptions]::IgnoreCase)
        foreach ($control in 'Confirm', 'cf', 'NonInteractive', 'ManageTemporaryAccess', 'ResumeCleanup', 'AcknowledgePermanentDeletion') {
            if ($pattern.IsMatch($control)) { return $true }
        }
    }
    return $false
}

function Read-Actor {
    try {
        $script:context = Get-AzContext @quiet
        if (-not $context -or $context.Tenant.Id -ine $TenantId.ToString() -or $context.Environment.Name -cne $cloudName) { throw 'ContextMismatch' }
        $token = Get-AzAccessToken -ResourceUrl ($graphBase + '/') -DefaultProfile $context @quiet
        if ($token.Token -isnot [securestring]) { throw 'Unverifiable credential.' }
        $raw = [Net.NetworkCredential]::new('', $token.Token).Password
        $parts = $raw.Split('.')
        if ($parts.Length -ne 3) { throw 'Opaque token.' }
        $payload = $parts[1].Replace('-', '+').Replace('_', '/')
        $claims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload.PadRight($payload.Length + ((4 - $payload.Length % 4) % 4), '='))) | ConvertFrom-Json -AsHashtable
        $id = [guid]::Empty; $client = [guid]::Empty
        if ($claims['tid'] -ine $TenantId.ToString() -or -not [guid]::TryParse([string] $claims['oid'], [ref] $id) -or $id -eq [guid]::Empty) { throw 'Unverifiable actor.' }
        $claim = [string] $(if ($claims.ContainsKey('azp')) { $claims['azp'] } else { $claims['appid'] })
        $null = [guid]::TryParse($claim, [ref] $client)
        $script:headers = @{ Authorization = 'Bearer ' + $raw; Accept = 'application/json' }
        $actor = [pscustomobject]@{
            Task = 'Remove-DeletedEntraApplication'; Phase = 'Directory'; Environment = $cloudName; TenantId = $TenantId.ToString()
            ActualPrincipalId = $id.ToString(); ActualClientId = $(if ($client -ne [guid]::Empty) { $client.ToString() } else { '' })
            ActorKind = $(if ($claims['idtyp'] -eq 'app' -or $context.Account.Type -in 'ServicePrincipal', 'ManagedService', 'ManagedIdentity') { 'Application' } else { 'User' })
            TargetObjectId = $ApplicationObjectId.ToString()
        }
        Write-Information -MessageData $actor -Tags 'AuthContext' -InformationAction Continue
        return $actor
    }
    catch {
        if ($_.Exception.Message -eq 'ContextMismatch') { throw 'ContextMismatch: current directory tenant/cloud differs.' }
        throw 'ActorUnverifiable: current Graph actor could not be verified; authenticate/consent separately.'
    }
    finally { $raw = $null; $claims = $null; $token = $null }
}

function Read-Graph([string] $Path, [bool] $AllowMissing = $true) {
    try { $response = Invoke-WebRequest -Uri ($graphBase + '/v1.0/' + $Path) -Method GET -Headers $headers -MaximumRedirection 0 -TimeoutSec 15 -SkipHttpErrorCheck @quiet }
    catch { throw 'GraphReadFailed: bounded exact-tenant Graph request failed.' }
    if ([int] $response.StatusCode -eq 404 -and $AllowMissing) { return $null }
    if ([int] $response.StatusCode -ne 200) { throw 'GraphReadFailed: existing deleted-application read authority is required; no absence was inferred.' }
    try {
        $object = $response.Content | ConvertFrom-Json -AsHashtable
        if ($object -isnot [Collections.IDictionary]) { throw 'Unreadable metadata.' }
        return $object
    }
    catch { throw 'GraphReadFailed: selected Graph metadata is incomplete.' }
}

function Get-Snapshot($Application) {
    if ($Application -isnot [Collections.IDictionary] -or $Application['@odata.type'] -cne '#microsoft.graph.application') {
        throw 'DeletedObjectTypeMismatch: only an actual deleted application is eligible; users/groups/principals and derived types are never purged.'
    }
    $objectId = [guid]::Empty; $clientId = [guid]::Empty; $deletedAt = [datetimeoffset]::MinValue
    if (-not [guid]::TryParse([string] $Application['id'], [ref] $objectId) -or $objectId -ne $ApplicationObjectId -or
        -not [guid]::TryParse([string] $Application['appId'], [ref] $clientId) -or $clientId -eq [guid]::Empty) {
        throw 'ApplicationOwnershipMismatch: deleted application/object identity is unreadable.'
    }
    if ($clientId -ne $ExpectedApplicationClientId) { throw 'ClientIdMismatch: deleted application differs from the explicit expected client.' }
    if ($Application['signInAudience'] -cne 'AzureADMyOrg' -or
        ([string] $Application['publisherDomain']) -match '(^|\.)microsoft\.com$|^(microsoft|microsoftservices)\.onmicrosoft\.com$' -or
        -not [datetimeoffset]::TryParse([string] $Application['deletedDateTime'], [ref] $deletedAt)) {
        throw 'ApplicationOwnershipMismatch: authoritative local tenant-only, non-first-party deletion metadata is required.'
    }
    return ([ordered]@{
        Id = $Application['id']; ClientId = $Application['appId']; DisplayName = $Application['displayName']; UniqueName = $Application['uniqueName']
        SignInAudience = $Application['signInAudience']; PublisherDomain = $Application['publisherDomain']; DeletedAt = $deletedAt.ToUniversalTime().ToString('o')
    } | ConvertTo-Json -Compress)
}

function Assert-NoActiveObject {
    if ($null -ne (Read-Graph ("applications/$ApplicationObjectId" + '?$select=id,appId'))) {
        throw 'ActiveObjectExists: the selected application is live/recovered; this task never deletes it.'
    }
    if ($ExpectedApplicationClientId -ne [guid]::Empty -and
        $null -ne (Read-Graph ("applications(appId='$ExpectedApplicationClientId')" + '?$select=id,appId'))) {
        throw 'ActiveObjectExists: the expected client has an active registration; reconcile it before any permanent purge.'
    }
}

function Invoke-PurgeTask {
    if ($taskCommand.ParameterSetName -eq 'ByName') {
        $path = 'directory/deletedItems/microsoft.graph.application?$select=' + $selection
        $candidates = [Collections.Generic.List[object]]::new(); $pages = 0
        do {
            $page = Read-Graph $path $false
            foreach ($item in @($page['value'])) { if ($item['displayName'] -like $DisplayName) { $candidates.Add($item) } }
            $path = ''
            if ($page['@odata.nextLink']) {
                $next = [uri] $page['@odata.nextLink']; $base = [uri] $graphBase
                if (-not $next.IsAbsoluteUri -or $next.Scheme -ne 'https' -or $next.Host -ine $base.Host -or $next.UserInfo -or
                    $next.Fragment -or $next.AbsolutePath -cne '/v1.0/directory/deletedItems/microsoft.graph.application') {
                    throw 'TargetScope: pagination escaped the deleted-application collection.'
                }
                $path = $next.PathAndQuery.Substring('/v1.0/'.Length)
            }
            $pages++
            if ($pages -gt 100) { throw 'GraphReadFailed: deleted inventory pagination limit reached.' }
        } while ($path)
        if (-not $candidates.Count) { throw 'TargetNotFound: no deleted application matched the explicit tenant/name filter.' }
        for ($i = 0; $i -lt $candidates.Count; $i++) {
            Write-Host "$($i + 1): object=$($candidates[$i]['id']) client=$($candidates[$i]['appId']) deleted=$($candidates[$i]['deletedDateTime']) name=$($candidates[$i]['displayName'])"
        }
        $choice = 0
        if (-not [int]::TryParse((Read-Host 'Select deleted application number'), [ref] $choice) -or $choice -lt 1 -or $choice -gt $candidates.Count) {
            throw 'TargetSelectionDeclined: no exact deleted application was selected.'
        }
        $script:ApplicationObjectId = [guid] $candidates[$choice - 1]['id']
        if ($ExpectedApplicationClientId -eq [guid]::Empty) { $script:ExpectedApplicationClientId = [guid] $candidates[$choice - 1]['appId'] }
    }
    $selected = Read-Graph ("directory/deletedItems/$ApplicationObjectId" + '?$select=' + $selection)
    if ($null -eq $selected) { Assert-NoActiveObject; return 'NoChange' }
    if ($ExpectedApplicationClientId -eq [guid]::Empty) { $script:ExpectedApplicationClientId = [guid] $selected['appId'] }
    $snapshot = Get-Snapshot $selected
    Assert-NoActiveObject
    Write-Information -MessageData ([pscustomobject]@{
        Task = 'Remove-DeletedEntraApplication'; Phase = 'Selected'; TenantId = $TenantId.ToString()
        ApplicationObjectId = $ApplicationObjectId.ToString(); ApplicationClientId = $ExpectedApplicationClientId.ToString(); DeletedAt = $selected['deletedDateTime']
        Consequence = 'Irreversible: application restoration becomes impossible. Linked principals are never implicitly purged.'
    }) -InformationAction Continue
    if (-not $WhatIfPreference -and ((Test-AmbientConsentDefault) -or ($NonInteractive -and
        (-not $taskParameters.ContainsKey('Confirm') -or [bool] $taskParameters['Confirm'])))) {
        throw 'ConfirmationRequired: purge requires invocation-level consent with session control defaults disabled.'
    }
    $approved = $taskCommand.ShouldProcess("tenant=$TenantId object=$ApplicationObjectId client=$ExpectedApplicationClientId", 'Permanently purge only the selected deleted application')
    if ($approved -and -not $NonInteractive -and $taskParameters.ContainsKey('Confirm') -and -not [bool] $taskParameters['Confirm']) {
        $approved = $taskCommand.ShouldContinue("Permanently purge application $ApplicationObjectId; this cannot be undone.", 'Confirm irreversible task')
    }
    if (-not $approved) { return $(if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' }) }
    if (-not $NonInteractive -and -not $taskParameters.ContainsKey('AcknowledgePermanentDeletion')) {
        $script:AcknowledgePermanentDeletion = Read-Host "Type exact application object ID to acknowledge permanent deletion: $ApplicationObjectId"
    }
    if (($NonInteractive -and -not $taskParameters.ContainsKey('AcknowledgePermanentDeletion')) -or $AcknowledgePermanentDeletion -cne $ApplicationObjectId.ToString()) {
        throw 'PurgeAcknowledgementRequired: explicitly acknowledge the exact selected application object ID, not its client ID.'
    }
    $currentActor = Read-Actor
    if ($currentActor.ActualPrincipalId -ine $actor.ActualPrincipalId) { throw 'ActorMismatch: Graph actor changed after confirmation.' }
    $current = Read-Graph ("directory/deletedItems/$ApplicationObjectId" + '?$select=' + $selection)
    if ($null -eq $current) { Assert-NoActiveObject; return 'NoChange' }
    if ((Get-Snapshot $current) -cne $snapshot) { throw 'StateConflict: deleted application generation changed; confirm a new invocation.' }
    Assert-NoActiveObject
    try { $removed = Invoke-WebRequest -Uri "$graphBase/v1.0/directory/deletedItems/$ApplicationObjectId" -Method DELETE -Headers $headers -MaximumRedirection 0 -TimeoutSec 30 -SkipHttpErrorCheck @quiet }
    catch { throw 'DirectoryPurgeFailed: exact application purge failed; reconcile state before retrying.' }
    if ([int] $removed.StatusCode -in 401, 403) { throw 'DirectoryAuthorityRequired: existing deleted-application purge permission and directory authority are required; no elevation occurred.' }
    if ([int] $removed.StatusCode -ne 204) { throw 'DirectoryPurgeFailed: application purge did not return 204.' }
    $deadline = (Get-Date).AddSeconds($VerificationTimeoutSeconds)
    while ($null -ne (Read-Graph ("directory/deletedItems/$ApplicationObjectId" + '?$select=id'))) {
        if ((Get-Date) -ge $deadline) { throw 'VerificationFailed: permanent application deletion was not observed within the bounded wait.' }
        Start-Sleep -Seconds 2
    }
    return 'Changed'
}

if ($TenantId -eq [guid]::Empty -or ($PSCmdlet.ParameterSetName -eq 'ById' -and $ApplicationObjectId -eq [guid]::Empty) -or
    ($PSCmdlet.ParameterSetName -eq 'ByName' -and ([string]::IsNullOrWhiteSpace($DisplayName) -or $DisplayName -match '[\x00-\x1f\x7f]'))) {
    throw 'InvalidInput: explicit tenant and exact deleted application object ID or manual name filter are required.'
}
if ($NonInteractive -and ($PSCmdlet.ParameterSetName -ne 'ById' -or $ExpectedApplicationClientId -eq [guid]::Empty)) {
    throw 'TargetScope: automation requires exact deleted object ID and explicit expected client ID.'
}
try {
    $null = Get-Command Get-AzContext, Get-AzAccessToken, Invoke-WebRequest @quiet
    $context = Get-AzContext @quiet
}
catch { throw 'PrerequisiteMissing: load Az.Accounts and authenticate separately.' }
if (-not $context -or $context.Tenant.Id -ine $TenantId.ToString()) { throw 'ContextMismatch: current tenant differs from the explicit directory scope.' }
$cloudName = [string] $context.Environment.Name
$graphs = @{ AzureCloud = 'https://graph.microsoft.com'; AzureUSGovernment = 'https://graph.microsoft.us'; AzureChinaCloud = 'https://microsoftgraph.chinacloudapi.cn' }
$graphBase = $graphs[$cloudName]
if (-not $graphBase) { throw 'UnsupportedCloud: no verified Graph endpoint exists for this context.' }
$ConfirmPreference = if ($NonInteractive) { 'None' } else { 'Low' }
try { $actor = Read-Actor; $status = Invoke-PurgeTask }
finally { $headers.Authorization = $null }
[pscustomobject]@{
    Task = 'Remove-DeletedEntraApplication'; Status = $status; Changed = $status -eq 'Changed'; TenantId = $TenantId.ToString()
    TargetResourceId = "$graphBase/v1.0/directory/deletedItems/$ApplicationObjectId"; Subject = $ExpectedApplicationClientId.ToString()
    Fields = [string[]] @('DeletedApplication')
}
