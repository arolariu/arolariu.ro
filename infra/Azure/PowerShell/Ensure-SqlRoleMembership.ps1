#Requires -Version 7.0
<#
.SYNOPSIS
Ensures one existing database user belongs to one allowlisted SQL role.
.DESCRIPTION
Preserves all other memberships. Never creates principals, nests roles, revokes grants, or substitutes broader permissions.
.EXAMPLE
.\Ensure-SqlRoleMembership.ps1 -TenantId $tenant -SubscriptionId $subscription -TargetResourceId $databaseId -UserName 'backend' -RoleName 'db_datareader' -WhatIf
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
    [ValidateSet('db_datareader', 'db_datawriter', 'db_ddladmin')] [string] $RoleName,
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

function Test-AmbientConsentDefault {
    if ($null -eq $PSDefaultParameterValues -or
        ($PSDefaultParameterValues['Disabled'] -is [bool] -and $PSDefaultParameterValues['Disabled'])) { return $false }
    # Session defaults also enter PSBoundParameters; their presence cannot prove invocation-level consent.
    foreach ($key in $PSDefaultParameterValues.Keys) {
        $separator = $key.LastIndexOf(':')
        if ($separator -lt 0) { continue }
        $pattern = [WildcardPattern]::new($key.Substring($separator + 1).Trim(), [Management.Automation.WildcardOptions]::IgnoreCase)
        if ($pattern.IsMatch('Confirm') -or $pattern.IsMatch('cf') -or $pattern.IsMatch('NonInteractive')) { return $true }
    }
    return $false
}

function Assert-DatabaseId([string] $Id) {
    if ($Id -notmatch '^/subscriptions/([^/]+)/resourceGroups/([^/]+)/providers/Microsoft\.Sql/servers/([a-zA-Z0-9-]+)/databases/([^/\x00-\x1f]+)$' -or
        $Matches[1] -ine $SubscriptionId.ToString() -or $Id -match '[*?]') {
        throw 'TargetScope: supply an exact SQL database ID in the requested subscription.'
    }
}

function Get-MembershipState {
    $query = @"
SELECT
    (SELECT name FROM sys.database_principals WHERE name = N'$literalName') AS [UserName],
    (SELECT type FROM sys.database_principals WHERE name = N'$literalName') AS [UserType],
    (SELECT name FROM sys.database_principals WHERE name = N'$RoleName' AND type = 'R') AS [RoleName],
    CAST(CASE WHEN EXISTS (
        SELECT 1 FROM sys.database_role_members
        WHERE role_principal_id = DATABASE_PRINCIPAL_ID(N'$RoleName')
          AND member_principal_id = DATABASE_PRINCIPAL_ID(N'$literalName')
    ) THEN 1 ELSE 0 END AS bit) AS [IsMember];
"@
    try { $rows = @(Invoke-Sqlcmd @connection -Query $query @quiet) }
    catch { throw 'SqlReadFailed: principal and membership metadata could not be read; no absence was inferred.' }
    if ($rows.Count -ne 1) { throw 'PrincipalUnreadable: membership metadata is incomplete or inconsistent.' }
    $row = $rows[0]
    if ($row.UserName -isnot [string] -or $row.RoleName -isnot [string]) {
        throw 'PrincipalMissing: both the requested user and existing role must be present.'
    }
    if ($row.UserName -cne $UserName -or $row.RoleName -cne $RoleName -or $row.UserType -notin @('S', 'U', 'E', 'C', 'K')) {
        throw 'PrincipalConflict: the requested member must be a database user, not a role or group.'
    }
    if ($row.IsMember -isnot [bool]) { throw 'PrincipalUnreadable: membership state could not be determined.' }
    return $row.IsMember
}

function Write-TaskResult([string] $Status) {
    [pscustomobject]@{
        Task = 'Ensure-SqlRoleMembership'; Status = $Status; Changed = $Status -eq 'Changed'
        TargetResourceId = $target.ResourceId; Subject = "$UserName -> $RoleName"; Fields = [string[]] @('Membership')
    }
}

if ($TenantId -eq [guid]::Empty -or $SubscriptionId -eq [guid]::Empty -or [string]::IsNullOrWhiteSpace($UserName) -or
    $UserName.Length -gt 128 -or $UserName -match '[\x00-\x1f\x7f]' -or [string]::IsNullOrWhiteSpace($RoleName)) {
    throw 'InvalidInput: explicit tenant, subscription, user name of at most 128 characters, and an allowlisted RoleName are required.'
}
$RoleName = $RoleName.ToLowerInvariant()
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
if (Get-MembershipState) { Write-TaskResult 'NoChange'; return }
if ($NonInteractive -and -not $WhatIfPreference -and
    ((Test-AmbientConsentDefault) -or -not $PSBoundParameters.ContainsKey('Confirm') -or [bool] $PSBoundParameters['Confirm'])) {
    throw 'ConfirmationRequired: supply explicit -NonInteractive -Confirm:$false with session consent defaults disabled.'
}
$ConfirmPreference = if ($NonInteractive) { 'None' } else { 'Low' }
$confirmationTarget = "tenant=$TenantId subscription=$SubscriptionId $($target.ResourceId) user=$UserName role=$RoleName"
$approved = $PSCmdlet.ShouldProcess($confirmationTarget, 'Add one SQL role membership')
if ($approved -and -not $NonInteractive -and $PSBoundParameters.ContainsKey('Confirm') -and -not [bool] $PSBoundParameters['Confirm']) {
    $approved = $PSCmdlet.ShouldContinue("Add one SQL role membership: $confirmationTarget", 'Confirm task')
}
if (-not $approved) {
    Write-TaskResult $(if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' })
    return
}
$null = Get-VerifiedContext
if (Get-MembershipState) { Write-TaskResult 'NoChange'; return }
try { $null = Invoke-Sqlcmd @connection -Query "ALTER ROLE [$RoleName] ADD MEMBER $identifier;" @quiet }
catch {
    if (Get-MembershipState) { Write-TaskResult 'NoChange'; return }
    throw 'SqlWriteFailed: membership creation failed; inspect the exact database membership before retrying.'
}
if (-not (Get-MembershipState)) { throw 'VerificationFailed: the intended membership was not observed after writing.' }
Write-TaskResult 'Changed'
