#Requires -Version 7.0
<#
.SYNOPSIS
Inspects one site's effective Easy Auth v2 and home-tenant application/SP configuration.
.DESCRIPTION
Management-plane inspection is not runtime access proof. Unsafe exclusions fail rather than being
silently accepted or repaired. Uses only existing ARM/Graph authority and never requests consent.
.EXAMPLE
.\Test-EasyAuthConfiguration.ps1 -TenantId $tenant -SubscriptionId $subscription -SiteResourceId $siteId -ExpectedApplicationClientId $appId -ExpectedCallerPrincipalIds $callerObjectIds -WhatIf
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'Low')]
[OutputType([pscustomobject])]
param(
    [guid] $TenantId,
    [guid] $SubscriptionId,
    [string] $SiteResourceId,
    [guid] $ExpectedApplicationClientId,
    [guid[]] $ExpectedCallerPrincipalIds = @()
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$quiet = @{ ErrorAction = 'Stop'; WarningAction = 'SilentlyContinue'; InformationAction = 'SilentlyContinue'; Verbose = $false; Debug = $false }
$checks = @{
    Platform = 'Planned'; TenantIssuer = 'Planned'; Registration = 'Planned'; ServicePrincipal = 'Planned'
    CallerObjectIds = 'Planned'; ImplicitClientIdAudience = 'Planned'; ConfiguredApiUriAudience = 'NotVerified'
    Exclusions = 'Planned'; RuntimeAccess = 'NotVerified'
}
$actor = $null
$applicationObjectId = ''
$servicePrincipalObjectId = ''

function Write-ProbeResult([string] $Status) {
    [pscustomobject]@{
        Task = 'Test-EasyAuthConfiguration'; Status = $Status; Changed = $false; TargetResourceId = $SiteResourceId
        Subject = 'authsettingsV2'; Fields = [string[]] @('Platform', 'TenantIssuer', 'Registration', 'ServicePrincipal', 'CallerObjectIds', 'Exclusions')
        ActualPrincipalId = $(if ($null -ne $actor) { $actor.PrincipalId } else { '' })
        ApplicationObjectId = $applicationObjectId; ApplicationClientId = $ExpectedApplicationClientId.ToString()
        ServicePrincipalObjectId = $servicePrincipalObjectId; Checks = $checks
    }
}

function Get-ChildMap($Parent, [string] $Name) {
    if ($Parent -isnot [Collections.IDictionary] -or $Parent[$Name] -isnot [Collections.IDictionary]) {
        throw "EasyAuthMismatch: required configuration section=$Name is unreadable."
    }
    return $Parent[$Name]
}

function Get-Actor([securestring] $Token) {
    try {
        $raw = [Net.NetworkCredential]::new('', $Token).Password
        $parts = $raw.Split('.')
        if ($parts.Length -ne 3) { throw 'Opaque token.' }
        $payload = $parts[1].Replace('-', '+').Replace('_', '/')
        $payload = $payload.PadRight($payload.Length + ((4 - $payload.Length % 4) % 4), '=')
        $claims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload)) | ConvertFrom-Json -AsHashtable
        $principal = [guid]::Empty; $client = [guid]::Empty
        if ($claims['tid'] -ine $TenantId.ToString() -or -not [guid]::TryParse([string] $claims['oid'], [ref] $principal) -or $principal -eq [guid]::Empty) {
            throw 'Unverifiable principal.'
        }
        $claim = [string] $(if ($claims.ContainsKey('azp')) { $claims['azp'] } else { $claims['appid'] })
        $null = [guid]::TryParse($claim, [ref] $client)
        return [pscustomobject]@{
            PrincipalId = $principal.ToString(); ClientId = $(if ($client -ne [guid]::Empty) { $client.ToString() } else { '' })
            ActorKind = $(if ($claims['idtyp'] -eq 'app' -or $context.Account.Type -in 'ServicePrincipal', 'ManagedService', 'ManagedIdentity') { 'Application' } else { 'User' })
        }
    }
    catch { throw 'ActorUnverifiable: current management/Graph identity could not be verified.' }
    finally { $raw = $null; $claims = $null }
}

function Read-Graph([string] $Uri) {
    try {
        $response = Invoke-WebRequest -Uri $Uri -Method GET -Headers $graphHeaders -MaximumRedirection 0 -TimeoutSec 15 -SkipHttpErrorCheck @quiet
        if ([int] $response.StatusCode -ne 200) { throw 'Graph rejected request.' }
        $object = $response.Content | ConvertFrom-Json -AsHashtable
        if ($object -isnot [Collections.IDictionary]) { throw 'Graph metadata unreadable.' }
        return $object
    }
    catch { throw 'GraphReadFailed: existing Application.Read.All-equivalent authority and readable exact application/SP metadata are required; no consent was requested.' }
}

if ($TenantId -eq [guid]::Empty -or $SubscriptionId -eq [guid]::Empty -or $ExpectedApplicationClientId -eq [guid]::Empty -or
    -not $ExpectedCallerPrincipalIds.Count -or $ExpectedCallerPrincipalIds -contains [guid]::Empty) {
    throw 'InvalidInput: explicit scope, application client ID and expected caller object IDs are required.'
}
if ($SiteResourceId -notmatch '^/subscriptions/([^/]+)/resourceGroups/([^/]+)/providers/Microsoft\.Web/sites/([a-zA-Z0-9-]+)$' -or
    $Matches[1] -ine $SubscriptionId.ToString() -or [WildcardPattern]::ContainsWildcardCharacters($SiteResourceId)) {
    throw 'TargetScope: supply one exact App Service site ID in the requested subscription.'
}
try {
    $null = Get-Command Get-AzContext, Get-AzAccessToken, Invoke-AzRestMethod, Invoke-WebRequest @quiet
    $context = Get-AzContext @quiet
}
catch { throw 'ContextUnavailable: load Az.Accounts and authenticate separately.' }
if (-not $context -or $context.Tenant.Id -ine $TenantId.ToString() -or $context.Subscription.Id -ine $SubscriptionId.ToString()) {
    throw 'ContextMismatch: current tenant and subscription must match explicit inputs.'
}
$clouds = @{
    AzureCloud = @{ Login = 'https://login.microsoftonline.com/'; Graph = 'https://graph.microsoft.com/' }
    AzureUSGovernment = @{ Login = 'https://login.microsoftonline.us/'; Graph = 'https://graph.microsoft.us/' }
    AzureChinaCloud = @{ Login = 'https://login.chinacloudapi.cn/'; Graph = 'https://microsoftgraph.chinacloudapi.cn/' }
}
$cloud = $clouds[[string] $context.Environment.Name]
if ($null -eq $cloud) { throw 'UnsupportedCloud: no verified issuer/Graph mapping exists for the current cloud.' }
if (-not $PSCmdlet.ShouldProcess("$SiteResourceId expectedApplication=$ExpectedApplicationClientId", 'Read only effective Easy Auth and home-tenant registration metadata')) {
    Write-Information -MessageData ([pscustomobject]@{
        Task = 'Test-EasyAuthConfiguration'; Phase = 'Preview'; Environment = $context.Environment.Name
        TenantId = $TenantId.ToString(); SubscriptionId = $SubscriptionId.ToString(); TargetResourceId = $SiteResourceId
    }) -Tags 'AuthContext' -InformationAction Continue
    Write-ProbeResult 'WouldRun'
    return
}
try { $armToken = Get-AzAccessToken -DefaultProfile $context @quiet }
catch { throw 'TokenUnavailable: no management token was obtained from the existing context.' }
if ($armToken.Token -isnot [securestring]) { throw 'ActorUnverifiable: a secure credential is required.' }
$actor = Get-Actor $armToken.Token
Write-Information -MessageData ([pscustomobject]@{
    Task = 'Test-EasyAuthConfiguration'; Phase = 'ManagementInspection'; Environment = $context.Environment.Name
    TenantId = $TenantId.ToString(); SubscriptionId = $SubscriptionId.ToString(); ActorKind = $actor.ActorKind
    ActualPrincipalId = $actor.PrincipalId; ActualClientId = $actor.ClientId; TargetResourceId = $SiteResourceId
    ExpectedApplicationClientId = $ExpectedApplicationClientId.ToString()
}) -Tags 'AuthContext' -InformationAction Continue
try {
    $response = Invoke-AzRestMethod -Path "$SiteResourceId/config/authsettingsV2/list?api-version=2025-03-01" -Method GET -DefaultProfile $context -Confirm:$false @quiet
    if ([int] $response.StatusCode -ne 200) { throw 'Auth settings unreadable.' }
    $body = $response.Content | ConvertFrom-Json -AsHashtable
    $properties = Get-ChildMap $body 'properties'
}
catch { throw 'AuthReadFailed: exact effective authsettingsV2 metadata could not be read.' }
$platform = Get-ChildMap $properties 'platform'
$global = Get-ChildMap $properties 'globalValidation'
$providers = Get-ChildMap $properties 'identityProviders'
$aad = Get-ChildMap $providers 'azureActiveDirectory'
foreach ($provider in $providers.Keys) {
    if ($provider -cne 'azureActiveDirectory' -and $providers[$provider] -is [Collections.IDictionary] -and $providers[$provider]['enabled'] -eq $true) {
        throw 'EasyAuthMismatch: an additional authentication provider is enabled outside the expected AAD-only policy.'
    }
}
if ($platform['enabled'] -ne $true -or $aad['enabled'] -ne $true -or $global['requireAuthentication'] -ne $true -or
    $global['unauthenticatedClientAction'] -cne 'Return401') { throw 'EasyAuthMismatch: platform/AAD enforcement and Return401 are required.' }
$checks.Platform = 'Verified'
$registration = Get-ChildMap $aad 'registration'
if ($registration['clientId'] -ine $ExpectedApplicationClientId.ToString()) { throw 'EasyAuthMismatch: configured application client ID differs.' }
$issuer = $cloud.Login + $TenantId.ToString() + '/v2.0'
if ([string]::IsNullOrWhiteSpace([string] $registration['openIdIssuer']) -or $registration['openIdIssuer'].TrimEnd('/') -ine $issuer) {
    throw 'TenantIssuerMismatch: the configured issuer is not the expected tenant-specific v2 issuer.'
}
$checks.TenantIssuer = 'Verified'
foreach ($path in @($global['excludedPaths'])) {
    if ($path -cnotin '/api/health', '/api/ready') { throw 'UnsafeAuthExclusion: only the exact non-secret health/readiness paths may bypass authentication; admin exclusions remain a readiness blocker.' }
}
$checks.Exclusions = 'Verified'
$validation = Get-ChildMap $aad 'validation'
$policy = Get-ChildMap $validation 'defaultAuthorizationPolicy'
$principals = Get-ChildMap $policy 'allowedPrincipals'
if ($principals['groups']) { throw 'CallerAllowlistMismatch: additional group-based access is outside the expected object-ID-only allowlist.' }
$actualCallers = @($principals['identities'] | ForEach-Object {
    $id = [guid]::Empty
    if (-not [guid]::TryParse([string] $_, [ref] $id) -or $id -eq [guid]::Empty) { throw 'CallerAllowlistMismatch: caller IDs must be principal object IDs.' }
    $id.ToString()
} | Sort-Object -Unique)
$expectedCallers = @($ExpectedCallerPrincipalIds | ForEach-Object { $_.ToString() } | Sort-Object -Unique)
if (($actualCallers -join ',') -cne ($expectedCallers -join ',')) { throw 'CallerAllowlistMismatch: exact expected caller object IDs were not configured.' }
if (@($policy['allowedApplications']).Count -and $null -ne $policy['allowedApplications']) { throw 'EasyAuthMismatch: additional caller-client restrictions require separate explicit verification.' }
$checks.CallerObjectIds = 'Verified'
$apiUri = 'api://' + $ExpectedApplicationClientId.ToString()
foreach ($audience in @($validation['allowedAudiences'])) {
    if ($null -eq $audience) { continue }
    if ($audience -ine $apiUri -and $audience -ine $ExpectedApplicationClientId.ToString()) { throw 'EasyAuthMismatch: an unexpected extra audience is configured.' }
    if ($audience -ieq $apiUri) { $checks.ConfiguredApiUriAudience = 'Verified' }
}
try { $graphToken = Get-AzAccessToken -ResourceUrl $cloud.Graph -DefaultProfile $context @quiet }
catch { throw 'TokenUnavailable: no Graph token was obtained; no consent or actor switch was attempted.' }
if ($graphToken.Token -isnot [securestring]) { throw 'ActorUnverifiable: a secure Graph credential is required.' }
$graphActor = Get-Actor $graphToken.Token
if ($graphActor.PrincipalId -ine $actor.PrincipalId) { throw 'ActorMismatch: ARM and Graph actor metadata differ.' }
$graphHeaders = @{ Authorization = 'Bearer ' + [Net.NetworkCredential]::new('', $graphToken.Token).Password; Accept = 'application/json' }
try {
    $graphBase = $cloud.Graph.TrimEnd('/')
    $application = Read-Graph ("$graphBase/v1.0/applications(appId='$ExpectedApplicationClientId')" + '?$select=id,appId,signInAudience,identifierUris,api')
    $id = [guid]::Empty
    if (-not [guid]::TryParse([string] $application['id'], [ref] $id) -or $id -eq [guid]::Empty -or
        $application['appId'] -ine $ExpectedApplicationClientId.ToString() -or $application['signInAudience'] -cne 'AzureADMyOrg' -or
        $application['api'] -isnot [Collections.IDictionary] -or $application['api']['requestedAccessTokenVersion'] -ne 2 -or
        $application['identifierUris'] -inotcontains $apiUri) { throw 'ApplicationRegistrationMismatch: expected tenant-only v2 API registration was not observed.' }
    $applicationObjectId = $id.ToString()
    $checks.Registration = 'Verified'; $checks.ImplicitClientIdAudience = 'Verified'
    $principal = Read-Graph ("$graphBase/v1.0/servicePrincipals(appId='$ExpectedApplicationClientId')" + '?$select=id,appId,appOwnerOrganizationId,servicePrincipalType,accountEnabled,appRoleAssignmentRequired')
    if (-not [guid]::TryParse([string] $principal['id'], [ref] $id) -or $id -eq [guid]::Empty -or
        $principal['appId'] -ine $ExpectedApplicationClientId.ToString() -or $principal['appOwnerOrganizationId'] -ine $TenantId.ToString() -or
        $principal['servicePrincipalType'] -cne 'Application' -or $principal['accountEnabled'] -ne $true -or $principal['appRoleAssignmentRequired'] -ne $false) {
        throw 'ServicePrincipalMismatch: an enabled matching home-tenant application service principal is required.'
    }
    $servicePrincipalObjectId = $id.ToString()
    $checks.ServicePrincipal = 'Verified'
}
finally { $graphHeaders.Authorization = $null; $armToken = $null; $graphToken = $null }
Write-ProbeResult 'Verified'
