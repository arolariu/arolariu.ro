#Requires -Version 7.0
<#
.SYNOPSIS
Deletes one eligible home-tenant application service principal while preserving its registration.
.DESCRIPTION
Rejects managed identities, foreign/first-party/gallery principals and unknown ownership.
No application deletion, permanent purge, consent grant or automatic principal recreation occurs.
.EXAMPLE
.\Remove-EntraServicePrincipal.ps1 -TenantId $tenant -DisplayName '*experiments*' -WhatIf
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High', DefaultParameterSetName = 'ById')]
[OutputType([pscustomobject])]
param(
    [guid] $TenantId,
    [Parameter(ParameterSetName = 'ById')] [guid] $ServicePrincipalObjectId = [guid]::Empty,
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
$applicationId = ''
$applicationState = 'NotObserved'
$selection = 'id,appId,displayName,appOwnerOrganizationId,servicePrincipalType,signInAudience,applicationTemplateId,publisherName'

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
            Task = 'Remove-EntraServicePrincipal'; Phase = 'Directory'; Environment = $cloudName; TenantId = $TenantId.ToString()
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
    if ([int] $response.StatusCode -ne 200) { throw 'GraphReadFailed: existing application/SP metadata authority is required.' }
    try {
        $object = $response.Content | ConvertFrom-Json -AsHashtable
        if ($object -isnot [Collections.IDictionary]) { throw 'Unreadable metadata.' }
        return $object
    }
    catch { throw 'GraphReadFailed: selected Graph metadata is incomplete.' }
}

function Assert-Principal($Principal) {
    if ($Principal -isnot [Collections.IDictionary] -or $Principal['servicePrincipalType'] -cne 'Application' -or
        ($Principal.ContainsKey('@odata.type') -and $Principal['@odata.type'] -cne '#microsoft.graph.servicePrincipal')) {
        throw 'UnsupportedPrincipalType: only an application service principal is eligible; backing managed identities and other directory types are never deleted.'
    }
    $objectId = [guid]::Empty; $clientId = [guid]::Empty
    if (-not [guid]::TryParse([string] $Principal['id'], [ref] $objectId) -or $objectId -ne $ServicePrincipalObjectId -or
        -not [guid]::TryParse([string] $Principal['appId'], [ref] $clientId) -or $clientId -eq [guid]::Empty) { throw 'PrincipalOwnershipMismatch: object/client metadata differs.' }
    if ($clientId -ne $ExpectedApplicationClientId) { throw 'ClientIdMismatch: selected principal and expected client ID differ.' }
    if ($Principal['appOwnerOrganizationId'] -ine $TenantId.ToString() -or $Principal['signInAudience'] -cne 'AzureADMyOrg' -or
        $Principal['applicationTemplateId'] -or $Principal['publisherName'] -in 'Microsoft', 'Microsoft Corporation', 'Microsoft Services') {
        throw 'PrincipalOwnershipMismatch: authoritative local tenant-only, non-gallery/non-first-party ownership is required.'
    }
}

function Get-Snapshot($Principal) {
    Assert-Principal $Principal
    return ([ordered]@{
        Id = $Principal['id']; ClientId = $Principal['appId']; DisplayName = $Principal['displayName']; OwnerTenant = $Principal['appOwnerOrganizationId']
        PrincipalType = $Principal['servicePrincipalType']; SignInAudience = $Principal['signInAudience']; Template = $Principal['applicationTemplateId']
    } | ConvertTo-Json -Compress)
}

function Get-ApplicationState {
    $application = Read-Graph ("applications(appId='$ExpectedApplicationClientId')" + '?$select=id,appId,signInAudience,publisherDomain')
    if ($null -eq $application) {
        if (-not $taskParameters.ContainsKey('ExpectedApplicationClientId')) { throw 'PrincipalOwnershipMismatch: orphan cleanup requires a separately supplied expected client ID.' }
        return ''
    }
    $id = [guid]::Empty
    if (-not [guid]::TryParse([string] $application['id'], [ref] $id) -or $id -eq [guid]::Empty -or
        $application['appId'] -ine $ExpectedApplicationClientId.ToString() -or $application['signInAudience'] -cne 'AzureADMyOrg' -or
        ([string] $application['publisherDomain']) -match '(^|\.)microsoft\.com$|^(microsoft|microsoftservices)\.onmicrosoft\.com$') {
        throw 'PrincipalOwnershipMismatch: associated application is not the expected local tenant-only registration.'
    }
    return $id.ToString()
}

function Invoke-PrincipalTask {
    if ($taskCommand.ParameterSetName -eq 'ByName') {
        $prefix = ($DisplayName -split '[*?\[]', 2)[0].Replace("'", "''")
        $filter = if ([WildcardPattern]::ContainsWildcardCharacters($DisplayName)) { "startswith(displayName,'$prefix')" } else { "displayName eq '$($DisplayName.Replace("'", "''"))'" }
        $path = 'servicePrincipals?$select=' + $selection + '&$filter=' + [uri]::EscapeDataString($filter)
        $candidates = [Collections.Generic.List[object]]::new(); $pages = 0
        do {
            $page = Read-Graph $path $false
            foreach ($item in @($page['value'])) { if ($item['displayName'] -like $DisplayName) { $candidates.Add($item) } }
            $path = ''
            if ($page['@odata.nextLink']) {
                $next = [uri] $page['@odata.nextLink']; $base = [uri] $graphBase
                if (-not $next.IsAbsoluteUri -or $next.Scheme -ne 'https' -or $next.Host -ine $base.Host -or $next.UserInfo -or
                    $next.Fragment -or $next.AbsolutePath -cne '/v1.0/servicePrincipals') { throw 'TargetScope: Graph pagination escaped the selected collection.' }
                $path = $next.PathAndQuery.Substring('/v1.0/'.Length)
            }
            $pages++
            if ($pages -gt 100) { throw 'GraphReadFailed: narrow the display-name filter; pagination limit reached.' }
        } while ($path)
        if (-not $candidates.Count) { throw 'TargetNotFound: no principal matched the explicit tenant/name filter.' }
        for ($i = 0; $i -lt $candidates.Count; $i++) {
            Write-Host "$($i + 1): object=$($candidates[$i]['id']) client=$($candidates[$i]['appId']) owner=$($candidates[$i]['appOwnerOrganizationId']) type=$($candidates[$i]['servicePrincipalType']) name=$($candidates[$i]['displayName'])"
        }
        $choice = 0
        if (-not [int]::TryParse((Read-Host 'Select application principal number'), [ref] $choice) -or $choice -lt 1 -or $choice -gt $candidates.Count) {
            throw 'TargetSelectionDeclined: no exact principal was selected.'
        }
        $script:ServicePrincipalObjectId = [guid] $candidates[$choice - 1]['id']
        if ($ExpectedApplicationClientId -eq [guid]::Empty) { $script:ExpectedApplicationClientId = [guid] $candidates[$choice - 1]['appId'] }
    }
    $selected = Read-Graph ("servicePrincipals/$ServicePrincipalObjectId" + '?$select=' + $selection)
    if ($null -eq $selected) { return 'NoChange' }
    if ($ExpectedApplicationClientId -eq [guid]::Empty) { $script:ExpectedApplicationClientId = [guid] $selected['appId'] }
    $snapshot = Get-Snapshot $selected
    $script:applicationId = Get-ApplicationState
    $script:applicationState = if ($applicationId) { 'Preserved' } else { 'Absent' }
    Write-Information -MessageData ([pscustomobject]@{
        Task = 'Remove-EntraServicePrincipal'; Phase = 'Selected'; TenantId = $TenantId.ToString()
        ServicePrincipalObjectId = $ServicePrincipalObjectId.ToString(); ApplicationClientId = $ExpectedApplicationClientId.ToString()
        ApplicationObjectId = $applicationId; Consequence = 'Delete only this enterprise-app principal. Registration is preserved; Bicep may recreate the principal with a new object ID.'
    }) -InformationAction Continue
    if ($NonInteractive -and -not $WhatIfPreference -and
        ((Test-AmbientConsentDefault) -or -not $taskParameters.ContainsKey('Confirm') -or [bool] $taskParameters['Confirm'])) {
        throw 'ConfirmationRequired: supply explicit automation consent with session control defaults disabled.'
    }
    $approved = $taskCommand.ShouldProcess("tenant=$TenantId SP=$ServicePrincipalObjectId client=$ExpectedApplicationClientId application=$applicationId", 'Delete only the selected application service principal; preserve registration')
    if ($approved -and -not $NonInteractive -and $taskParameters.ContainsKey('Confirm') -and -not [bool] $taskParameters['Confirm']) {
        $approved = $taskCommand.ShouldContinue("Delete principal $ServicePrincipalObjectId; do not delete the registration.", 'Confirm directory task')
    }
    if (-not $approved) { return $(if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' }) }
    $currentActor = Read-Actor
    if ($currentActor.ActualPrincipalId -ine $actor.ActualPrincipalId) { throw 'ActorMismatch: Graph actor changed after confirmation.' }
    $current = Read-Graph ("servicePrincipals/$ServicePrincipalObjectId" + '?$select=' + $selection)
    if ($null -eq $current) { return 'NoChange' }
    if ((Get-Snapshot $current) -cne $snapshot -or (Get-ApplicationState) -cne $applicationId) { throw 'StateConflict: principal/application relationship changed; confirm a new invocation.' }
    try { $removed = Invoke-WebRequest -Uri "$graphBase/v1.0/servicePrincipals/$ServicePrincipalObjectId" -Method DELETE -Headers $headers -ContentType 'application/json' -MaximumRedirection 0 -TimeoutSec 30 -SkipHttpErrorCheck @quiet }
    catch { throw 'DirectoryDeleteFailed: exact principal deletion failed; reconcile state before retrying.' }
    if ([int] $removed.StatusCode -in 401, 403) { throw 'DirectoryAuthorityRequired: existing Graph principal-deletion permission and directory authority are required; no grant/consent was performed.' }
    if ([int] $removed.StatusCode -ne 204) { throw 'DirectoryDeleteFailed: principal deletion did not return 204.' }
    $deadline = (Get-Date).AddSeconds($VerificationTimeoutSeconds)
    while ($null -ne (Read-Graph ("servicePrincipals/$ServicePrincipalObjectId" + '?$select=id'))) {
        if ((Get-Date) -ge $deadline) { throw 'VerificationFailed: principal deletion did not become observable within the bounded wait.' }
        Start-Sleep -Seconds 2
    }
    if ((Get-ApplicationState) -cne $applicationId) { throw 'StateConflict: registration changed concurrently; this task did not modify it.' }
    return 'Changed'
}

if ($TenantId -eq [guid]::Empty -or ($PSCmdlet.ParameterSetName -eq 'ById' -and $ServicePrincipalObjectId -eq [guid]::Empty) -or
    ($PSCmdlet.ParameterSetName -eq 'ByName' -and ([string]::IsNullOrWhiteSpace($DisplayName) -or $DisplayName -match '[\x00-\x1f\x7f]'))) {
    throw 'InvalidInput: explicit tenant and exact principal object ID or manual display-name filter are required.'
}
if ($NonInteractive -and ($PSCmdlet.ParameterSetName -ne 'ById' -or $ExpectedApplicationClientId -eq [guid]::Empty)) {
    throw 'TargetScope: automation requires exact principal object ID and explicit expected client ID.'
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
try { $actor = Read-Actor; $status = Invoke-PrincipalTask }
finally { $headers.Authorization = $null }
[pscustomobject]@{
    Task = 'Remove-EntraServicePrincipal'; Status = $status; Changed = $status -eq 'Changed'; TenantId = $TenantId.ToString()
    TargetResourceId = "$graphBase/v1.0/servicePrincipals/$ServicePrincipalObjectId"; Subject = $ExpectedApplicationClientId.ToString()
    Fields = [string[]] @('ServicePrincipal'); ApplicationRegistrationObjectId = $applicationId; ApplicationRegistrationState = $applicationState
}
