#Requires -Version 7.0
<#
.SYNOPSIS
Verifies an existing application's SQL identity, client-ID SID and effective permissions.
.DESCRIPTION
Uses encrypted, certificate-validated SQL and read-only identity/permission/schema queries.
Never grants administrator, firewall or database roles, switches actors, or initializes schema.
Without RequiredTables, schema presence remains explicitly unverified.
.EXAMPLE
.\Test-SqlDataAccess.ps1 -TenantId $tenant -SubscriptionId $subscription -ExpectedPrincipalId $principalId -ExpectedClientId $clientId -DatabaseResourceId $databaseId -ServerFqdn $fqdn -DatabaseName 'invoices' -UserName 'backend' -WhatIf
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'Low')]
[OutputType([pscustomobject])]
param(
    [guid] $TenantId,
    [guid] $SubscriptionId,
    [guid] $ExpectedPrincipalId,
    [guid] $ExpectedClientId,
    [string] $DatabaseResourceId,
    [string] $ServerFqdn,
    [string] $DatabaseName,
    [string] $UserName,
    [string[]] $RequiredTables = @()
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$quiet = @{ ErrorAction = 'Stop'; WarningAction = 'SilentlyContinue'; InformationAction = 'SilentlyContinue'; Verbose = $false; Debug = $false }
$checks = @{ Actor = 'Planned'; Login = 'Planned'; PrincipalSid = 'Planned'; ReadWritePermissions = 'Planned'; Schema = 'NotVerified' }
$actualPrincipalId = ''
$actualClientId = ''

function Write-ProbeResult([string] $Status) {
    [pscustomobject]@{
        Task = 'Test-SqlDataAccess'; Status = $Status; Changed = $false; TargetResourceId = $DatabaseResourceId; Subject = $UserName
        Fields = [string[]] @('Login', 'PrincipalSid', 'ReadWritePermissions', 'Schema')
        ActualPrincipalId = $actualPrincipalId; ExpectedPrincipalId = $ExpectedPrincipalId.ToString()
        ActualClientId = $actualClientId; ExpectedClientId = $ExpectedClientId.ToString(); Checks = $checks
    }
}

function Invoke-ReadOnlySql([string] $Query) {
    try { return @(Invoke-Sqlcmd @connection -Query $Query @quiet) }
    catch {
        $exception = $_.Exception
        $number = 0
        while ($null -ne $exception) {
            if ($exception.PSObject.Properties['Number']) { $number = [int] $exception.Number; break }
            foreach ($property in 'Errors', 'SqlErrors') {
                if ($exception.PSObject.Properties[$property]) {
                    foreach ($sqlError in $exception.$property) {
                        if ($sqlError.PSObject.Properties['Number']) { $number = [int] $sqlError.Number; break }
                    }
                }
            }
            if ($number) { break }
            $exception = $exception.InnerException
        }
        if ($number -in 18456, 18452) { throw 'SqlLoginFailed: the expected actor could not log in; no permission repair was attempted.' }
        if ($number -eq 229) { throw 'SqlPermissionDenied: required read-only proof was rejected.' }
        throw 'SqlProbeFailed: SQL connection or metadata proof failed; provider details were suppressed.'
    }
}

if ($TenantId -eq [guid]::Empty -or $SubscriptionId -eq [guid]::Empty -or $ExpectedPrincipalId -eq [guid]::Empty -or
    $ExpectedClientId -eq [guid]::Empty -or [string]::IsNullOrWhiteSpace($UserName) -or $UserName.Length -gt 128 -or
    $UserName -match '[\x00-\x1f\x7f]') { throw 'InvalidInput: explicit scope, backend principal/client IDs and SQL user name are required.' }
if ($DatabaseResourceId -notmatch '^/subscriptions/([^/]+)/resourceGroups/([^/]+)/providers/Microsoft\.Sql/servers/([a-zA-Z0-9-]+)/databases/([^/\x00-\x1f]+)$' -or
    $Matches[1] -ine $SubscriptionId.ToString() -or $Matches[4] -cne $DatabaseName -or $DatabaseResourceId -match '[*?]') {
    throw 'TargetScope: exact database ID/name and subscription must match.'
}
$serverName = $Matches[3]
foreach ($table in $RequiredTables) {
    if ($table -notmatch '^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*$') {
        throw 'TargetScope: required tables must be exact two-part schema.table names.'
    }
}
try {
    $null = Get-Command Get-AzContext, Get-AzAccessToken, Invoke-Sqlcmd @quiet
    $context = Get-AzContext @quiet
}
catch { throw 'PrerequisiteMissing: load Az.Accounts/SqlServer and authenticate separately.' }
if (-not $context -or $context.Tenant.Id -ine $TenantId.ToString() -or $context.Subscription.Id -ine $SubscriptionId.ToString()) {
    throw 'ContextMismatch: existing tenant and subscription must match the explicit inputs.'
}
$suffixes = @{ AzureCloud = 'database.windows.net'; AzureUSGovernment = 'database.usgovcloudapi.net'; AzureChinaCloud = 'database.chinacloudapi.cn' }
$suffix = $suffixes[[string] $context.Environment.Name]
if (-not $suffix -or $context.Environment.SqlDatabaseDnsSuffix.TrimStart('.') -ine $suffix -or
    $ServerFqdn -notmatch '^[a-zA-Z0-9.-]+$' -or $ServerFqdn -ine "$serverName.$suffix") {
    throw 'TargetEndpoint: FQDN must match the selected SQL server and supported current Azure cloud.'
}
if ($RequiredTables.Count) { $checks.Schema = 'Planned' }
if (-not $PSCmdlet.ShouldProcess("$DatabaseResourceId user=$UserName expectedPrincipal=$ExpectedPrincipalId expectedClient=$ExpectedClientId", 'Read only SQL identity, effective permissions and optional schema')) {
    Write-Information -MessageData ([pscustomobject]@{
        Task = 'Test-SqlDataAccess'; Phase = 'Preview'; Environment = $context.Environment.Name
        TenantId = $TenantId.ToString(); SubscriptionId = $SubscriptionId.ToString(); ActualPrincipalId = ''
        ExpectedPrincipalId = $ExpectedPrincipalId.ToString(); TargetResourceId = $DatabaseResourceId
    }) -Tags 'AuthContext' -InformationAction Continue
    Write-ProbeResult 'WouldRun'
    return
}
try { $token = Get-AzAccessToken -ResourceUrl "https://$suffix/" -DefaultProfile $context @quiet }
catch { throw 'TokenUnavailable: no SQL token was obtained from the current actor.' }
if ($token.Token -isnot [securestring]) { throw 'ActorUnverifiable: a secure SQL token is required.' }
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
    if (-not [guid]::TryParse($clientClaim, [ref] $parsed) -or $parsed -eq [guid]::Empty) { throw 'Unverifiable client.' }
    $actualClientId = $parsed.ToString()
    $actorKind = if ($claims['idtyp'] -eq 'app' -or $context.Account.Type -in 'ServicePrincipal', 'ManagedService', 'ManagedIdentity') { 'Application' } else { 'User' }
}
catch { throw 'ActorUnverifiable: the trusted credential did not expose a matching tenant and verifiable application.' }
finally { $raw = $null; $claims = $null }
Write-Information -MessageData ([pscustomobject]@{
    Task = 'Test-SqlDataAccess'; Phase = 'Probe'; Environment = $context.Environment.Name
    TenantId = $TenantId.ToString(); SubscriptionId = $SubscriptionId.ToString(); ActorKind = $actorKind
    ActualPrincipalId = $actualPrincipalId; ActualClientId = $actualClientId; ExpectedPrincipalId = $ExpectedPrincipalId.ToString()
    ExpectedClientId = $ExpectedClientId.ToString(); TargetResourceId = $DatabaseResourceId
}) -Tags 'AuthContext' -InformationAction Continue
if ($actualPrincipalId -ine $ExpectedPrincipalId.ToString() -or $actualClientId -ine $ExpectedClientId.ToString() -or $actorKind -ne 'Application') {
    throw 'ActorMismatch: the current principal/client is not the expected application.'
}
$checks.Actor = 'Verified'
$connection = @{
    ServerInstance = $ServerFqdn; Database = $DatabaseName; AccessToken = $token.Token
    Encrypt = 'Mandatory'; TrustServerCertificate = $false; HostNameInCertificate = $ServerFqdn
    ConnectionTimeout = 15; QueryTimeout = 30; AbortOnError = $true
    DisableVariables = $true; DisableCommands = $true; OutputSqlErrors = $false
}
try {
    $identity = @(Invoke-ReadOnlySql "SELECT DB_NAME() AS [ProbeDatabase], USER_NAME() AS [ProbeUserName], type AS [ProbeUserType], CONVERT(varchar(172), sid, 1) AS [ProbeSid] FROM sys.database_principals WHERE principal_id = USER_ID();")
    if ($identity.Count -ne 1 -or $identity[0].ProbeDatabase -cne $DatabaseName -or $identity[0].ProbeUserName -cne $UserName -or $identity[0].ProbeUserType -cne 'E') {
        throw 'PrincipalMismatch: the authenticated database principal is not the expected external user.'
    }
    $checks.Login = 'Verified'
    $expectedSid = '0x' + [BitConverter]::ToString($ExpectedClientId.ToByteArray()).Replace('-', '')
    if ($identity[0].ProbeSid -ine $expectedSid) { throw 'SidMismatch: the contained SID does not match the client-ID GUID byte image.' }
    $checks.PrincipalSid = 'Verified'
    $permissions = @(Invoke-ReadOnlySql "SELECT HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'CONNECT') AS [CanConnect], HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'SELECT') AS [CanSelect], HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'INSERT') AS [CanInsert], HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'UPDATE') AS [CanUpdate], HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'DELETE') AS [CanDelete];")
    if ($permissions.Count -ne 1) { throw 'SqlPermissionDenied: effective database permissions were not observed.' }
    foreach ($permission in 'CanConnect', 'CanSelect', 'CanInsert', 'CanUpdate', 'CanDelete') {
        if ($permissions[0].$permission -ne 1) { throw "SqlPermissionDenied: required effective permission=$permission was not verified." }
    }
    $checks.ReadWritePermissions = 'Verified'
    foreach ($table in $RequiredTables) {
        $literal = $table.Replace("'", "''")
        $schema = @(Invoke-ReadOnlySql "SELECT CAST(CASE WHEN OBJECT_ID(N'$literal', N'U') IS NOT NULL THEN 1 ELSE 0 END AS bit) AS [TableExists], HAS_PERMS_BY_NAME(N'$literal', 'OBJECT', 'SELECT') AS [CanSelect], HAS_PERMS_BY_NAME(N'$literal', 'OBJECT', 'INSERT') AS [CanInsert], HAS_PERMS_BY_NAME(N'$literal', 'OBJECT', 'UPDATE') AS [CanUpdate], HAS_PERMS_BY_NAME(N'$literal', 'OBJECT', 'DELETE') AS [CanDelete];")
        if ($schema.Count -ne 1 -or $schema[0].TableExists -ne $true) {
            throw "SchemaMissing: login succeeded but required table=$table is absent or not visible; no schema was created."
        }
        foreach ($permission in 'CanSelect', 'CanInsert', 'CanUpdate', 'CanDelete') {
            if ($schema[0].$permission -ne 1) { throw "SqlPermissionDenied: table=$table permission=$permission was not verified." }
        }
    }
    if ($RequiredTables.Count) { $checks.Schema = 'Verified' }
}
finally { $connection.AccessToken = $null; $token = $null }
Write-ProbeResult 'Verified'
