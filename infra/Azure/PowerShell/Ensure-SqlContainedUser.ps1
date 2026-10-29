#Requires -Version 7.0
<#
.SYNOPSIS
Ensures one explicit external SQL user name/SID/type binding in one database.
.DESCRIPTION
The caller supplies the 16-byte SID. No identity discovery, SID derivation, remapping, or role grants occur.
Matching metadata does not prove that the intended real identity can log in.
.EXAMPLE
.\Ensure-SqlContainedUser.ps1 -TenantId $tenant -SubscriptionId $subscription -TargetResourceId $databaseId -UserName 'backend' -ExpectedSid $sid -WhatIf
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High', DefaultParameterSetName = 'ById')]
[OutputType([pscustomobject])]
param(
    [guid] $TenantId,
    [guid] $SubscriptionId,
    [Parameter(ParameterSetName = 'ById')] [string] $TargetResourceId,
    [Parameter(ParameterSetName = 'ByName')] [string] $ResourceGroupName,
    [Parameter(ParameterSetName = 'ByName')] [string] $ServerName,
    [Parameter(ParameterSetName = 'ByName')] [string] $DatabaseName,
    [string] $UserName,
    [string] $ExpectedSid,
    [switch] $NonInteractive
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$quiet = @{ ErrorAction = 'Stop'; WarningAction = 'SilentlyContinue'; InformationAction = 'SilentlyContinue'; Verbose = $false; Debug = $false }

function Get-VerifiedContext {
    try { $context = Get-AzContext @quiet } catch { throw 'ContextUnavailable: authenticate before invoking this task.' }
    if (-not $context -or $context.Tenant.Id -ne $TenantId.ToString() -or $context.Subscription.Id -ne $SubscriptionId.ToString()) {
        throw 'ContextMismatch: the active tenant and subscription must match the explicit inputs.'
    }
    return $context
}

function Assert-DatabaseId([string] $Id) {
    if ($Id -notmatch '^/subscriptions/([^/]+)/resourceGroups/([^/]+)/providers/Microsoft\.Sql/servers/([a-zA-Z0-9-]+)/databases/([^/\x00-\x1f]+)$' -or
        $Matches[1] -ine $SubscriptionId.ToString() -or $Id -match '[*?]') {
        throw 'TargetScope: supply an exact SQL database ID in the requested subscription.'
    }
}

function Get-UserState {
    try {
        $rows = @(Invoke-Sqlcmd @connection -Query "SELECT name AS [Name], type AS [Type], CONVERT(varchar(172), sid, 1) AS [Sid] FROM sys.database_principals WHERE name = N'$literalName' OR sid = $ExpectedSid;" @quiet)
    }
    catch { throw 'SqlReadFailed: database-principal metadata could not be read; no absence was inferred.' }
    foreach ($row in $rows) {
        if ($row.Name -isnot [string] -or $row.Type -isnot [string] -or $row.Sid -isnot [string]) {
            throw 'PrincipalUnreadable: database-principal metadata is incomplete.'
        }
        if ($row.Sid -ieq $ExpectedSid -and $row.Name -cne $UserName) {
            throw 'PrincipalConflict: the expected SID is bound to another principal.'
        }
    }
    $named = @($rows | Where-Object { $_.Name -ieq $UserName })
    if (-not $named.Count) { return 'Missing' }
    if ($named.Count -ne 1 -or $named[0].Name -cne $UserName -or $named[0].Type -cne 'E' -or $named[0].Sid -ine $ExpectedSid) {
        throw 'PrincipalConflict: the existing name has a different SID or principal type; no remapping is allowed.'
    }
    return 'Present'
}

function Write-TaskResult([string] $Status) {
    [pscustomobject]@{
        Task = 'Ensure-SqlContainedUser'; Status = $Status; Changed = $Status -eq 'Changed'
        TargetResourceId = $target.ResourceId; Subject = $UserName; Fields = [string[]] @('UserName', 'Sid', 'Type')
    }
}

if ($TenantId -eq [guid]::Empty -or $SubscriptionId -eq [guid]::Empty -or [string]::IsNullOrWhiteSpace($UserName) -or
    $UserName.Length -gt 128 -or $UserName -match '[\x00-\x1f\x7f]' -or $ExpectedSid -notmatch '^0x[0-9a-fA-F]{32}$') {
    throw 'InvalidInput: explicit tenant, subscription, a SQL user name of at most 128 characters, and a 16-byte hex SID are required.'
}
try { $null = Get-Command Get-AzContext, Get-AzResource, Get-AzAccessToken, Invoke-Sqlcmd @quiet }
catch { throw 'PrerequisiteMissing: load Az.Accounts, Az.Resources, and SqlServer before invoking this task.' }
if ($PSCmdlet.ParameterSetName -eq 'ById') { Assert-DatabaseId $TargetResourceId }
elseif ([string]::IsNullOrWhiteSpace($ResourceGroupName) -or [string]::IsNullOrWhiteSpace($ServerName) -or
    [string]::IsNullOrWhiteSpace($DatabaseName) -or [WildcardPattern]::ContainsWildcardCharacters($ResourceGroupName) -or
    $ServerName.Contains('/') -or $DatabaseName.Contains('/')) {
    throw 'TargetScope: supply an exact resource group, server name, and database name or manual name patterns.'
}
if ($NonInteractive -and $PSCmdlet.ParameterSetName -eq 'ByName' -and
    ([WildcardPattern]::ContainsWildcardCharacters($ServerName) -or [WildcardPattern]::ContainsWildcardCharacters($DatabaseName))) {
    throw 'AmbiguousTarget: noninteractive execution requires an exact target, not a name pattern.'
}
$context = Get-VerifiedContext
try {
    $lookup = @{ ExpandProperties = $true; DefaultProfile = $context }
    if ($PSCmdlet.ParameterSetName -eq 'ById') { $lookup.ResourceId = $TargetResourceId }
    else { $lookup.ResourceGroupName = $ResourceGroupName; $lookup.ResourceType = 'Microsoft.Sql/servers/databases'; $lookup.Name = "$ServerName/$DatabaseName" }
    $candidates = @(Get-AzResource @lookup @quiet)
}
catch { throw 'TargetReadFailed: the scoped database lookup failed; no change was made.' }
if (-not $candidates.Count) { throw 'TargetNotFound: no database matched the explicit scope.' }
foreach ($candidate in $candidates) {
    Assert-DatabaseId $candidate.ResourceId
    if ($candidate.ResourceType -ine 'Microsoft.Sql/servers/databases') { throw 'TargetScope: the resolved resource is not a SQL database.' }
}
if ($candidates.Count -gt 1) {
    if ($NonInteractive) { throw 'AmbiguousTarget: the lookup did not resolve to exactly one database.' }
    for ($i = 0; $i -lt $candidates.Count; $i++) { Write-Host "$($i + 1): $($candidates[$i].ResourceId)" }
    $selection = 0
    if (-not [int]::TryParse((Read-Host 'Select database number'), [ref] $selection) -or $selection -lt 1 -or $selection -gt $candidates.Count) {
        throw 'TargetSelectionDeclined: no valid database was selected.'
    }
    $target = $candidates[$selection - 1]
}
else { $target = $candidates[0] }
$databaseMarker = $target.ResourceId.LastIndexOf('/databases/', [StringComparison]::OrdinalIgnoreCase)
$serverId = $target.ResourceId.Substring(0, $databaseMarker)
$database = $target.ResourceId.Substring($databaseMarker + '/databases/'.Length)
try { $servers = @(Get-AzResource -ResourceId $serverId -ExpandProperties -DefaultProfile $context @quiet) }
catch { throw 'TargetReadFailed: the selected database parent could not be read.' }
if ($servers.Count -ne 1 -or $servers[0].ResourceId -ine $serverId -or $servers[0].ResourceType -ine 'Microsoft.Sql/servers') {
    throw 'TargetScope: the database parent is not the expected SQL server.'
}
$fqdn = [string] $servers[0].Properties.fullyQualifiedDomainName
$suffix = [string] $context.Environment.SqlDatabaseDnsSuffix
if ([string]::IsNullOrWhiteSpace($suffix) -or $fqdn -notmatch '^[a-zA-Z0-9.-]+$' -or
    $fqdn -ine ($servers[0].Name + '.' + $suffix.TrimStart('.'))) {
    throw 'TargetEndpoint: the server FQDN does not match the current Azure environment.'
}
try { $token = Get-AzAccessToken -ResourceUrl ('https://' + $suffix.TrimStart('.') + '/') -DefaultProfile $context @quiet }
catch { throw 'TokenUnavailable: a SQL token could not be obtained from the verified context.' }
if ($token.Token -isnot [securestring]) { throw 'TokenUnavailable: a secure SQL access token is required.' }
$connection = @{
    ServerInstance = $fqdn; Database = $database; AccessToken = $token.Token
    Encrypt = 'Mandatory'; TrustServerCertificate = $false; HostNameInCertificate = $fqdn
    ConnectionTimeout = 15; QueryTimeout = 30; AbortOnError = $true
    DisableVariables = $true; DisableCommands = $true; OutputSqlErrors = $false
}
$literalName = $UserName.Replace("'", "''")
$identifier = '[' + $UserName.Replace(']', ']]') + ']'
if ((Get-UserState) -eq 'Present') { Write-TaskResult 'NoChange'; return }
if ($NonInteractive -and -not $WhatIfPreference -and
    (-not $PSBoundParameters.ContainsKey('Confirm') -or [bool] $PSBoundParameters['Confirm'])) {
    throw 'ConfirmationRequired: noninteractive writes require explicit -Confirm:$false.'
}
$ConfirmPreference = if ($NonInteractive) { 'None' } else { 'Low' }
$confirmationTarget = "tenant=$TenantId subscription=$SubscriptionId $($target.ResourceId) user=$UserName SID=$ExpectedSid type=E"
$approved = $PSCmdlet.ShouldProcess($confirmationTarget, 'Create external contained user')
if ($approved -and -not $NonInteractive -and $PSBoundParameters.ContainsKey('Confirm') -and -not [bool] $PSBoundParameters['Confirm']) {
    $approved = $PSCmdlet.ShouldContinue("Create external contained user: $confirmationTarget", 'Confirm task')
}
if (-not $approved) {
    Write-TaskResult $(if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' })
    return
}
$null = Get-VerifiedContext
if ((Get-UserState) -eq 'Present') { Write-TaskResult 'NoChange'; return }
try { $null = Invoke-Sqlcmd @connection -Query "CREATE USER $identifier WITH SID = $ExpectedSid, TYPE = E;" @quiet }
catch {
    if ((Get-UserState) -eq 'Present') { Write-TaskResult 'NoChange'; return }
    throw 'SqlWriteFailed: user creation failed; inspect the exact database principal before retrying.'
}
if ((Get-UserState) -ne 'Present') { throw 'VerificationFailed: the expected external user binding was not observed after creation.' }
Write-TaskResult 'Changed'
