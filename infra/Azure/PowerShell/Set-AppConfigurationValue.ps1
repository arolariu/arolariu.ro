#Requires -Version 7.0
<#
.SYNOPSIS
Upserts one ordinary App Configuration key and explicit label using conditional writes.
.DESCRIPTION
Preserves unowned tags and description. Refuses locked settings and Key Vault reference types.
Empty Label means no label; empty Value and ContentType are supported explicit inputs.
.EXAMPLE
.\Set-AppConfigurationValue.ps1 -TenantId $tenant -SubscriptionId $subscription -TargetResourceId $storeId -Key 'Feature:Name' -Label '' -Value 'enabled' -ContentType '' -WhatIf
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High', DefaultParameterSetName = 'ById')]
[OutputType([pscustomobject])]
param(
    [guid] $TenantId,
    [guid] $SubscriptionId,
    [Parameter(ParameterSetName = 'ById')]
    [Parameter(ParameterSetName = 'Cleanup')] [string] $TargetResourceId,
    [Parameter(ParameterSetName = 'ByName')] [string] $ResourceGroupName,
    [Parameter(ParameterSetName = 'ByName')] [string] $StoreName,
    [string] $Key,
    [AllowEmptyString()] [string] $Label,
    [AllowEmptyString()] [string] $Value,
    [AllowEmptyString()] [string] $ContentType,
    [hashtable] $Tags,
    [switch] $ManageTemporaryAccess,
    [string] $RecoveryReceiptPath,
    [Parameter(ParameterSetName = 'Cleanup')] [switch] $ResumeCleanup,
    [ValidateRange(1, 1800)] [int] $AccessPropagationTimeoutSeconds = 900,
    [switch] $NonInteractive
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$quiet = @{ ErrorAction = 'Stop'; WarningAction = 'SilentlyContinue'; InformationAction = 'SilentlyContinue'; Verbose = $false; Debug = $false }
$taskName = 'Set-AppConfigurationValue'
$taskParameters = @{} + $PSBoundParameters
$taskCommand = $PSCmdlet
$receipt = $null
$receiptFile = ''
$receiptWritten = $false
$accessAttempted = $false
$accessChanged = $false
$cleanupStatus = 'NotNeeded'
$targetStateKnown = $true
$readDenied = $false
$deferredStatus = ''
$allowedScopes = @{}
$storeRole = '5ae67dd6-50cb-40e7-96ff-dc2bfa4b606b'

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

function Assert-StoreId([string] $Id) {
    if ($Id -notmatch '^/subscriptions/([^/]+)/resourceGroups/([^/]+)/providers/Microsoft\.AppConfiguration/configurationStores/([a-zA-Z0-9-]+)$' -or
        $Matches[1] -ine $SubscriptionId.ToString() -or [WildcardPattern]::ContainsWildcardCharacters($Id)) {
        throw 'TargetScope: supply an exact configuration-store ID in the requested subscription.'
    }
}

function Get-HttpStatus($Record) {
    $exception = $Record.Exception
    while ($null -ne $exception) {
        if ($exception.PSObject.Properties['StatusCode'] -and $null -ne $exception.StatusCode) { return [int] $exception.StatusCode }
        if ($exception.PSObject.Properties['Response'] -and $null -ne $exception.Response -and
            $exception.Response.PSObject.Properties['StatusCode']) { return [int] $exception.Response.StatusCode }
        $exception = $exception.InnerException
    }
    return 0
}

function Get-CurrentSetting {
    $script:readDenied = $false
    try { $items = @(Get-AzAppConfigurationKeyValue -Endpoint $endpoint -Key $readKey -Label $readLabel -After '' @quiet) }
    catch {
        $script:readDenied = (Get-HttpStatus $_) -eq 403
        throw 'SettingReadFailed: exact key/label state could not be read; no absence was inferred.'
    }
    if (-not $items.Count) { return $null }
    if ($items.Count -ne 1 -or $items[0].Key -cne $Key -or [string] $items[0].Label -cne $Label -or
        [string]::IsNullOrWhiteSpace($items[0].Etag) -or $items[0].Locked -isnot [bool]) {
        throw 'SettingUnreadable: key/label metadata is incomplete or inconsistent.'
    }
    $item = $items[0]
    if ($item.Locked) { throw 'SettingLocked: this task never unlocks a setting.' }
    if (([string] $item.ContentType).Split(';')[0].Trim() -ieq 'application/vnd.microsoft.appconfig.keyvaultref+json') {
        throw 'ContentTypeConflict: an ordinary value must not flatten a Key Vault reference.'
    }
    return $item
}

function Test-DesiredState($Current) {
    if ($null -eq $Current -or [string] $Current.Value -cne $Value -or [string] $Current.ContentType -cne $ContentType) { return $false }
    foreach ($name in $Tags.Keys) {
        if ($null -eq $Current.Tag -or -not $Current.Tag.ContainsKey($name) -or $Current.Tag[$name] -cne $Tags[$name]) { return $false }
    }
    return $true
}

function Write-TaskResult([string] $Status) {
    [pscustomobject]@{
        Task = 'Set-AppConfigurationValue'; Status = $Status; Changed = $Status -eq 'Changed'
        TargetResourceId = $target.ResourceId; Subject = "$Key (label=$Label)"
        Fields = [string[]] $(if ($ResumeCleanup) { @('TemporaryAccess') }
            elseif (-not $targetStateKnown) { @('TemporaryAccess', 'SettingStateDeferred') }
            elseif ($ownsTags) { @('Value', 'ContentType', 'Tags') } else { @('Value', 'ContentType') })
        AccessChanged = $accessChanged; CleanupStatus = $cleanupStatus; TargetStateKnown = $targetStateKnown
        RecoveryReceiptPath = $(if ($receiptWritten) { $receiptFile } else { $null })
    }
}

function Read-AuthContext {
    $principalId = ''; $clientId = ''; $kind = 'Unknown'
    try {
        $token = Get-AzAccessToken -DefaultProfile $context @quiet
        if ($token.Token -isnot [securestring]) { throw 'Unverifiable token.' }
        $raw = [Net.NetworkCredential]::new('', $token.Token).Password
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
    finally { $raw = $null; $claims = $null; $token = $null }
    $identity = [pscustomobject]@{
        Task = $taskName; Phase = 'Authentication'; Environment = $context.Environment.Name
        TenantId = $TenantId.ToString(); SubscriptionId = $SubscriptionId.ToString()
        ActorKind = $kind; PrincipalId = $principalId; ClientId = $clientId; TargetResourceId = $TargetResourceId
    }
    Write-Information -MessageData $identity -Tags 'AuthContext' -InformationAction Continue
    return $identity
}

function Assert-CurrentActor {
    $script:context = Get-VerifiedContext
    $actual = Read-AuthContext
    if ($actor.PrincipalId -and $actual.PrincipalId -ine $actor.PrincipalId) { throw 'ContextActorChanged: the executing principal changed.' }
}

function Confirm-TaskAction([string] $Action) {
    if ($NonInteractive -and -not $WhatIfPreference -and
        ((Test-AmbientConsentDefault) -or -not $taskParameters.ContainsKey('Confirm') -or [bool] $taskParameters['Confirm'])) {
        throw 'ConfirmationRequired: supply explicit consent with session mode/access defaults disabled.'
    }
    $approved = $taskCommand.ShouldProcess("tenant=$TenantId subscription=$SubscriptionId $($target.ResourceId) key=$Key label=$Label", $Action)
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

function Get-RecordedRole($Role) {
    try {
        $response = Invoke-AzRestMethod -Path "$($Role.Id)?api-version=2022-04-01" -Method GET -DefaultProfile $accessContext -Confirm:$false @quiet
        if ([int] $response.StatusCode -eq 404) { return $null }
        if ([int] $response.StatusCode -ne 200) { throw 'Role unreadable.' }
        return ($response.Content | ConvertFrom-Json -AsHashtable)
    }
    catch {
        if ((Get-HttpStatus $_) -eq 404) { return $null }
        throw 'AccessReadFailed: exact owned assignment could not be read.'
    }
}

function Restore-OwnedAccess {
    $pending = [Collections.Generic.List[string]]::new()
    $roles = @($receipt.OwnedRoleAssignments)
    [array]::Reverse($roles)
    foreach ($role in $roles) {
        try {
            $prefix = "$($role.Scope)/providers/Microsoft.Authorization/roleAssignments/"
            $parsed = [guid]::Empty
            if (-not $allowedScopes.ContainsKey($role.Scope) -or $role.PrincipalId -ine $receipt.PrincipalId -or
                ($role.RoleDefinitionId -split '/')[-1] -ine $allowedScopes[$role.Scope] -or
                $role.Description -cne "arolariu-task:$($receipt.InvocationId)" -or
                -not $role.Id.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) -or
                -not [guid]::TryParse($role.Id.Substring($prefix.Length), [ref] $parsed)) { throw 'Receipt ownership mismatch.' }
            $currentRole = Get-RecordedRole $role
            if ($null -eq $currentRole) { continue }
            $properties = $currentRole['properties']
            if ($properties['scope'] -ine $role.Scope -or $properties['principalId'] -ine $role.PrincipalId -or
                $properties['roleDefinitionId'] -ine $role.RoleDefinitionId -or $properties['description'] -cne $role.Description) {
                throw 'Assignment ownership changed.'
            }
            $removed = Invoke-AzRestMethod -Path "$($role.Id)?api-version=2022-04-01" -Method DELETE -DefaultProfile $accessContext -Confirm:$false @quiet
            if ([int] $removed.StatusCode -notin 200, 204 -or $null -ne (Get-RecordedRole $role)) { throw 'Removal not verified.' }
            $script:accessChanged = $true
        }
        catch { $pending.Add([string] $role.Id) }
    }
    $receipt.Cleanup.Status = if ($pending.Count) { 'Failed' } else { 'Completed' }
    $receipt.Cleanup.PendingActions = @($pending)
    $receipt.Phase = if ($pending.Count) { 'CleanupFailed' } else { 'CleanupComplete' }
    try { Save-AccessReceipt }
    catch { throw "CleanupFailed: receipt persistence failed; reconcile $receiptFile." }
    if ($pending.Count) { throw "CleanupFailed: reconcile owned access using $receiptFile." }
    $script:cleanupStatus = 'Completed'
}

function Request-ScopedAccess([string] $Scope) {
    if (-not $ManageTemporaryAccess) { return $true }
    Assert-CurrentActor
    if ($receipt -and @($receipt.OwnedRoleAssignments | Where-Object Scope -eq $Scope).Count) { return $true }
    $roleId = $allowedScopes[$Scope]
    if (-not $roleId -or -not $actor.PrincipalId) { throw 'AccessSetupFailed: no eligible scoped principal/role.' }
    try { $assignments = @(Get-AzRoleAssignment -ObjectId $actor.PrincipalId -Scope $Scope -DefaultProfile $accessContext @quiet) }
    catch { throw 'AccessSetupFailed: existing scoped assignments could not be inspected.' }
    foreach ($assignment in $assignments) {
        $condition = $assignment.PSObject.Properties['Condition']
        if ($assignment.ObjectId -ieq $actor.PrincipalId -and ($assignment.RoleDefinitionId -split '/')[-1] -ieq $roleId -and
            -not [string]::IsNullOrWhiteSpace($assignment.Scope) -and
            ($assignment.Scope -ieq $Scope -or $Scope.StartsWith($assignment.Scope + '/', [StringComparison]::OrdinalIgnoreCase)) -and
            ($null -eq $condition -or [string]::IsNullOrEmpty([string] $condition.Value))) { return $true }
    }
    if (-not (Confirm-TaskAction "Inspect/upsert the selected key; temporarily grant role=$roleId principal=$($actor.PrincipalId) scope=$Scope; then remove it")) {
        return $false
    }
    if ($null -eq $receipt) {
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
            TargetResourceId = $target.ResourceId; Phase = 'Prepared'; OwnedRoleAssignments = @()
            BusinessResult = @{ Status = 'NotRun'; Changed = $false }; Cleanup = @{ Status = 'Pending'; PendingActions = @() }
        }
    }
    $role = @{
        Id = "$Scope/providers/Microsoft.Authorization/roleAssignments/$([guid]::NewGuid())"; Scope = $Scope
        PrincipalId = $actor.PrincipalId; RoleDefinitionId = "/subscriptions/$SubscriptionId/providers/Microsoft.Authorization/roleDefinitions/$roleId"
        Description = "arolariu-task:$($receipt.InvocationId)"
    }
    $receipt.OwnedRoleAssignments += @($role)
    $receipt.Phase = 'Prepared'
    $receipt.Cleanup.PendingActions = @($receipt.OwnedRoleAssignments | ForEach-Object { $_.Id })
    Save-AccessReceipt
    $script:accessAttempted = $true
    $script:accessChanged = $true
    try {
        $payload = @{ properties = @{
            principalId = $role.PrincipalId; roleDefinitionId = $role.RoleDefinitionId; description = $role.Description
            principalType = $(if ($actor.ActorKind -eq 'User') { 'User' } else { 'ServicePrincipal' })
        } } | ConvertTo-Json -Depth 5 -Compress
        $created = Invoke-AzRestMethod -Path "$($role.Id)?api-version=2022-04-01" -Method PUT -Payload $payload -DefaultProfile $accessContext -Confirm:$false @quiet
        if ([int] $created.StatusCode -notin 200, 201) { throw 'Role creation not confirmed.' }
        $receipt.Phase = 'AccessAcquired'
        Save-AccessReceipt
    }
    catch { throw 'AccessSetupFailed: scoped acquisition failed; owned cleanup will be attempted.' }
    return $true
}

function Read-AccessibleState([scriptblock] $Read, [string] $Scope) {
    try { return & $Read }
    catch {
        if (-not $ManageTemporaryAccess -or -not $readDenied) { throw }
        $script:targetStateKnown = $false
        if (-not (Request-ScopedAccess $Scope)) {
            $script:deferredStatus = if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' }
            return $null
        }
        $deadline = (Get-Date).AddSeconds($AccessPropagationTimeoutSeconds)
        while ($true) {
            try { $state = & $Read; $script:targetStateKnown = $true; return $state }
            catch {
                if (-not $readDenied -or (Get-Date) -ge $deadline) { throw }
                Start-Sleep -Seconds 2
            }
        }
    }
}

function Invoke-SettingOperation {
    $current = Read-AccessibleState { Get-CurrentSetting } $target.ResourceId
    if ($deferredStatus) { return $deferredStatus }
    if (Test-DesiredState $current) { return 'NoChange' }
    if (-not (Confirm-TaskAction 'Upsert ordinary value (value hidden)')) { return $(if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' }) }
    Assert-CurrentActor
    if (-not (Request-ScopedAccess $target.ResourceId)) { return 'Declined' }
    $current = Get-CurrentSetting
    if (Test-DesiredState $current) { return 'NoChange' }
    $mergedTags = [hashtable]::new([StringComparer]::Ordinal)
    if ($null -ne $current -and $null -ne $current.Tag) {
        foreach ($name in $current.Tag.Keys) { $mergedTags[$name] = $current.Tag[$name] }
    }
    foreach ($name in $Tags.Keys) { $mergedTags[$name] = $Tags[$name] }
    $write = @{ Endpoint = $endpoint; Key = $Key; Value = $Value; ContentType = $ContentType; Tag = $mergedTags; Confirm = $false }
    if ($Label.Length) { $write.Label = $Label }
    if ($null -eq $current) { $write.IfNoneMatch = '*' }
    else {
        $write.IfMatch = '"' + $current.Etag.Trim('"') + '"'
        if ($null -ne $current.Description) { $write.Description = $current.Description }
    }
    Assert-CurrentActor
    try { $null = Set-AzAppConfigurationKeyValue @write @quiet }
    catch {
        if ((Get-HttpStatus $_) -eq 412) {
            if (Test-DesiredState (Get-CurrentSetting)) { return 'NoChange' }
            throw 'StaleState: the setting changed; rerun to inspect and confirm the new state.'
        }
        throw 'SettingWriteFailed: the conditional write failed; inspect the exact key/label before retrying.'
    }
    if ($receipt) { $receipt.BusinessResult = @{ Status = 'Changed'; Changed = $true }; Save-AccessReceipt }
    if (-not (Test-DesiredState (Get-CurrentSetting))) { throw 'VerificationFailed: intended key/label state was not observed.' }
    return 'Changed'
}

if ($TenantId -eq [guid]::Empty -or $SubscriptionId -eq [guid]::Empty -or (-not $ResumeCleanup -and
    ([string]::IsNullOrWhiteSpace($Key) -or -not $PSBoundParameters.ContainsKey('Label') -or -not $PSBoundParameters.ContainsKey('Value') -or
    -not $PSBoundParameters.ContainsKey('ContentType') -or $Key -match '[\x00-\x1f\x7f]' -or $Label -match '[\x00-\x1f\x7f]'))) {
    throw 'InvalidInput: explicit tenant, subscription, key, label, value, and content type are required.'
}
if ($ContentType.Split(';')[0].Trim() -ieq 'application/vnd.microsoft.appconfig.keyvaultref+json') {
    throw 'ContentTypeConflict: use the dedicated Key Vault reference task.'
}
$ownsTags = $PSBoundParameters.ContainsKey('Tags')
if ($null -eq $Tags) { $Tags = @{} }
foreach ($name in $Tags.Keys) {
    if ($name -isnot [string] -or $Tags[$name] -isnot [string]) { throw 'InvalidInput: tags must map string names to string values.' }
}
try { $null = Get-Command Get-AzContext, Get-AzResource, Get-AzAccessToken, Get-AzAppConfigurationKeyValue, Set-AzAppConfigurationKeyValue @quiet }
catch { throw 'PrerequisiteMissing: load Az.Accounts, Az.Resources, and data-plane Az.AppConfiguration before invoking this task.' }
if ($PSCmdlet.ParameterSetName -in 'ById', 'Cleanup') { Assert-StoreId $TargetResourceId }
elseif ([string]::IsNullOrWhiteSpace($ResourceGroupName) -or [string]::IsNullOrWhiteSpace($StoreName) -or
    [WildcardPattern]::ContainsWildcardCharacters($ResourceGroupName)) {
    throw 'TargetScope: supply an exact resource group and store name or manual name pattern.'
}
if ($NonInteractive -and $PSCmdlet.ParameterSetName -eq 'ByName' -and [WildcardPattern]::ContainsWildcardCharacters($StoreName)) {
    throw 'AmbiguousTarget: noninteractive execution requires an exact target, not a name pattern.'
}
$context = Get-VerifiedContext
$accessContext = $context
$actor = Read-AuthContext
$script:ConfirmPreference = if ($NonInteractive) { 'None' } else { 'Low' }
if ($ManageTemporaryAccess -or $ResumeCleanup) {
    try { $null = Get-Command Get-AzRoleAssignment, Invoke-AzRestMethod @quiet }
    catch { throw 'PrerequisiteMissing: access management requires Az.Resources and Az.Accounts REST commands.' }
}
if ($ResumeCleanup) {
    $target = [pscustomobject]@{ ResourceId = $TargetResourceId }
    $allowedScopes[$TargetResourceId] = $storeRole
    try {
        $script:receiptFile = [IO.Path]::GetFullPath($RecoveryReceiptPath)
        $script:receipt = Get-Content -LiteralPath $receiptFile -Raw | ConvertFrom-Json -AsHashtable
        if ($receipt.SchemaVersion -ne 1 -or $receipt.Task -cne $taskName -or $receipt.TargetResourceId -ine $TargetResourceId -or
            $receipt.TenantId -ine $TenantId.ToString() -or $receipt.SubscriptionId -ine $SubscriptionId.ToString() -or
            -not $receipt.ContainsKey('OwnedRoleAssignments')) { throw 'Receipt mismatch.' }
        $script:receiptWritten = $true
    }
    catch { throw 'ReceiptInvalid: cleanup requires a matching task, tenant, subscription and exact target receipt.' }
    if (-not (Confirm-TaskAction 'Reconcile only the owned temporary access in this receipt')) {
        Write-TaskResult $(if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' }); return
    }
    Restore-OwnedAccess
    Write-TaskResult 'NoChange'
    return
}
try {
    $lookup = @{ ExpandProperties = $true; DefaultProfile = $context }
    if ($PSCmdlet.ParameterSetName -in 'ById', 'Cleanup') { $lookup.ResourceId = $TargetResourceId }
    else { $lookup.ResourceGroupName = $ResourceGroupName; $lookup.ResourceType = 'Microsoft.AppConfiguration/configurationStores'; $lookup.Name = $StoreName }
    $candidates = @(Get-AzResource @lookup @quiet)
}
catch { throw 'TargetReadFailed: the scoped store lookup failed; no change was made.' }
if (-not $candidates.Count) { throw 'TargetNotFound: no store matched the explicit scope.' }
foreach ($candidate in $candidates) {
    Assert-StoreId $candidate.ResourceId
    if ($candidate.ResourceType -ine 'Microsoft.AppConfiguration/configurationStores') { throw 'TargetScope: the resolved resource is not a store.' }
}
if ($candidates.Count -gt 1) {
    if ($NonInteractive) { throw 'AmbiguousTarget: the lookup did not resolve to exactly one store.' }
    for ($i = 0; $i -lt $candidates.Count; $i++) { Write-Host "$($i + 1): $($candidates[$i].ResourceId)" }
    $selection = 0
    if (-not [int]::TryParse((Read-Host 'Select store number'), [ref] $selection) -or $selection -lt 1 -or $selection -gt $candidates.Count) {
        throw 'TargetSelectionDeclined: no valid store was selected.'
    }
    $target = $candidates[$selection - 1]
}
else { $target = $candidates[0] }
$allowedScopes[$target.ResourceId] = $storeRole
$targetEvent = $actor.PSObject.Copy()
$targetEvent.Phase = 'TargetResolved'; $targetEvent.TargetResourceId = $target.ResourceId
Write-Information -MessageData $targetEvent -Tags 'AuthContext' -InformationAction Continue
$uri = $null
if (-not [uri]::TryCreate($target.Properties.endpoint, [UriKind]::Absolute, [ref] $uri) -or $uri.Scheme -ne 'https' -or
    -not $uri.IsDefaultPort -or $uri.UserInfo -or $uri.Query -or $uri.Fragment -or $uri.AbsolutePath -ne '/' -or
    $uri.Host -notmatch ('^' + [regex]::Escape($target.Name) + '\.(azconfig\.io|azconfig\.azure\.us|azconfig\.azure\.cn)$')) {
    throw 'TargetEndpoint: the resolved store endpoint is not a safe App Configuration URI.'
}
$endpoint = $uri.AbsoluteUri.TrimEnd('/')
$readKey = $Key.Replace('\', '\\').Replace('*', '\*').Replace(',', '\,')
$readLabel = if ($Label.Length) { $Label.Replace('\', '\\').Replace('*', '\*').Replace(',', '\,') } else { [string][char] 0 }
try {
    $status = Invoke-SettingOperation
    if ($receipt) { $receipt.BusinessResult = @{ Status = $status; Changed = $status -eq 'Changed' }; Save-AccessReceipt }
}
finally { if ($accessAttempted) { Restore-OwnedAccess } }
Write-TaskResult $status
