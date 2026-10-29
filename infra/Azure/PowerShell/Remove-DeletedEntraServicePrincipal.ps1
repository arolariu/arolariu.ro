#Requires -Version 7.0
<#
.SYNOPSIS
Permanently purges one explicitly acknowledged eligible deleted application principal.
.DESCRIPTION
Never purges managed-identity backing principals, users/groups, foreign/first-party/gallery objects,
or a restored live object. Preserves its registration and any newly created principal with another ID.
.EXAMPLE
.\Remove-DeletedEntraServicePrincipal.ps1 -TenantId $tenant -DisplayName '*experiments*' -WhatIf
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High', DefaultParameterSetName = 'ById')]
[OutputType([pscustomobject])]
param(
    [guid] $TenantId,
    [Parameter(ParameterSetName = 'ById')] [guid] $ServicePrincipalObjectId = [guid]::Empty,
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
$applicationId = ''
$selection = 'id,appId,displayName,appOwnerOrganizationId,servicePrincipalType,signInAudience,applicationTemplateId,publisherName,deletedDateTime'

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
            Task = 'Remove-DeletedEntraServicePrincipal'; Phase = 'Directory'; Environment = $cloudName; TenantId = $TenantId.ToString()
            ActualPrincipalId = $id.ToString(); ActualClientId = $(if ($client -ne [guid]::Empty) { $client.ToString() } else { '' })
            ActorKind = $(if ($claims['idtyp'] -eq 'app' -or $context.Account.Type -in 'ServicePrincipal', 'ManagedService', 'ManagedIdentity') { 'Application' } else { 'User' })
            TargetObjectId = $ServicePrincipalObjectId.ToString()
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
    if ([int] $response.StatusCode -ne 200) { throw 'GraphReadFailed: existing deleted-principal/application metadata authority is required.' }
    try {
        $object = $response.Content | ConvertFrom-Json -AsHashtable
        if ($object -isnot [Collections.IDictionary]) { throw 'Unreadable metadata.' }
        return $object
    }
    catch { throw 'GraphReadFailed: selected Graph metadata is incomplete.' }
}

function Get-Snapshot($Principal) {
    if ($Principal -isnot [Collections.IDictionary] -or $Principal['@odata.type'] -cne '#microsoft.graph.servicePrincipal') {
        throw 'DeletedObjectTypeMismatch: only an actual deleted servicePrincipal is eligible.'
    }
    if ($Principal['servicePrincipalType'] -cne 'Application') { throw 'UnsupportedPrincipalType: backing managed identities and non-application principals are never purged.' }
    $objectId = [guid]::Empty; $clientId = [guid]::Empty; $deletedAt = [datetimeoffset]::MinValue
    if (-not [guid]::TryParse([string] $Principal['id'], [ref] $objectId) -or $objectId -ne $ServicePrincipalObjectId -or
        -not [guid]::TryParse([string] $Principal['appId'], [ref] $clientId) -or $clientId -eq [guid]::Empty) {
        throw 'PrincipalOwnershipMismatch: deleted principal object/client identity is unreadable.'
    }
    if ($clientId -ne $ExpectedApplicationClientId) { throw 'ClientIdMismatch: deleted principal differs from the explicit expected client.' }
    if ($Principal['appOwnerOrganizationId'] -ine $TenantId.ToString() -or $Principal['signInAudience'] -cne 'AzureADMyOrg' -or
        $Principal['applicationTemplateId'] -or $Principal['publisherName'] -in 'Microsoft', 'Microsoft Corporation', 'Microsoft Services' -or
        -not [datetimeoffset]::TryParse([string] $Principal['deletedDateTime'], [ref] $deletedAt)) {
        throw 'PrincipalOwnershipMismatch: authoritative local tenant-only, non-gallery/non-first-party deletion metadata is required.'
    }
    return ([ordered]@{
        Id = $Principal['id']; ClientId = $Principal['appId']; DisplayName = $Principal['displayName']; OwnerTenant = $Principal['appOwnerOrganizationId']
        PrincipalType = $Principal['servicePrincipalType']; SignInAudience = $Principal['signInAudience']; DeletedAt = $deletedAt.ToUniversalTime().ToString('o')
    } | ConvertTo-Json -Compress)
}

function Assert-NoActiveObject {
    if ($null -ne (Read-Graph ("servicePrincipals/$ServicePrincipalObjectId" + '?$select=id,appId'))) {
        throw 'TargetChanged: the selected principal is live/restored; this task never deletes it.'
    }
}

function Get-ApplicationState {
    $application = Read-Graph ("applications(appId='$ExpectedApplicationClientId')" + '?$select=id,appId,signInAudience,publisherDomain')
    if ($null -eq $application) {
        if (-not $taskParameters.ContainsKey('ExpectedApplicationClientId')) { throw 'PrincipalOwnershipMismatch: orphan purge requires a separately supplied expected client ID.' }
        return ''
    }
    $id = [guid]::Empty
    if (-not [guid]::TryParse([string] $application['id'], [ref] $id) -or $id -eq [guid]::Empty -or
        $application['appId'] -ine $ExpectedApplicationClientId.ToString() -or $application['signInAudience'] -cne 'AzureADMyOrg' -or
        ([string] $application['publisherDomain']) -match '(^|\.)microsoft\.com$|^(microsoft|microsoftservices)\.onmicrosoft\.com$') {
        throw 'PrincipalOwnershipMismatch: the associated registration is not the expected local tenant-only application.'
    }
    return $id.ToString()
}

function Invoke-PurgeTask {
    if ($taskCommand.ParameterSetName -eq 'ByName') {
        $path = 'directory/deletedItems/microsoft.graph.servicePrincipal?$select=' + $selection
        $candidates = [Collections.Generic.List[object]]::new(); $pages = 0
        do {
            $page = Read-Graph $path $false
            foreach ($item in @($page['value'])) { if ($item['displayName'] -like $DisplayName) { $candidates.Add($item) } }
            $path = ''
            if ($page['@odata.nextLink']) {
                $next = [uri] $page['@odata.nextLink']; $base = [uri] $graphBase
                if (-not $next.IsAbsoluteUri -or $next.Scheme -ne 'https' -or $next.Host -ine $base.Host -or $next.UserInfo -or
                    $next.Fragment -or $next.AbsolutePath -cne '/v1.0/directory/deletedItems/microsoft.graph.servicePrincipal') {
                    throw 'TargetScope: pagination escaped the deleted-principal collection.'
                }
                $path = $next.PathAndQuery.Substring('/v1.0/'.Length)
            }
            $pages++
            if ($pages -gt 100) { throw 'GraphReadFailed: deleted inventory pagination limit reached.' }
        } while ($path)
        if (-not $candidates.Count) { throw 'TargetNotFound: no deleted principal matched the explicit tenant/name filter.' }
        for ($i = 0; $i -lt $candidates.Count; $i++) {
            Write-Host "$($i + 1): object=$($candidates[$i]['id']) client=$($candidates[$i]['appId']) owner=$($candidates[$i]['appOwnerOrganizationId']) type=$($candidates[$i]['servicePrincipalType']) deleted=$($candidates[$i]['deletedDateTime'])"
        }
        $choice = 0
        if (-not [int]::TryParse((Read-Host 'Select deleted application principal number'), [ref] $choice) -or $choice -lt 1 -or $choice -gt $candidates.Count) {
            throw 'TargetSelectionDeclined: no exact deleted principal was selected.'
        }
        $script:ServicePrincipalObjectId = [guid] $candidates[$choice - 1]['id']
        if ($ExpectedApplicationClientId -eq [guid]::Empty) { $script:ExpectedApplicationClientId = [guid] $candidates[$choice - 1]['appId'] }
    }
    $selected = Read-Graph ("directory/deletedItems/$ServicePrincipalObjectId" + '?$select=' + $selection)
    if ($null -eq $selected) { Assert-NoActiveObject; return 'NoChange' }
    if ($ExpectedApplicationClientId -eq [guid]::Empty) { $script:ExpectedApplicationClientId = [guid] $selected['appId'] }
    $snapshot = Get-Snapshot $selected
    Assert-NoActiveObject
    $script:applicationId = Get-ApplicationState
    Write-Information -MessageData ([pscustomobject]@{
        Task = 'Remove-DeletedEntraServicePrincipal'; Phase = 'Selected'; TenantId = $TenantId.ToString()
        ServicePrincipalObjectId = $ServicePrincipalObjectId.ToString(); ApplicationClientId = $ExpectedApplicationClientId.ToString()
        ApplicationObjectId = $applicationId; DeletedAt = $selected['deletedDateTime']
        Consequence = 'Irreversible: principal restoration becomes impossible. Registration, other deleted items and new principals are preserved.'
    }) -InformationAction Continue
    if (-not $WhatIfPreference -and ((Test-AmbientConsentDefault) -or ($NonInteractive -and
        (-not $taskParameters.ContainsKey('Confirm') -or [bool] $taskParameters['Confirm'])))) {
        throw 'ConfirmationRequired: purge requires invocation-level consent with session control defaults disabled.'
    }
    $approved = $taskCommand.ShouldProcess("tenant=$TenantId SP=$ServicePrincipalObjectId client=$ExpectedApplicationClientId", 'Permanently purge only the selected deleted application principal')
    if ($approved -and -not $NonInteractive -and $taskParameters.ContainsKey('Confirm') -and -not [bool] $taskParameters['Confirm']) {
        $approved = $taskCommand.ShouldContinue("Permanently purge principal $ServicePrincipalObjectId; this cannot be undone.", 'Confirm irreversible task')
    }
    if (-not $approved) { return $(if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' }) }
    if (-not $NonInteractive -and -not $taskParameters.ContainsKey('AcknowledgePermanentDeletion')) {
        $script:AcknowledgePermanentDeletion = Read-Host "Type exact principal object ID to acknowledge permanent deletion: $ServicePrincipalObjectId"
    }
    if (($NonInteractive -and -not $taskParameters.ContainsKey('AcknowledgePermanentDeletion')) -or $AcknowledgePermanentDeletion -cne $ServicePrincipalObjectId.ToString()) {
        throw 'PurgeAcknowledgementRequired: explicitly acknowledge the exact selected principal object ID, not its client ID.'
    }
    $currentActor = Read-Actor
    if ($currentActor.ActualPrincipalId -ine $actor.ActualPrincipalId) { throw 'ActorMismatch: Graph actor changed after confirmation.' }
    $current = Read-Graph ("directory/deletedItems/$ServicePrincipalObjectId" + '?$select=' + $selection)
    if ($null -eq $current) { Assert-NoActiveObject; return 'NoChange' }
    if ((Get-Snapshot $current) -cne $snapshot -or (Get-ApplicationState) -cne $applicationId) { throw 'TargetChanged: principal deletion generation/registration changed; confirm a new invocation.' }
    Assert-NoActiveObject
    try { $removed = Invoke-WebRequest -Uri "$graphBase/v1.0/directory/deletedItems/$ServicePrincipalObjectId" -Method DELETE -Headers $headers -MaximumRedirection 0 -TimeoutSec 30 -SkipHttpErrorCheck @quiet }
    catch { throw 'DirectoryPurgeFailed: exact principal purge failed; reconcile state before retrying.' }
    if ([int] $removed.StatusCode -in 401, 403) { throw 'DirectoryAuthorityRequired: existing deleted-principal purge permission and directory authority are required; no elevation occurred.' }
    if ([int] $removed.StatusCode -ne 204) { throw 'DirectoryPurgeFailed: principal purge did not return 204.' }
    $deadline = (Get-Date).AddSeconds($VerificationTimeoutSeconds)
    while ($null -ne (Read-Graph ("directory/deletedItems/$ServicePrincipalObjectId" + '?$select=id'))) {
        if ((Get-Date) -ge $deadline) { throw 'VerificationFailed: permanent principal deletion was not observed within the bounded wait.' }
        Start-Sleep -Seconds 2
    }
    if ((Get-ApplicationState) -cne $applicationId) { throw 'TargetChanged: registration changed concurrently; this task did not modify it.' }
    return 'Changed'
}

if ($TenantId -eq [guid]::Empty -or ($PSCmdlet.ParameterSetName -eq 'ById' -and $ServicePrincipalObjectId -eq [guid]::Empty) -or
    ($PSCmdlet.ParameterSetName -eq 'ByName' -and ([string]::IsNullOrWhiteSpace($DisplayName) -or $DisplayName -match '[\x00-\x1f\x7f]'))) {
    throw 'InvalidInput: explicit tenant and exact deleted principal object ID or manual name filter are required.'
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
    Task = 'Remove-DeletedEntraServicePrincipal'; Status = $status; Changed = $status -eq 'Changed'; TenantId = $TenantId.ToString()
    TargetResourceId = "$graphBase/v1.0/directory/deletedItems/$ServicePrincipalObjectId"; Subject = $ExpectedApplicationClientId.ToString()
    Fields = [string[]] @('DeletedServicePrincipal'); ApplicationRegistrationObjectId = $applicationId
}
