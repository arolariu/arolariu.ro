#Requires -Version 7.0
<#
.SYNOPSIS
Soft-deletes one explicitly selected home-tenant application registration.
.DESCRIPTION
Uses existing Graph authority. Reports linked service-principal effects without separately deleting
or purging them. Recreating the Bicep alternate key can generate a different application client ID.
.EXAMPLE
.\Remove-EntraApplication.ps1 -TenantId $tenant -DisplayName '*experiments*' -WhatIf
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High', DefaultParameterSetName = 'ById')]
[OutputType([pscustomobject])]
param(
    [guid] $TenantId,
    [Parameter(ParameterSetName = 'ById')] [guid] $ApplicationObjectId = [guid]::Empty,
    [Parameter(ParameterSetName = 'ByName')] [string] $DisplayName,
    [guid] $ExpectedApplicationClientId = [guid]::Empty,
    [ValidateRange(1, 1800)] [int] $VerificationTimeoutSeconds = 120,
    [switch] $NonInteractive
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$quiet = @{ ErrorAction = 'Stop'; WarningAction = 'SilentlyContinue'; InformationAction = 'SilentlyContinue'; Verbose = $false; Debug = $false }
$taskParameters = @{} + $PSBoundParameters
$taskCommand = $PSCmdlet
$headers = @{}
$linkedId = ''
$linkedState = 'NotObserved'
$selection = 'id,appId,displayName,signInAudience,identifierUris,api,uniqueName,publisherDomain,verifiedPublisher'

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
        if (-not $context -or $context.Tenant.Id -ine $TenantId.ToString()) { throw 'ContextMismatch' }
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
            Task = 'Remove-EntraApplication'; Phase = 'Directory'; Environment = $context.Environment.Name; TenantId = $TenantId.ToString()
            ActualPrincipalId = $id.ToString(); ActualClientId = $(if ($client -ne [guid]::Empty) { $client.ToString() } else { '' })
            ActorKind = $(if ($claims['idtyp'] -eq 'app' -or $context.Account.Type -in 'ServicePrincipal', 'ManagedService', 'ManagedIdentity') { 'Application' } else { 'User' })
            TargetObjectId = $ApplicationObjectId.ToString()
        }
        Write-Information -MessageData $actor -Tags 'AuthContext' -InformationAction Continue
        return $actor
    }
    catch {
        if ($_.Exception.Message -eq 'ContextMismatch') { throw 'ContextMismatch: current directory tenant must match the explicit input.' }
        throw 'ActorUnverifiable: current Graph actor could not be verified; authenticate/consent separately.'
    }
    finally { $raw = $null; $claims = $null; $token = $null }
}

function Read-Graph([string] $Path, [bool] $AllowMissing = $true) {
    try { $response = Invoke-WebRequest -Uri ($graphBase + '/v1.0/' + $Path) -Method GET -Headers $headers -MaximumRedirection 0 -TimeoutSec 15 -SkipHttpErrorCheck @quiet }
    catch { throw 'GraphReadFailed: bounded exact-tenant Graph request failed.' }
    if ([int] $response.StatusCode -eq 404 -and $AllowMissing) { return $null }
    if ([int] $response.StatusCode -ne 200) { throw 'GraphReadFailed: existing application/SP read authority is required; no consent was requested.' }
    try {
        $object = $response.Content | ConvertFrom-Json -AsHashtable
        if ($object -isnot [Collections.IDictionary]) { throw 'Unreadable metadata.' }
        return $object
    }
    catch { throw 'GraphReadFailed: selected Graph metadata is incomplete.' }
}

function Assert-Application($Application) {
    if ($Application -isnot [Collections.IDictionary]) { throw 'UnexpectedObjectType: application metadata is required.' }
    if ($Application.ContainsKey('@odata.type') -and $Application['@odata.type'] -cne '#microsoft.graph.application') {
        throw 'UnexpectedObjectType: only an application registration may be selected.'
    }
    $objectId = [guid]::Empty; $clientId = [guid]::Empty
    if (-not [guid]::TryParse([string] $Application['id'], [ref] $objectId) -or $objectId -eq [guid]::Empty -or
        -not [guid]::TryParse([string] $Application['appId'], [ref] $clientId) -or $clientId -eq [guid]::Empty) { throw 'ApplicationOwnershipMismatch: application/object IDs are unreadable.' }
    $publisher = [string] $Application['publisherDomain']
    if ($Application['signInAudience'] -cne 'AzureADMyOrg' -or $publisher -match '(^|\.)microsoft\.com$|^(microsoft|microsoftservices)\.onmicrosoft\.com$' -or
        ($Application['verifiedPublisher'] -is [Collections.IDictionary] -and $Application['verifiedPublisher']['displayName'] -in 'Microsoft', 'Microsoft Corporation')) {
        throw 'ApplicationOwnershipMismatch: foreign/multitenant/first-party application cleanup is not supported.'
    }
    if ($objectId -ne $ApplicationObjectId) { throw 'ApplicationOwnershipMismatch: returned object is not the selected object ID.' }
    if ($clientId -ne $ExpectedApplicationClientId) { throw 'ClientIdMismatch: selected application and explicit expected client ID differ.' }
}

function Get-Snapshot($Application) {
    Assert-Application $Application
    return ([ordered]@{
        Id = $Application['id']; ClientId = $Application['appId']; DisplayName = $Application['displayName']; UniqueName = $Application['uniqueName']
        SignInAudience = $Application['signInAudience']; IdentifierUris = @($Application['identifierUris'] | Sort-Object)
        TokenVersion = $(if ($Application['api'] -is [Collections.IDictionary]) { $Application['api']['requestedAccessTokenVersion'] } else { $null })
    } | ConvertTo-Json -Depth 5 -Compress)
}

function Get-LinkedPrincipal {
    $principal = Read-Graph ("servicePrincipals(appId='$ExpectedApplicationClientId')" + '?$select=id,appId,appOwnerOrganizationId,servicePrincipalType')
    if ($null -eq $principal) { return '' }
    $id = [guid]::Empty
    if (-not [guid]::TryParse([string] $principal['id'], [ref] $id) -or $id -eq [guid]::Empty -or
        $principal['appId'] -ine $ExpectedApplicationClientId.ToString() -or $principal['appOwnerOrganizationId'] -ine $TenantId.ToString() -or
        $principal['servicePrincipalType'] -cne 'Application') { throw 'ApplicationOwnershipMismatch: linked SP is not the matching home-tenant application principal.' }
    return $id.ToString()
}

function Invoke-ApplicationTask {
    if ($taskCommand.ParameterSetName -eq 'ByName') {
        $prefix = ($DisplayName -split '[*?\[]', 2)[0].Replace("'", "''")
        $filter = if ([WildcardPattern]::ContainsWildcardCharacters($DisplayName)) { "startswith(displayName,'$prefix')" } else { "displayName eq '$($DisplayName.Replace("'", "''"))'" }
        $path = 'applications?$select=' + $selection + '&$filter=' + [uri]::EscapeDataString($filter)
        $candidates = [Collections.Generic.List[object]]::new(); $pages = 0
        do {
            $page = Read-Graph $path $false
            foreach ($item in @($page['value'])) { if ($item['displayName'] -like $DisplayName) { $candidates.Add($item) } }
            $path = ''
            if ($page['@odata.nextLink']) {
                $next = [uri] $page['@odata.nextLink']; $base = [uri] $graphBase
                if (-not $next.IsAbsoluteUri -or $next.Scheme -ne 'https' -or $next.Host -ine $base.Host -or $next.UserInfo -or
                    $next.Fragment -or $next.AbsolutePath -cne '/v1.0/applications') { throw 'TargetScope: Graph pagination escaped the selected collection.' }
                $path = $next.PathAndQuery.Substring('/v1.0/'.Length)
            }
            $pages++
            if ($pages -gt 100) { throw 'GraphReadFailed: narrow the display-name filter; pagination limit reached.' }
        } while ($path)
        if (-not $candidates.Count) { throw 'TargetNotFound: no application matched the explicit tenant/name filter.' }
        for ($i = 0; $i -lt $candidates.Count; $i++) { Write-Host "$($i + 1): object=$($candidates[$i]['id']) client=$($candidates[$i]['appId']) name=$($candidates[$i]['displayName'])" }
        $choice = 0
        if (-not [int]::TryParse((Read-Host 'Select application number'), [ref] $choice) -or $choice -lt 1 -or $choice -gt $candidates.Count) {
            throw 'TargetSelectionDeclined: no exact application was selected.'
        }
        $script:ApplicationObjectId = [guid] $candidates[$choice - 1]['id']
        if ($ExpectedApplicationClientId -eq [guid]::Empty) { $script:ExpectedApplicationClientId = [guid] $candidates[$choice - 1]['appId'] }
    }
    $selected = Read-Graph ("applications/$ApplicationObjectId" + '?$select=' + $selection)
    if ($null -eq $selected) { return 'NoChange' }
    if ($ExpectedApplicationClientId -eq [guid]::Empty) { $script:ExpectedApplicationClientId = [guid] $selected['appId'] }
    $snapshot = Get-Snapshot $selected
    $script:linkedId = Get-LinkedPrincipal
    $script:linkedState = if ($linkedId) { 'Active' } else { 'Absent' }
    Write-Information -MessageData ([pscustomobject]@{
        Task = 'Remove-EntraApplication'; Phase = 'Selected'; TenantId = $TenantId.ToString(); ApplicationObjectId = $ApplicationObjectId.ToString()
        ApplicationClientId = $ExpectedApplicationClientId.ToString(); LinkedServicePrincipalObjectId = $linkedId
        Consequence = 'Soft-delete registration; linked principal effects are provider-owned. No permanent purge. Restore/recreation affects Bicep alternate key and runtime client-ID settings.'
    }) -InformationAction Continue
    if ($NonInteractive -and -not $WhatIfPreference -and
        ((Test-AmbientConsentDefault) -or -not $taskParameters.ContainsKey('Confirm') -or [bool] $taskParameters['Confirm'])) {
        throw 'ConfirmationRequired: supply explicit automation consent with session control defaults disabled.'
    }
    $approved = $taskCommand.ShouldProcess("tenant=$TenantId object=$ApplicationObjectId client=$ExpectedApplicationClientId linkedSP=$linkedId", 'Soft-delete only the selected home-tenant application registration')
    if ($approved -and -not $NonInteractive -and $taskParameters.ContainsKey('Confirm') -and -not [bool] $taskParameters['Confirm']) {
        $approved = $taskCommand.ShouldContinue("Soft-delete application $ApplicationObjectId; linked principal effects are possible.", 'Confirm directory task')
    }
    if (-not $approved) { return $(if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' }) }
    $currentActor = Read-Actor
    if ($currentActor.ActualPrincipalId -ine $actor.ActualPrincipalId) { throw 'ActorMismatch: Graph actor changed after confirmation.' }
    $current = Read-Graph ("applications/$ApplicationObjectId" + '?$select=' + $selection)
    if ($null -eq $current) { return 'NoChange' }
    if ((Get-Snapshot $current) -cne $snapshot -or (Get-LinkedPrincipal) -cne $linkedId) { throw 'StateConflict: application or linked principal changed; confirm a new invocation.' }
    try { $removed = Invoke-WebRequest -Uri "$graphBase/v1.0/applications/$ApplicationObjectId" -Method DELETE -Headers $headers -MaximumRedirection 0 -TimeoutSec 30 -SkipHttpErrorCheck @quiet }
    catch { throw 'DirectoryDeleteFailed: exact application deletion failed; reconcile state before retrying.' }
    if ([int] $removed.StatusCode -in 401, 403) { throw 'DirectoryAuthorityRequired: existing Graph application-deletion permission and directory authority are required; no consent or role was granted.' }
    if ([int] $removed.StatusCode -ne 204) { throw 'DirectoryDeleteFailed: application deletion did not return 204.' }
    $deadline = (Get-Date).AddSeconds($VerificationTimeoutSeconds)
    while ($null -ne (Read-Graph ("applications/$ApplicationObjectId" + '?$select=id'))) {
        if ((Get-Date) -ge $deadline) { throw 'VerificationFailed: application soft-deletion was not observed within the bounded wait.' }
        Start-Sleep -Seconds 2
    }
    if ($linkedId) {
        $remaining = Read-Graph ("servicePrincipals/$linkedId" + '?$select=id,appId')
        $script:linkedState = if ($null -eq $remaining) { 'Absent' } else { 'Active' }
    }
    return 'Changed'
}

if ($TenantId -eq [guid]::Empty -or ($PSCmdlet.ParameterSetName -eq 'ById' -and $ApplicationObjectId -eq [guid]::Empty) -or
    ($PSCmdlet.ParameterSetName -eq 'ByName' -and ([string]::IsNullOrWhiteSpace($DisplayName) -or $DisplayName -match '[\x00-\x1f\x7f]'))) {
    throw 'InvalidInput: explicit tenant and exact application object ID or manual display-name filter are required.'
}
if ($NonInteractive -and ($PSCmdlet.ParameterSetName -ne 'ById' -or $ExpectedApplicationClientId -eq [guid]::Empty)) {
    throw 'TargetScope: automation requires exact object ID and explicit expected application client ID.'
}
try {
    $null = Get-Command Get-AzContext, Get-AzAccessToken, Invoke-WebRequest @quiet
    $context = Get-AzContext @quiet
}
catch { throw 'PrerequisiteMissing: load Az.Accounts and authenticate separately.' }
if (-not $context -or $context.Tenant.Id -ine $TenantId.ToString()) { throw 'ContextMismatch: current tenant differs from the explicit directory scope.' }
$graphs = @{ AzureCloud = 'https://graph.microsoft.com'; AzureUSGovernment = 'https://graph.microsoft.us'; AzureChinaCloud = 'https://microsoftgraph.chinacloudapi.cn' }
$graphBase = $graphs[[string] $context.Environment.Name]
if (-not $graphBase) { throw 'UnsupportedCloud: no verified Graph endpoint exists for this context.' }
$ConfirmPreference = if ($NonInteractive) { 'None' } else { 'Low' }
try {
    $actor = Read-Actor
    $status = Invoke-ApplicationTask
}
finally { $headers.Authorization = $null }
[pscustomobject]@{
    Task = 'Remove-EntraApplication'; Status = $status; Changed = $status -eq 'Changed'; TenantId = $TenantId.ToString()
    TargetResourceId = "$graphBase/v1.0/applications/$ApplicationObjectId"; Subject = $ExpectedApplicationClientId.ToString()
    Fields = [string[]] @('ApplicationRegistration'); LinkedServicePrincipalObjectId = $linkedId; LinkedServicePrincipalState = $linkedState
}
