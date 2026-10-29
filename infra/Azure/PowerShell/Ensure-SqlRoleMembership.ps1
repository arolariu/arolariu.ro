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
    [Parameter(ParameterSetName = 'ById')]
    [Parameter(ParameterSetName = 'Cleanup')] [string] $TargetResourceId,
    [Parameter(ParameterSetName = 'ByName')] [string] $ResourceGroupName,
    [Parameter(ParameterSetName = 'ByName')] [string] $ServerName,
    [Parameter(ParameterSetName = 'ByName')] [string] $DatabaseName,
    [string] $UserName,
    [ValidateSet('db_datareader', 'db_datawriter', 'db_ddladmin')] [string] $RoleName,
    [switch] $ManageTemporaryAccess,
    [string] $RecoveryReceiptPath,
    [Parameter(ParameterSetName = 'Cleanup')] [switch] $ResumeCleanup,
    [ipaddress] $ClientIPAddress,
    [string] $OperatorLoginName,
    [ValidateRange(1, 1800)] [int] $AccessPropagationTimeoutSeconds = 180,
    [switch] $NonInteractive
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$quiet = @{ ErrorAction = 'Stop'; WarningAction = 'SilentlyContinue'; InformationAction = 'SilentlyContinue'; Verbose = $false; Debug = $false }
$taskName = 'Ensure-SqlRoleMembership'
$taskParameters = @{} + $PSBoundParameters
$taskCommand = $PSCmdlet
$receipt = $null
$receiptFile = ''
$receiptWritten = $false
$accessAttempted = $false
$accessChanged = $false
$cleanupStatus = 'NotNeeded'
$targetStateKnown = $true
$sqlReadErrorNumber = 0
$accessGeneration = 0
$deferredStatus = ''

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
        foreach ($control in 'Confirm', 'cf', 'NonInteractive', 'ManageTemporaryAccess', 'ResumeCleanup') {
            if ($pattern.IsMatch($control)) { return $true }
        }
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
    $script:sqlReadErrorNumber = 0
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
    catch {
        $script:sqlReadErrorNumber = Get-SqlErrorNumber $_
        throw 'SqlReadFailed: principal and membership metadata could not be read; no absence was inferred.'
    }
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
        TargetResourceId = $target.ResourceId; Subject = "$UserName -> $RoleName"
        Fields = [string[]] $(if ($ResumeCleanup) { @('TemporaryAccess') }
            elseif (-not $targetStateKnown) { @('AdministratorOrFirewallAccess', 'MembershipStateDeferred') } else { @('Membership') })
        AccessChanged = $accessChanged; CleanupStatus = $cleanupStatus; TargetStateKnown = $targetStateKnown
        RecoveryReceiptPath = $(if ($receiptWritten) { $receiptFile } else { $null })
    }
}

function Get-SqlErrorNumber($Record) {
    $exception = $Record.Exception
    while ($null -ne $exception) {
        if ($exception.PSObject.Properties['Number']) { return [int] $exception.Number }
        foreach ($property in 'Errors', 'SqlErrors') {
            if ($exception.PSObject.Properties[$property]) {
                foreach ($errorItem in $exception.$property) {
                    if ($errorItem.PSObject.Properties['Number']) { return [int] $errorItem.Number }
                }
            }
        }
        $exception = $exception.InnerException
    }
    return 0
}

function Read-AuthContext([securestring] $AccessToken) {
    $principalId = ''; $clientId = ''; $kind = 'Unknown'
    try {
        $raw = [Net.NetworkCredential]::new('', $AccessToken).Password
        $parts = $raw.Split('.')
        if ($parts.Length -ne 3) { throw 'Opaque token.' }
        $payload = $parts[1].Replace('-', '+').Replace('_', '/')
        $payload = $payload.PadRight($payload.Length + ((4 - $payload.Length % 4) % 4), '=')
        $claims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload)) | ConvertFrom-Json -AsHashtable
        $parsed = [guid]::Empty
        if ($claims['tid'] -ine $TenantId.ToString() -or -not [guid]::TryParse([string] $claims['oid'], [ref] $parsed) -or $parsed -eq [guid]::Empty) {
            throw 'Mismatched identity.'
        }
        $principalId = $parsed.ToString()
        $clientClaim = [string] $(if ($claims.ContainsKey('azp')) { $claims['azp'] } else { $claims['appid'] })
        if ([guid]::TryParse($clientClaim, [ref] $parsed) -and $parsed -ne [guid]::Empty) { $clientId = $parsed.ToString() }
        $kind = if ($claims['idtyp'] -eq 'app' -or $context.Account.Type -in 'ServicePrincipal', 'ManagedService', 'ManagedIdentity') { 'Application' }
        elseif ($context.Account.Type -eq 'User') { 'User' } else { throw 'Unknown actor type.' }
    }
    catch {
        if ($ManageTemporaryAccess -or $ResumeCleanup) { throw 'ContextIdentityUnverifiable: current access-management principal could not be verified.' }
        $principalId = ''; $clientId = ''; $kind = 'Unknown'
    }
    finally { $raw = $null; $claims = $null }
    $identity = [pscustomobject]@{
        Task = $taskName; Phase = 'Authentication'; Environment = $context.Environment.Name
        TenantId = $TenantId.ToString(); SubscriptionId = $SubscriptionId.ToString()
        ActorKind = $kind; PrincipalId = $principalId; ClientId = $clientId; TargetResourceId = $target.ResourceId
    }
    Write-Information -MessageData $identity -Tags 'AuthContext' -InformationAction Continue
    return $identity
}

function Assert-CurrentActor {
    $script:context = Get-VerifiedContext
    try { $fresh = Get-AzAccessToken -ResourceUrl $sqlAudience -DefaultProfile $context @quiet }
    catch { throw 'TokenUnavailable: current SQL actor could not be verified.' }
    if ($fresh.Token -isnot [securestring]) { throw 'TokenUnavailable: a secure token is required.' }
    $actual = Read-AuthContext $fresh.Token
    if ($actor.PrincipalId -and $actual.PrincipalId -ine $actor.PrincipalId) { throw 'ContextActorChanged: the executing principal changed.' }
    $connection.AccessToken = $fresh.Token
}

function Confirm-TaskAction([string] $Action) {
    if ($NonInteractive -and -not $WhatIfPreference -and
        ((Test-AmbientConsentDefault) -or -not $taskParameters.ContainsKey('Confirm') -or [bool] $taskParameters['Confirm'])) {
        throw 'ConfirmationRequired: supply explicit consent with session mode/access defaults disabled.'
    }
    $approved = $taskCommand.ShouldProcess("tenant=$TenantId subscription=$SubscriptionId $($target.ResourceId) user=$UserName role=$RoleName", $Action)
    if ($approved -and -not $NonInteractive -and $taskParameters.ContainsKey('Confirm') -and -not [bool] $taskParameters['Confirm']) {
        $approved = $taskCommand.ShouldContinue("$Action : $($target.ResourceId)", 'Confirm task')
    }
    return $approved
}

function Save-AccessReceipt {
    try {
        if ($receiptWritten) {
            $stored = Get-Content -LiteralPath $receiptFile -Raw | ConvertFrom-Json -AsHashtable
            if ($stored['InvocationId'] -cne $receipt.InvocationId) { throw 'Receipt ownership changed.' }
        }
        $temporary = "$receiptFile.$($receipt.InvocationId).tmp"
        [IO.File]::WriteAllText($temporary, ($receipt | ConvertTo-Json -Depth 10), [Text.UTF8Encoding]::new($false))
        [IO.File]::Move($temporary, $receiptFile, $receiptWritten)
        $script:receiptWritten = $true
    }
    catch { throw 'ReceiptInvalid: recovery metadata could not be persisted safely.' }
}

function Initialize-AccessReceipt {
    if ($null -ne $receipt) { return }
    try {
        if ([string]::IsNullOrWhiteSpace($RecoveryReceiptPath)) { throw 'Receipt required.' }
        $script:receiptFile = [IO.Path]::GetFullPath($RecoveryReceiptPath)
        if ([IO.File]::Exists($receiptFile) -or [IO.Directory]::Exists($receiptFile) -or
            -not [IO.Directory]::Exists([IO.Path]::GetDirectoryName($receiptFile))) { throw 'Invalid receipt destination.' }
    }
    catch { throw 'ReceiptInvalid: provide a new file in an existing caller-owned directory.' }
    $script:receipt = @{
        SchemaVersion = 1; InvocationId = [guid]::NewGuid().ToString(); Task = $taskName
        TenantId = $TenantId.ToString(); SubscriptionId = $SubscriptionId.ToString(); PrincipalId = $actor.PrincipalId
        TargetResourceId = $target.ResourceId; ServerResourceId = $serverId; Phase = 'Prepared'
        OwnedRoleAssignments = @(); SqlAdministrator = $null; OwnedFirewallRule = $null
        BusinessResult = @{ Status = 'NotRun'; Changed = $false }; Cleanup = @{ Status = 'Pending'; PendingActions = @() }
    }
}

function Get-AdministratorSnapshot {
    try {
        $response = Invoke-AzRestMethod -Path ($serverId + '?api-version=2025-01-01&$expand=administrators/activedirectory') -Method GET -DefaultProfile $accessContext -Confirm:$false @quiet
        if ([int] $response.StatusCode -ne 200) { throw 'Server unreadable.' }
        $body = $response.Content | ConvertFrom-Json -AsHashtable
        $admin = $body['properties']['administrators']
        $objectId = [guid]::Empty
        if ($admin -isnot [Collections.IDictionary] -or
            ($admin.Contains('administratorType') -and $admin['administratorType'] -ne 'ActiveDirectory') -or
            $admin['principalType'] -notin 'Application', 'User', 'Group' -or $admin['tenantId'] -ine $TenantId.ToString() -or
            -not [guid]::TryParse([string] $admin['sid'], [ref] $objectId) -or $objectId -eq [guid]::Empty -or
            [string]::IsNullOrWhiteSpace([string] $admin['login'])) { throw 'Unknown administrator.' }
        $enforcement = Get-AzSqlServerActiveDirectoryOnlyAuthentication -ResourceGroupName $serverGroup -ServerName $serverResourceName -DefaultProfile $accessContext @quiet
        if ($enforcement.AzureADOnlyAuthentication -isnot [bool]) { throw 'Unknown enforcement.' }
        return @{
            Administrator = @{
                ObjectId = $objectId.ToString(); PrincipalType = [string] $admin['principalType']; Login = [string] $admin['login']
                TenantId = [string] $admin['tenantId']; AdministratorType = 'ActiveDirectory'
            }
            EntraOnly = $enforcement.AzureADOnlyAuthentication
        }
    }
    catch { throw 'SqlAdministratorUnknown: exact prior typed administrator and Entra-only enforcement are required.' }
}

function Test-AdministratorEqual($Left, $Right) {
    foreach ($field in 'ObjectId', 'PrincipalType', 'TenantId', 'AdministratorType') {
        if ($Left[$field] -ine $Right[$field]) { return $false }
    }
    return $Left['Login'] -ceq $Right['Login']
}

function Set-TypedAdministrator($Administrator) {
    $payload = @{ properties = @{ administrators = @{
        administratorType = $Administrator.AdministratorType; principalType = $Administrator.PrincipalType
        login = $Administrator.Login; sid = $Administrator.ObjectId; tenantId = $Administrator.TenantId
    } } } | ConvertTo-Json -Depth 5 -Compress
    $response = Invoke-AzRestMethod -Path "$serverId`?api-version=2025-01-01" -Method PATCH -Payload $payload -WaitForCompletion -DefaultProfile $accessContext -Confirm:$false @quiet
    if ([int] $response.StatusCode -notin 200, 202) { throw 'Administrator update not confirmed.' }
}

function Request-AdministratorAccess {
    if ($receipt -and $null -ne $receipt.SqlAdministrator) { return $true }
    if (-not (Confirm-TaskAction "Inspect/ensure the selected SQL membership; temporarily use principal=$($actor.PrincipalId) as Entra administrator on $serverId; then restore it")) { return $false }
    Assert-CurrentActor
    $before = Get-AdministratorSnapshot
    if ($before.Administrator.ObjectId -ieq $actor.PrincipalId) { return $true }
    if ($actor.ActorKind -ne 'User') { throw 'SqlAccessUnavailable: only a verified user can request a temporary operator administrator.' }
    $login = if ($OperatorLoginName) { $OperatorLoginName } else { [string] $context.Account.Id }
    if ([string]::IsNullOrWhiteSpace($login) -or $login.Length -gt 128 -or $login -match '[\x00-\x1f\x7f]') {
        throw 'OperatorLoginNameRequired: supply a safe operator display/login name.'
    }
    Initialize-AccessReceipt
    $temporary = @{
        AdministratorType = 'ActiveDirectory'; PrincipalType = 'User'; ObjectId = $actor.PrincipalId
        Login = $login; TenantId = $TenantId.ToString()
    }
    $receipt.SqlAdministrator = @{
        Before = $before.Administrator; EntraOnlyBefore = $before.EntraOnly
        TemporaryObjectId = $actor.PrincipalId; Temporary = $temporary
    }
    $receipt.Phase = 'PreparedAdministrator'
    $receipt.Cleanup.PendingActions = @('SqlAdministrator')
    Save-AccessReceipt
    $currentAdmin = Get-AdministratorSnapshot
    if (-not (Test-AdministratorEqual $before.Administrator $currentAdmin.Administrator) -or $before.EntraOnly -ne $currentAdmin.EntraOnly) {
        throw 'AccessConflict: the administrator/enforcement changed before acquisition.'
    }
    $script:accessAttempted = $true; $script:accessChanged = $true; $script:accessGeneration++
    try {
        Set-TypedAdministrator $temporary
        $observed = Get-AdministratorSnapshot
        if (-not (Test-AdministratorEqual $temporary $observed.Administrator) -or $observed.EntraOnly -ne $before.EntraOnly) {
            throw 'Administrator verification failed.'
        }
        $receipt.Phase = 'AdministratorAcquired'
        Save-AccessReceipt
    }
    catch { throw 'SqlAccessSetupFailed: administrator acquisition failed; owned cleanup will be attempted.' }
    return $true
}

function Get-Ipv4Number([string] $Address) {
    $parsed = $null
    if (-not [ipaddress]::TryParse($Address, [ref] $parsed) -or $parsed.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork) {
        throw 'InvalidClientIPAddress: an exact IPv4 address is required.'
    }
    $bytes = $parsed.GetAddressBytes()
    return ([long] $bytes[0] * 16777216 + [long] $bytes[1] * 65536 + [long] $bytes[2] * 256 + $bytes[3])
}

function Request-FirewallAccess {
    if ($null -eq $ClientIPAddress) { throw 'ClientIPAddressRequired: supply the exact authorized client IPv4 address; no discovery service is used.' }
    if ($receipt -and $null -ne $receipt.OwnedFirewallRule) { return $true }
    if (-not (Confirm-TaskAction "Temporarily permit exact IPv4=$ClientIPAddress on $serverId for the selected SQL operation; then remove the owned rule")) { return $false }
    Assert-CurrentActor
    try { $rules = @(Get-AzSqlServerFirewallRule -ResourceGroupName $serverGroup -ServerName $serverResourceName -DefaultProfile $accessContext @quiet) }
    catch { throw 'SqlAccessSetupFailed: existing firewall state could not be read.' }
    $address = Get-Ipv4Number $ClientIPAddress.ToString()
    foreach ($rule in $rules) {
        if ($address -ge (Get-Ipv4Number $rule.StartIpAddress) -and $address -le (Get-Ipv4Number $rule.EndIpAddress)) { return $true }
    }
    Initialize-AccessReceipt
    $receipt.OwnedFirewallRule = @{
        Name = 'arolariu-task-' + ([guid] $receipt.InvocationId).ToString('N')
        StartIpAddress = $ClientIPAddress.ToString(); EndIpAddress = $ClientIPAddress.ToString()
    }
    $receipt.Phase = 'PreparedFirewall'
    $receipt.Cleanup.PendingActions = @('OwnedFirewallRule')
    Save-AccessReceipt
    $script:accessAttempted = $true; $script:accessChanged = $true; $script:accessGeneration++
    try {
        $rule = $receipt.OwnedFirewallRule
        $null = New-AzSqlServerFirewallRule -ResourceGroupName $serverGroup -ServerName $serverResourceName -FirewallRuleName $rule.Name `
            -StartIpAddress $rule.StartIpAddress -EndIpAddress $rule.EndIpAddress -DefaultProfile $accessContext -Confirm:$false @quiet
        $observed = @(Get-AzSqlServerFirewallRule -ResourceGroupName $serverGroup -ServerName $serverResourceName -DefaultProfile $accessContext @quiet |
            Where-Object FirewallRuleName -CEQ $rule.Name)
        if ($observed.Count -ne 1 -or $observed[0].StartIpAddress -cne $rule.StartIpAddress -or $observed[0].EndIpAddress -cne $rule.EndIpAddress) {
            throw 'Firewall verification failed.'
        }
        $receipt.Phase = 'FirewallAcquired'
        Save-AccessReceipt
    }
    catch { throw 'SqlAccessSetupFailed: firewall acquisition failed; owned cleanup will be attempted.' }
    return $true
}

function Restore-OwnedAccess {
    $pending = [Collections.Generic.List[string]]::new()
    if ($null -ne $receipt.SqlAdministrator) {
        try {
            $lease = $receipt.SqlAdministrator
            if ($lease.TemporaryObjectId -ine $receipt.PrincipalId -or $lease.Temporary.ObjectId -ine $receipt.PrincipalId -or
                $lease.Temporary.PrincipalType -cne 'User' -or $lease.Temporary.TenantId -ine $TenantId.ToString()) { throw 'Invalid administrator ownership.' }
            $currentAdmin = Get-AdministratorSnapshot
            if (-not (Test-AdministratorEqual $currentAdmin.Administrator $lease.Before)) {
                if (-not (Test-AdministratorEqual $currentAdmin.Administrator $lease.Temporary)) { throw 'Concurrent administrator change.' }
                Set-TypedAdministrator $lease.Before
                $currentAdmin = Get-AdministratorSnapshot
                if (-not (Test-AdministratorEqual $currentAdmin.Administrator $lease.Before)) { throw 'Restoration not verified.' }
                $script:accessChanged = $true
            }
            if ($currentAdmin.EntraOnly -ne $lease.EntraOnlyBefore) { throw 'Enforcement changed; do not overwrite concurrent policy.' }
        }
        catch { $pending.Add('SqlAdministrator') }
    }
    if ($null -ne $receipt.OwnedFirewallRule) {
        try {
            $rule = $receipt.OwnedFirewallRule
            if ($rule.Name -cne ('arolariu-task-' + ([guid] $receipt.InvocationId).ToString('N')) -or
                $rule.StartIpAddress -cne $rule.EndIpAddress -or (Get-Ipv4Number $rule.StartIpAddress) -eq 0) { throw 'Invalid firewall ownership.' }
            $observed = @(Get-AzSqlServerFirewallRule -ResourceGroupName $serverGroup -ServerName $serverResourceName -FirewallRuleName $rule.Name -DefaultProfile $accessContext @quiet)
            if ($observed.Count) {
                if ($observed.Count -ne 1 -or $observed[0].StartIpAddress -cne $rule.StartIpAddress -or $observed[0].EndIpAddress -cne $rule.EndIpAddress) {
                    throw 'Concurrent firewall change.'
                }
                $null = Remove-AzSqlServerFirewallRule -ResourceGroupName $serverGroup -ServerName $serverResourceName -FirewallRuleName $rule.Name `
                    -DefaultProfile $accessContext -Force -Confirm:$false @quiet
                $remaining = @(Get-AzSqlServerFirewallRule -ResourceGroupName $serverGroup -ServerName $serverResourceName -DefaultProfile $accessContext @quiet |
                    Where-Object FirewallRuleName -CEQ $rule.Name)
                if ($remaining.Count) { throw 'Firewall removal not verified.' }
                $script:accessChanged = $true
            }
        }
        catch { $pending.Add('OwnedFirewallRule') }
    }
    $receipt.Cleanup.Status = if ($pending.Count) { 'Failed' } else { 'Completed' }
    $receipt.Cleanup.PendingActions = @($pending)
    $receipt.Phase = if ($pending.Count) { 'CleanupFailed' } else { 'CleanupComplete' }
    try { Save-AccessReceipt } catch { throw "CleanupFailed: receipt persistence failed; reconcile $receiptFile." }
    if ($pending.Count) { throw "CleanupFailed: reconcile owned access using $receiptFile." }
    $script:cleanupStatus = 'Completed'
}

function Read-AccessibleSqlState {
    $deadline = (Get-Date).AddSeconds($AccessPropagationTimeoutSeconds)
    while ($true) {
        try {
            if ($ManageTemporaryAccess) {
                $script:sqlReadErrorNumber = 0
                try { $visibility = @(Invoke-Sqlcmd @connection -Query $inspectionQuery @quiet) }
                catch { $script:sqlReadErrorNumber = Get-SqlErrorNumber $_; throw 'SqlReadFailed: catalog visibility could not be verified.' }
                if ($visibility.Count -ne 1 -or $visibility[0].CanInspect -isnot [bool]) { throw 'SqlReadFailed: catalog visibility is unknown.' }
                if (-not $visibility[0].CanInspect) {
                    $script:sqlReadErrorNumber = 229
                    throw 'SqlReadFailed: catalog invisibility is not proof of an absent principal.'
                }
            }
            $present = & $readState; $script:targetStateKnown = $true; return $present
        }
        catch {
            if (-not $ManageTemporaryAccess -or $sqlReadErrorNumber -notin 18456, 18452, 229, 40615) { throw }
            $script:targetStateKnown = $false
            $generation = $accessGeneration
            $approved = if ($sqlReadErrorNumber -eq 40615) { Request-FirewallAccess } else { Request-AdministratorAccess }
            if (-not $approved) {
                $script:deferredStatus = if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' }
                return $false
            }
            if ($accessGeneration -ne $generation) { $deadline = (Get-Date).AddSeconds($AccessPropagationTimeoutSeconds) }
            if ((Get-Date) -ge $deadline) { throw 'SqlAccessTimeout: required SQL authority/network access was not observed.' }
            Start-Sleep -Seconds 2
        }
    }
}

function Ensure-SqlWriteAuthority {
    if (-not $ManageTemporaryAccess) { return $true }
    $deadline = (Get-Date).AddSeconds($AccessPropagationTimeoutSeconds)
    while ($true) {
        try { $capability = @(Invoke-Sqlcmd @connection -Query $capabilityQuery @quiet) }
        catch { throw 'SqlReadFailed: effective SQL management authority could not be determined.' }
        if ($capability.Count -ne 1 -or $capability[0].CanManage -isnot [bool]) { throw 'SqlReadFailed: management-authority metadata is incomplete.' }
        if ($capability[0].CanManage) { return $true }
        $generation = $accessGeneration
        if (-not (Request-AdministratorAccess)) { return $false }
        if ($accessGeneration -ne $generation) { $deadline = (Get-Date).AddSeconds($AccessPropagationTimeoutSeconds) }
        if ((Get-Date) -ge $deadline) { throw 'SqlAccessTimeout: required management permission was not observed.' }
        Start-Sleep -Seconds 2
    }
}

function Invoke-MembershipOperation {
    $present = Read-AccessibleSqlState
    if ($deferredStatus) { return $deferredStatus }
    if ($present) { return 'NoChange' }
    if (-not (Confirm-TaskAction 'Add one SQL role membership')) { return $(if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' }) }
    Assert-CurrentActor
    if (-not (Ensure-SqlWriteAuthority)) { return 'Declined' }
    if (Read-AccessibleSqlState) { return 'NoChange' }
    Assert-CurrentActor
    try { $null = Invoke-Sqlcmd @connection -Query "ALTER ROLE [$RoleName] ADD MEMBER $identifier;" @quiet }
    catch {
        if (Get-MembershipState) { return 'NoChange' }
        throw 'SqlWriteFailed: membership creation failed; inspect the exact database membership before retrying.'
    }
    if ($receipt) { $receipt.BusinessResult = @{ Status = 'Changed'; Changed = $true }; Save-AccessReceipt }
    if (-not (Get-MembershipState)) { throw 'VerificationFailed: intended membership was not observed.' }
    return 'Changed'
}

if ($TenantId -eq [guid]::Empty -or $SubscriptionId -eq [guid]::Empty -or (-not $ResumeCleanup -and
    ([string]::IsNullOrWhiteSpace($UserName) -or $UserName.Length -gt 128 -or $UserName -match '[\x00-\x1f\x7f]' -or [string]::IsNullOrWhiteSpace($RoleName)))) {
    throw 'InvalidInput: explicit tenant, subscription, user name of at most 128 characters, and an allowlisted RoleName are required.'
}
if (-not $ResumeCleanup) { $RoleName = $RoleName.ToLowerInvariant() }
try { $null = Get-Command Get-AzContext, Get-AzResource, Get-AzAccessToken, Invoke-Sqlcmd @quiet }
catch { throw 'PrerequisiteMissing: load Az.Accounts, Az.Resources, and SqlServer before invoking this task.' }
if ($null -ne $ClientIPAddress -and ($ClientIPAddress.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork -or
    $ClientIPAddress.ToString() -in '0.0.0.0', '255.255.255.255')) { throw 'InvalidClientIPAddress: supply one exact non-wildcard IPv4 address.' }
if ($PSCmdlet.ParameterSetName -in 'ById', 'Cleanup') { Assert-DatabaseId $TargetResourceId }
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
$accessContext = $context
$script:ConfirmPreference = if ($NonInteractive) { 'None' } else { 'Low' }
if ($ManageTemporaryAccess -or $ResumeCleanup) {
    try { $null = Get-Command Invoke-AzRestMethod, Get-AzSqlServerActiveDirectoryOnlyAuthentication, Get-AzSqlServerFirewallRule, New-AzSqlServerFirewallRule, Remove-AzSqlServerFirewallRule @quiet }
    catch { throw 'PrerequisiteMissing: temporary SQL access requires the Az.Accounts REST and Az.Sql commands.' }
}
if ($ResumeCleanup) {
    $target = [pscustomobject]@{ ResourceId = $TargetResourceId }
    $serverId = $TargetResourceId.Substring(0, $TargetResourceId.LastIndexOf('/databases/', [StringComparison]::OrdinalIgnoreCase))
    $null = $serverId -match '^/subscriptions/[^/]+/resourceGroups/([^/]+)/providers/Microsoft.Sql/servers/([^/]+)$'
    $serverGroup = $Matches[1]; $serverResourceName = $Matches[2]
    try { $token = Get-AzAccessToken -DefaultProfile $context @quiet }
    catch { throw 'TokenUnavailable: recovery actor could not be verified.' }
    $actor = Read-AuthContext $token.Token
    try {
        $script:receiptFile = [IO.Path]::GetFullPath($RecoveryReceiptPath)
        $script:receipt = Get-Content -LiteralPath $receiptFile -Raw | ConvertFrom-Json -AsHashtable
        if ($receipt.SchemaVersion -ne 1 -or $receipt.Task -cne $taskName -or $receipt.TargetResourceId -ine $TargetResourceId -or
            $receipt.ServerResourceId -ine $serverId -or $receipt.TenantId -ine $TenantId.ToString() -or
            $receipt.SubscriptionId -ine $SubscriptionId.ToString() -or -not $receipt.ContainsKey('SqlAdministrator') -or
            -not $receipt.ContainsKey('OwnedFirewallRule')) { throw 'Receipt mismatch.' }
        $script:receiptWritten = $true
    }
    catch { throw 'ReceiptInvalid: cleanup requires a matching task, tenant, subscription and exact database/server receipt.' }
    if (-not (Confirm-TaskAction 'Reconcile only the recorded temporary SQL administrator/firewall access')) {
        Write-TaskResult $(if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' }); return
    }
    Restore-OwnedAccess
    Write-TaskResult 'NoChange'
    return
}
try {
    $lookup = @{ ExpandProperties = $true; DefaultProfile = $context }
    if ($PSCmdlet.ParameterSetName -in 'ById', 'Cleanup') { $lookup.ResourceId = $TargetResourceId }
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
$null = $serverId -match '^/subscriptions/[^/]+/resourceGroups/([^/]+)/providers/Microsoft.Sql/servers/([^/]+)$'
$serverGroup = $Matches[1]; $serverResourceName = $Matches[2]
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
$sqlAudience = 'https://' + $suffix.TrimStart('.') + '/'
try { $token = Get-AzAccessToken -ResourceUrl $sqlAudience -DefaultProfile $context @quiet }
catch { throw 'TokenUnavailable: a SQL token could not be obtained from the verified context.' }
if ($token.Token -isnot [securestring]) { throw 'TokenUnavailable: a secure SQL access token is required.' }
$actor = Read-AuthContext $token.Token
$connection = @{
    ServerInstance = $fqdn; Database = $database; AccessToken = $token.Token
    Encrypt = 'Mandatory'; TrustServerCertificate = $false; HostNameInCertificate = $fqdn
    ConnectionTimeout = 15; QueryTimeout = 30; AbortOnError = $true
    DisableVariables = $true; DisableCommands = $true; OutputSqlErrors = $false
}
$literalName = $UserName.Replace("'", "''")
$identifier = '[' + $UserName.Replace(']', ']]') + ']'
$readState = { Get-MembershipState }
$inspectionQuery = "SELECT CAST(COALESCE(HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'VIEW DEFINITION'), 0) AS bit) AS [CanInspect];"
$capabilityQuery = "SELECT CAST(CASE WHEN IS_ROLEMEMBER(N'db_owner') = 1 OR USER_NAME() = N'dbo' THEN 1 ELSE 0 END AS bit) AS [CanManage];"
try {
    $status = Invoke-MembershipOperation
    if ($receipt) { $receipt.BusinessResult = @{ Status = $status; Changed = $status -eq 'Changed' }; Save-AccessReceipt }
}
finally { if ($accessAttempted) { Restore-OwnedAccess } }
Write-TaskResult $status
