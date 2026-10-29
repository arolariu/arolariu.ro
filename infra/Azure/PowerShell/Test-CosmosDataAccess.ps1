#Requires -Version 7.0
<#
.SYNOPSIS
Verifies one existing actor's Cosmos NoSQL metadata access without keys or business data.
.DESCRIPTION
Reads account, database, container and partition-range metadata. Does not grant, repair, impersonate,
or prove document CRUD or every SDK transport operation. Only the verified AzureCloud contract is supported.
.EXAMPLE
.\Test-CosmosDataAccess.ps1 -TenantId $tenant -SubscriptionId $subscription -ExpectedPrincipalId $backendPrincipalId -AccountResourceId $accountId -AccountEndpoint $endpoint -DatabaseName 'invoices' -ContainerName 'invoices' -WhatIf
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'Low')]
[OutputType([pscustomobject])]
param(
    [guid] $TenantId,
    [guid] $SubscriptionId,
    [guid] $ExpectedPrincipalId,
    [string] $AccountResourceId,
    [string] $AccountEndpoint,
    [string] $DatabaseName,
    [string] $ContainerName
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$quiet = @{ ErrorAction = 'Stop'; WarningAction = 'SilentlyContinue'; InformationAction = 'SilentlyContinue'; Verbose = $false; Debug = $false }
$checks = @{ Actor = 'Planned'; AccountMetadata = 'Planned'; DatabaseMetadata = 'Planned'; ContainerMetadata = 'Planned'; PartitionMetadata = 'Planned' }
$actualPrincipalId = ''
$clientId = ''
$actorKind = 'Unknown'

function Write-ProbeResult([string] $Status) {
    [pscustomobject]@{
        Task = 'Test-CosmosDataAccess'; Status = $Status; Changed = $false; TargetResourceId = $AccountResourceId
        Subject = "$DatabaseName/$ContainerName"; Fields = [string[]] @('AccountMetadata', 'DatabaseMetadata', 'ContainerMetadata', 'PartitionMetadata')
        ActualPrincipalId = $actualPrincipalId; ExpectedPrincipalId = $ExpectedPrincipalId.ToString(); Checks = $checks
    }
}

function Read-Metadata([string] $Path) {
    try {
        $response = Invoke-WebRequest -Uri ($baseUri + $Path) -Method GET -Headers $headers -MaximumRedirection 0 -TimeoutSec 15 -SkipHttpErrorCheck @quiet
    }
    catch { throw 'CosmosMetadataUnavailable: the bounded metadata request failed; no alternate endpoint or credential was tried.' }
    if ([int] $response.StatusCode -ne 200) {
        throw "CosmosMetadataRejected: metadata path=$Path status=$([int] $response.StatusCode); no absence or application access was inferred."
    }
    try {
        $metadata = $response.Content | ConvertFrom-Json -AsHashtable
        if ($metadata -isnot [Collections.IDictionary] -or -not $metadata.Count) { throw 'Missing metadata.' }
        return $metadata
    }
    catch { throw 'CosmosMetadataInvalid: successful response did not contain usable metadata.' }
}

if ($TenantId -eq [guid]::Empty -or $SubscriptionId -eq [guid]::Empty -or $ExpectedPrincipalId -eq [guid]::Empty) {
    throw 'InvalidInput: explicit tenant, subscription and expected principal are required.'
}
if ($AccountResourceId -notmatch '^/subscriptions/([^/]+)/resourceGroups/([^/]+)/providers/Microsoft\.DocumentDB/databaseAccounts/([a-z0-9-]+)$' -or
    $Matches[1] -ine $SubscriptionId.ToString() -or [WildcardPattern]::ContainsWildcardCharacters($AccountResourceId)) {
    throw 'TargetScope: supply one exact Cosmos account ID in the requested subscription.'
}
$accountName = $Matches[3]
foreach ($name in $DatabaseName, $ContainerName) {
    if ([string]::IsNullOrWhiteSpace($name) -or $name -in '.', '..' -or $name -match '[/\\?#\x00-\x1f\x7f]') {
        throw 'TargetScope: supply exact database and container IDs, not paths.'
    }
}
$uri = $null
if (-not [uri]::TryCreate($AccountEndpoint, [UriKind]::Absolute, [ref] $uri) -or $uri.Scheme -ne 'https' -or
    -not $uri.IsDefaultPort -or $uri.UserInfo -or $uri.Query -or $uri.Fragment -or $uri.AbsolutePath -ne '/' -or
    $uri.Host -ine "$accountName.documents.azure.com") {
    throw 'TargetEndpoint: endpoint must be the exact account HTTPS root without credentials, query, fragment or redirect.'
}
try {
    $null = Get-Command Get-AzContext, Get-AzAccessToken, Invoke-WebRequest @quiet
    $context = Get-AzContext @quiet
}
catch { throw 'ContextUnavailable: load Az.Accounts and authenticate separately before invoking this task.' }
if (-not $context -or $context.Tenant.Id -ine $TenantId.ToString() -or $context.Subscription.Id -ine $SubscriptionId.ToString()) {
    throw 'ContextMismatch: the existing tenant and subscription must match the explicit inputs.'
}
if ($context.Environment.Name -cne 'AzureCloud') {
    throw 'UnsupportedCloud: this probe has a verified public-cloud Cosmos audience/endpoint contract only.'
}
if (-not $PSCmdlet.ShouldProcess("$AccountResourceId database=$DatabaseName container=$ContainerName expectedPrincipal=$ExpectedPrincipalId", 'Read only Cosmos AAD metadata')) {
    Write-Information -MessageData ([pscustomobject]@{
        Task = 'Test-CosmosDataAccess'; Phase = 'Preview'; Environment = $context.Environment.Name
        TenantId = $TenantId.ToString(); SubscriptionId = $SubscriptionId.ToString()
        ActualPrincipalId = ''; ExpectedPrincipalId = $ExpectedPrincipalId.ToString(); TargetResourceId = $AccountResourceId
    }) -Tags 'AuthContext' -InformationAction Continue
    Write-ProbeResult 'WouldRun'
    return
}
try { $token = Get-AzAccessToken -ResourceUrl 'https://cosmos.azure.com/' -DefaultProfile $context @quiet }
catch { throw 'TokenUnavailable: no Cosmos AAD token was obtained from the existing context.' }
if ($token.Token -isnot [securestring]) { throw 'ActorUnverifiable: a secure credential is required.' }
try {
    $raw = [Net.NetworkCredential]::new('', $token.Token).Password
    $parts = $raw.Split('.')
    if ($parts.Length -ne 3) { throw 'Opaque token.' }
    $payload = $parts[1].Replace('-', '+').Replace('_', '/')
    $payload = $payload.PadRight($payload.Length + ((4 - $payload.Length % 4) % 4), '=')
    $claims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload)) | ConvertFrom-Json -AsHashtable
    $parsed = [guid]::Empty
    if ($claims['tid'] -ine $TenantId.ToString() -or -not [guid]::TryParse([string] $claims['oid'], [ref] $parsed) -or $parsed -eq [guid]::Empty) {
        throw 'Unverifiable principal.'
    }
    $actualPrincipalId = $parsed.ToString()
    $clientClaim = [string] $(if ($claims.ContainsKey('azp')) { $claims['azp'] } else { $claims['appid'] })
    if ([guid]::TryParse($clientClaim, [ref] $parsed) -and $parsed -ne [guid]::Empty) { $clientId = $parsed.ToString() }
    $actorKind = if ($claims['idtyp'] -eq 'app' -or $context.Account.Type -in 'ServicePrincipal', 'ManagedService', 'ManagedIdentity') { 'Application' }
        elseif ($context.Account.Type -eq 'User') { 'User' } else { 'Unknown' }
}
catch { $raw = $null; throw 'ActorUnverifiable: the trusted credential did not expose a matching tenant and verifiable principal.' }
finally { $claims = $null }
Write-Information -MessageData ([pscustomobject]@{
    Task = 'Test-CosmosDataAccess'; Phase = 'Probe'; Environment = $context.Environment.Name
    TenantId = $TenantId.ToString(); SubscriptionId = $SubscriptionId.ToString(); ActorKind = $actorKind
    ActualPrincipalId = $actualPrincipalId; ActualClientId = $clientId; ExpectedPrincipalId = $ExpectedPrincipalId.ToString()
    TargetResourceId = $AccountResourceId
}) -Tags 'AuthContext' -InformationAction Continue
if ($actualPrincipalId -ine $ExpectedPrincipalId.ToString()) { $raw = $null; throw 'ActorMismatch: the current principal is not the expected application/caller.' }
$checks.Actor = 'Verified'
$baseUri = $uri.AbsoluteUri
$headers = @{
    Authorization = [uri]::EscapeDataString("type=aad&ver=1.0&sig=$raw")
    'x-ms-date' = [datetime]::UtcNow.ToString('r', [Globalization.CultureInfo]::InvariantCulture)
    'x-ms-version' = '2018-12-31'; Accept = 'application/json'
}
$raw = $null
try {
    $account = Read-Metadata ''
    if ([string]::IsNullOrWhiteSpace([string] $account['id'])) { throw 'CosmosMetadataInvalid: account metadata has no identity.' }
    $checks.AccountMetadata = 'Verified'
    $databasePath = 'dbs/' + [uri]::EscapeDataString($DatabaseName)
    $database = Read-Metadata $databasePath
    if ($database['id'] -cne $DatabaseName) { throw 'CosmosMetadataInvalid: database identity differs from the requested target.' }
    $checks.DatabaseMetadata = 'Verified'
    $containerPath = $databasePath + '/colls/' + [uri]::EscapeDataString($ContainerName)
    $container = Read-Metadata $containerPath
    if ($container['id'] -cne $ContainerName -or $container['partitionKey'] -isnot [Collections.IDictionary]) {
        throw 'CosmosMetadataInvalid: container identity/partition metadata is incomplete.'
    }
    $checks.ContainerMetadata = 'Verified'
    $ranges = Read-Metadata ($containerPath + '/pkranges')
    if (-not $ranges.ContainsKey('PartitionKeyRanges') -or -not @($ranges['PartitionKeyRanges']).Count) {
        throw 'CosmosMetadataInvalid: partition-range metadata was not observed.'
    }
    $checks.PartitionMetadata = 'Verified'
}
finally { $headers.Authorization = $null; $token = $null }
Write-ProbeResult 'Verified'
