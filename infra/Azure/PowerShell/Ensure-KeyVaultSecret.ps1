#Requires -Version 7.0
<#
.SYNOPSIS
Preserves one usable Key Vault secret or creates it from an explicit secure value.
.DESCRIPTION
Uses the existing matching Az context. Optional scoped access is owned, recorded, and cleaned up.
Never rotates, repairs, recovers, or reveals a secret.
Serialize writers for the same secret: Set Secret has no atomic create-if-absent condition.
.EXAMPLE
.\Ensure-KeyVaultSecret.ps1 -TenantId $tenant -SubscriptionId $subscription -TargetResourceId $vaultId -SecretName 'api-jwt' -WhatIf
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High', DefaultParameterSetName = 'ById')]
[OutputType([pscustomobject])]
param(
    [guid] $TenantId,
    [guid] $SubscriptionId,
    [Parameter(ParameterSetName = 'ById')]
    [Parameter(ParameterSetName = 'Cleanup')] [string] $TargetResourceId,
    [Parameter(ParameterSetName = 'ByName')] [string] $ResourceGroupName,
    [Parameter(ParameterSetName = 'ByName')] [string] $VaultName,
    [string] $SecretName,
    [securestring] $SecretValue,
    [switch] $ManageTemporaryAccess,
    [string] $RecoveryReceiptPath,
    [Parameter(ParameterSetName = 'Cleanup')] [switch] $ResumeCleanup,
    [ValidateRange(1, 1800)] [int] $AccessPropagationTimeoutSeconds = 120,
    [switch] $NonInteractive
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$quiet = @{ ErrorAction = 'Stop'; WarningAction = 'SilentlyContinue'; InformationAction = 'SilentlyContinue'; Verbose = $false; Debug = $false }
$taskParameters = @{} + $PSBoundParameters
$taskCommand = $PSCmdlet
$receipt = $null
$receiptFile = ''
$receiptWritten = $false
$accessAttempted = $false
$accessPropagationDeadline = $null
$accessChanged = $false
$cleanupStatus = 'NotNeeded'
$targetStateKnown = $true
$secretReadDenied = $false
$secretsOfficer = 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'

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

function Assert-VaultId([string] $Id) {
    if ($Id -notmatch '^/subscriptions/([^/]+)/resourceGroups/([^/]+)/providers/Microsoft\.KeyVault/vaults/([a-zA-Z0-9-]+)$' -or
        $Matches[1] -ine $SubscriptionId.ToString() -or [WildcardPattern]::ContainsWildcardCharacters($Id)) {
        throw 'TargetScope: supply an exact vault resource ID in the requested subscription.'
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

function Get-UsableSecret {
    $script:secretReadDenied = $false
    try { $versions = @(Get-AzKeyVaultSecret -VaultName $target.Name -Name $SecretName -IncludeVersions -DefaultProfile $context @quiet) }
    catch {
        if ((Get-HttpStatus $_) -eq 404) { return $null }
        $script:secretReadDenied = (Get-HttpStatus $_) -eq 403
        throw 'SecretReadFailed: secret version metadata could not be read; no change was made.'
    }
    if (-not $versions.Count) { return $null }
    foreach ($version in $versions) {
        if ($version.Name -ine $SecretName -or $version.VaultName -ine $target.Name -or
            [string]::IsNullOrWhiteSpace($version.Version) -or $version.Created -isnot [datetime]) {
            throw 'SecretUnusable: secret version metadata is incomplete or inconsistent.'
        }
    }
    $ordered = @($versions | Sort-Object Created -Descending)
    if ($ordered.Count -gt 1 -and $ordered[0].Created -eq $ordered[1].Created) {
        throw 'SecretUnusable: the latest secret version cannot be determined safely.'
    }
    $latest = $ordered[0]
    $now = [datetime]::UtcNow
    if ($latest.Enabled -isnot [bool] -or -not $latest.Enabled -or
        ($null -ne $latest.Expires -and ($latest.Expires -isnot [datetime] -or $latest.Expires.ToUniversalTime() -le $now)) -or
        ($null -ne $latest.NotBefore -and ($latest.NotBefore -isnot [datetime] -or $latest.NotBefore.ToUniversalTime() -gt $now))) {
        throw 'SecretUnusable: the latest secret version is disabled, expired, not yet valid, or unreadable.'
    }
    return $latest
}

function Write-TaskResult([string] $Status) {
    [pscustomobject]@{
        Task = 'Ensure-KeyVaultSecret'
        Status = $Status
        Changed = $Status -eq 'Changed'
        TargetResourceId = $target.ResourceId
        Subject = $SecretName
        Fields = [string[]] $(if ($ResumeCleanup) { @('TemporaryAccess') }
            elseif (-not $targetStateKnown) { @('TemporaryAccess', 'SecretStateDeferred') } else { @('SecretValue') })
        AccessChanged = $accessChanged
        CleanupStatus = $cleanupStatus
        TargetStateKnown = $targetStateKnown
        RecoveryReceiptPath = $(if ($receiptWritten) { $receiptFile } else { $null })
    }
}

function Read-AuthContext {
    $principalId = ''
    $clientId = ''
    $kind = 'Unknown'
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
        if ($claims['tid'] -ine $TenantId.ToString() -or -not [guid]::TryParse([string] $claims['oid'], [ref] $parsed)) {
            throw 'Mismatched identity.'
        }
        $principalId = $parsed.ToString()
        $clientClaim = [string] $(if ($claims.ContainsKey('azp')) { $claims['azp'] } else { $claims['appid'] })
        if ([guid]::TryParse($clientClaim, [ref] $parsed) -and $parsed -ne [guid]::Empty) { $clientId = $parsed.ToString() }
        $kind = if ($claims['idtyp'] -eq 'app' -or $context.Account.Type -in 'ServicePrincipal', 'ManagedService', 'ManagedIdentity') {
            'Application'
        }
        elseif ($context.Account.Type -eq 'User') { 'User' }
        else { throw 'Unknown actor type.' }
    }
    catch {
        if ($ManageTemporaryAccess -or $ResumeCleanup) { throw 'ContextIdentityUnverifiable: current principal cannot be verified for access management.' }
    }
    finally { $raw = $null; $claims = $null; $token = $null }
    $identity = [pscustomobject]@{
        Task = 'Ensure-KeyVaultSecret'; Phase = 'Authentication'; Environment = $context.Environment.Name
        TenantId = $TenantId.ToString(); SubscriptionId = $SubscriptionId.ToString()
        ActorKind = $kind; PrincipalId = $principalId; ClientId = $clientId
        TargetResourceId = $TargetResourceId
    }
    Write-Information -MessageData $identity -Tags 'AuthContext' -InformationAction Continue
    return $identity
}

function Confirm-TaskAction([string] $Action) {
    if ($NonInteractive -and -not $WhatIfPreference -and
        ((Test-AmbientConsentDefault) -or -not $taskParameters.ContainsKey('Confirm') -or [bool] $taskParameters['Confirm'])) {
        throw 'ConfirmationRequired: supply explicit consent with session mode/access defaults disabled.'
    }
    $approved = $taskCommand.ShouldProcess("tenant=$TenantId subscription=$SubscriptionId $($target.ResourceId) secret=$SecretName", $Action)
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
    catch { throw 'ReceiptInvalid: recovery metadata could not be persisted safely; inspect the requested receipt path.' }
}

function Get-RecordedRole($Role) {
    try {
        $response = Invoke-AzRestMethod -Path "$($Role.Id)?api-version=2022-04-01" -Method GET -DefaultProfile $context -Confirm:$false @quiet
        if ([int] $response.StatusCode -eq 404) { return $null }
        if ([int] $response.StatusCode -ne 200) { throw 'Role unreadable.' }
        return ($response.Content | ConvertFrom-Json -AsHashtable)
    }
    catch {
        if ((Get-HttpStatus $_) -eq 404) { return $null }
        throw 'AccessReadFailed: exact owned role assignment could not be read.'
    }
}

function Restore-OwnedAccess {
    try {
        foreach ($role in $receipt.OwnedRoleAssignments) {
            $expectedPrefix = "$($target.ResourceId)/providers/Microsoft.Authorization/roleAssignments/"
            $roleGuid = [guid]::Empty
            if ($role.Scope -ine $target.ResourceId -or $role.PrincipalId -ine $receipt.PrincipalId -or
                $role.Description -cne "arolariu-task:$($receipt.InvocationId)" -or
                ($role.RoleDefinitionId -split '/')[-1] -ine $secretsOfficer -or
                -not $role.Id.StartsWith($expectedPrefix, [StringComparison]::OrdinalIgnoreCase) -or
                -not [guid]::TryParse($role.Id.Substring($expectedPrefix.Length), [ref] $roleGuid)) {
                throw 'Receipt scope changed.'
            }
            $current = Get-RecordedRole $role
            if ($null -eq $current) { continue }
            $properties = $current['properties']
            if ($properties['scope'] -ine $role.Scope -or $properties['principalId'] -ine $role.PrincipalId -or
                $properties['roleDefinitionId'] -ine $role.RoleDefinitionId -or $properties['description'] -cne $role.Description) {
                throw 'Assignment ownership changed.'
            }
            $removed = Invoke-AzRestMethod -Path "$($role.Id)?api-version=2022-04-01" -Method DELETE -DefaultProfile $context -Confirm:$false @quiet
            if ([int] $removed.StatusCode -notin 200, 204 -or $null -ne (Get-RecordedRole $role)) { throw 'Role removal not verified.' }
            $script:accessChanged = $true
        }
        $receipt.Cleanup.Status = 'Completed'
        $receipt.Cleanup.PendingActions = @()
        $receipt.Phase = 'CleanupComplete'
        Save-AccessReceipt
        $script:cleanupStatus = 'Completed'
    }
    catch {
        $receipt.Cleanup.Status = 'Failed'
        $receipt.Cleanup.PendingActions = @($receipt.OwnedRoleAssignments | ForEach-Object { $_.Id })
        $receipt.Phase = 'CleanupFailed'
        try { Save-AccessReceipt } catch { Write-Information 'Receipt persistence also failed; reconcile the exact planned role IDs.' -InformationAction Continue }
        throw "CleanupFailed: reconcile owned access using recovery receipt $receiptFile."
    }
}

function Request-TemporaryAccess {
    if (-not $ManageTemporaryAccess) { return $true }
    if ([string]::IsNullOrWhiteSpace($actor.PrincipalId)) { throw 'ContextIdentityUnverifiable: access requires a verified principal.' }
    if ($accessAttempted) { return $true }
    try { $assignments = @(Get-AzRoleAssignment -ObjectId $actor.PrincipalId -Scope $target.ResourceId -DefaultProfile $context @quiet) }
    catch { throw 'AccessSetupFailed: existing scoped access could not be inspected.' }
    foreach ($assignment in $assignments) {
        $condition = $assignment.PSObject.Properties['Condition']
        if ($assignment.ObjectId -ieq $actor.PrincipalId -and
            ($assignment.RoleDefinitionId -split '/')[-1] -iin $secretsOfficer, '00482a5a-887f-4fb3-b363-3b7fe8e74483' -and
            -not [string]::IsNullOrWhiteSpace($assignment.Scope) -and
            ($assignment.Scope -ieq $target.ResourceId -or $target.ResourceId.StartsWith($assignment.Scope + '/', [StringComparison]::OrdinalIgnoreCase)) -and
            ($null -eq $condition -or [string]::IsNullOrEmpty([string] $condition.Value))) { return $true }
    }
    if ($WhatIfPreference) {
        $null = Confirm-TaskAction 'Temporarily grant scoped Secrets Officer access; protected target state may be unknown'
        return $false
    }
    try {
        if ([string]::IsNullOrWhiteSpace($RecoveryReceiptPath)) { throw 'Receipt path required.' }
        $script:receiptFile = [IO.Path]::GetFullPath($RecoveryReceiptPath)
        if ([IO.File]::Exists($receiptFile) -or [IO.Directory]::Exists($receiptFile) -or
            -not [IO.Directory]::Exists([IO.Path]::GetDirectoryName($receiptFile))) { throw 'Invalid receipt destination.' }
    }
    catch { throw 'ReceiptInvalid: provide a new file in an existing caller-owned recovery directory.' }
    if (-not (Confirm-TaskAction "Temporarily grant Secrets Officer to principal=$($actor.PrincipalId); remove it after this task")) { return $false }
    $invocation = [guid]::NewGuid().ToString()
    $role = @{
        Id = "$($target.ResourceId)/providers/Microsoft.Authorization/roleAssignments/$([guid]::NewGuid())"
        Scope = $target.ResourceId; PrincipalId = $actor.PrincipalId
        RoleDefinitionId = "/subscriptions/$SubscriptionId/providers/Microsoft.Authorization/roleDefinitions/$secretsOfficer"
        Description = "arolariu-task:$invocation"
    }
    $script:receipt = @{
        SchemaVersion = 1; InvocationId = $invocation; Task = 'Ensure-KeyVaultSecret'
        TenantId = $TenantId.ToString(); SubscriptionId = $SubscriptionId.ToString()
        PrincipalId = $actor.PrincipalId; TargetResourceId = $target.ResourceId; Phase = 'Prepared'
        OwnedRoleAssignments = @($role); BusinessResult = @{ Status = 'NotRun'; Changed = $false }
        Cleanup = @{ Status = 'Pending'; PendingActions = @($role.Id) }
    }
    Save-AccessReceipt
    $script:accessAttempted = $true
    $script:accessChanged = $true
    try {
        $payload = @{ properties = @{
            principalId = $role.PrincipalId; roleDefinitionId = $role.RoleDefinitionId
            principalType = $(if ($actor.ActorKind -eq 'User') { 'User' } else { 'ServicePrincipal' }); description = $role.Description
        } } | ConvertTo-Json -Depth 5 -Compress
        $created = Invoke-AzRestMethod -Path "$($role.Id)?api-version=2022-04-01" -Method PUT -Payload $payload -DefaultProfile $context -Confirm:$false @quiet
        if ([int] $created.StatusCode -notin 200, 201) { throw 'Role creation not confirmed.' }
        $script:accessPropagationDeadline = (Get-Date).AddSeconds($AccessPropagationTimeoutSeconds)
        $receipt.Phase = 'AccessAcquired'
        Save-AccessReceipt
    }
    catch { throw 'AccessSetupFailed: scoped access acquisition failed; owned cleanup will be attempted.' }
    return $true
}

function Read-AccessibleSecret {
    $deadline = if ($null -ne $accessPropagationDeadline) { $accessPropagationDeadline } else { (Get-Date).AddSeconds($AccessPropagationTimeoutSeconds) }
    while ($true) {
        try { return Get-UsableSecret }
        catch {
            if (-not $secretReadDenied -or -not $accessAttempted -or (Get-Date) -ge $deadline) { throw }
            Start-Sleep -Seconds 2
        }
    }
}

function Invoke-SecretOperation {
    try { $existing = Get-UsableSecret }
    catch {
        if (-not $ManageTemporaryAccess -or -not $secretReadDenied) { throw }
        $script:targetStateKnown = $false
        if (-not (Request-TemporaryAccess)) { return $(if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' }) }
        $existing = Read-AccessibleSecret
        $script:targetStateKnown = $true
    }
    if ($null -ne $existing) { return 'NoChange' }
    try { $removed = @(Get-AzKeyVaultSecret -VaultName $target.Name -Name $SecretName -InRemovedState -DefaultProfile $context @quiet) }
    catch {
        if ((Get-HttpStatus $_) -eq 404) { $removed = @() }
        else { throw 'SecretReadFailed: deleted-secret metadata could not be checked; no change was made.' }
    }
    if ($removed.Count) { throw 'SecretSoftDeleted: recovery, purge, and replacement are outside this task.' }
    if (-not (Confirm-TaskAction 'Create absent secret')) { return $(if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' }) }
    if ($null -eq $SecretValue) {
        if ($NonInteractive) { throw 'SecretValueRequired: supply a SecureString for an absent secret.' }
        $value = Read-Host 'New secret value' -AsSecureString
    }
    else { $value = $SecretValue }
    if ($null -eq $value -or -not $value.Length) { throw 'SecretValueRequired: the secure value must not be empty.' }
    if (-not (Request-TemporaryAccess)) { return 'Declined' }
    while ($true) {
        $script:context = Get-VerifiedContext
        $actual = Read-AuthContext
        if ($actor.PrincipalId -and $actual.PrincipalId -ine $actor.PrincipalId) { throw 'ContextActorChanged: the executing principal changed.' }
        if ($null -ne (Read-AccessibleSecret)) { return 'NoChange' }
        try { $removed = @(Get-AzKeyVaultSecret -VaultName $target.Name -Name $SecretName -InRemovedState -DefaultProfile $context @quiet) }
        catch {
            if ((Get-HttpStatus $_) -eq 404) { $removed = @() }
            else { throw 'SecretReadFailed: deleted-secret metadata could not be checked; no change was made.' }
        }
        if ($removed.Count) { throw 'SecretSoftDeleted: recovery, purge, and replacement are outside this task.' }
        try {
            $null = Set-AzKeyVaultSecret -VaultName $target.Name -Name $SecretName -SecretValue $value -DefaultProfile $context -Confirm:$false @quiet
            break
        }
        catch {
            if ((Get-HttpStatus $_) -ne 403 -or $null -eq $accessPropagationDeadline) {
                throw 'SecretWriteFailed: creation failed; inspect the exact secret state before retrying.'
            }
            if ((Get-Date) -ge $accessPropagationDeadline) { throw 'AccessPropagationTimeout: owned secret write permission did not become available.' }
            Start-Sleep -Seconds 2
        }
    }
    if ($null -ne $receipt) {
        $receipt.BusinessResult = @{ Status = 'Changed'; Changed = $true }
        Save-AccessReceipt
    }
    if ($null -eq (Read-AccessibleSecret)) { throw 'VerificationFailed: usable metadata was not observed after creation.' }
    return 'Changed'
}

if ($TenantId -eq [guid]::Empty -or $SubscriptionId -eq [guid]::Empty -or
    (-not $ResumeCleanup -and $SecretName -notmatch '^[a-zA-Z0-9-]{1,127}$')) {
    throw 'InvalidInput: explicit tenant, subscription, and a valid secret name are required.'
}
try { $null = Get-Command Get-AzContext, Get-AzResource, Get-AzKeyVaultSecret, Set-AzKeyVaultSecret, Get-AzAccessToken @quiet }
catch { throw 'PrerequisiteMissing: load Az.Accounts, Az.Resources, and Az.KeyVault before invoking this task.' }

if ($PSCmdlet.ParameterSetName -in 'ById', 'Cleanup') { Assert-VaultId $TargetResourceId }
elseif ([string]::IsNullOrWhiteSpace($ResourceGroupName) -or [string]::IsNullOrWhiteSpace($VaultName) -or
    [WildcardPattern]::ContainsWildcardCharacters($ResourceGroupName)) {
    throw 'TargetScope: supply an exact resource group and a vault name or manual name pattern.'
}
if ($NonInteractive -and $PSCmdlet.ParameterSetName -eq 'ByName' -and [WildcardPattern]::ContainsWildcardCharacters($VaultName)) {
    throw 'AmbiguousTarget: noninteractive execution requires an exact target, not a name pattern.'
}
$context = Get-VerifiedContext
$actor = Read-AuthContext
$script:ConfirmPreference = if ($NonInteractive) { 'None' } else { 'Low' }
if ($ManageTemporaryAccess -or $ResumeCleanup) {
    try { $null = Get-Command Get-AzRoleAssignment, Invoke-AzRestMethod @quiet }
    catch { throw 'PrerequisiteMissing: access management requires Az.Resources and Az.Accounts REST commands.' }
}
if ($ResumeCleanup) {
    $target = [pscustomobject]@{ ResourceId = $TargetResourceId }
    try {
        $script:receiptFile = [IO.Path]::GetFullPath($RecoveryReceiptPath)
        $script:receipt = Get-Content -LiteralPath $receiptFile -Raw | ConvertFrom-Json -AsHashtable
        if ($receipt.SchemaVersion -ne 1 -or $receipt.Task -cne 'Ensure-KeyVaultSecret' -or
            $receipt.TargetResourceId -ine $TargetResourceId -or $receipt.TenantId -ine $TenantId.ToString() -or
            $receipt.SubscriptionId -ine $SubscriptionId.ToString() -or -not $receipt.ContainsKey('OwnedRoleAssignments')) {
            throw 'Receipt mismatch.'
        }
        $script:receiptWritten = $true
    }
    catch { throw 'ReceiptInvalid: cleanup requires a matching task, tenant, subscription and exact target receipt.' }
    if (-not (Confirm-TaskAction 'Reconcile and remove only the owned temporary access in this receipt')) {
        Write-TaskResult $(if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' })
        return
    }
    $script:accessAttempted = $true
    Restore-OwnedAccess
    Write-TaskResult 'NoChange'
    return
}
try {
    $lookup = @{ ExpandProperties = $true; DefaultProfile = $context }
    if ($PSCmdlet.ParameterSetName -in 'ById', 'Cleanup') { $lookup.ResourceId = $TargetResourceId }
    else { $lookup.ResourceGroupName = $ResourceGroupName; $lookup.ResourceType = 'Microsoft.KeyVault/vaults'; $lookup.Name = $VaultName }
    $candidates = @(Get-AzResource @lookup @quiet)
}
catch { throw 'TargetReadFailed: the scoped vault lookup failed; no change was made.' }
if (-not $candidates.Count) { throw 'TargetNotFound: no vault matched the explicit scope.' }
foreach ($candidate in $candidates) {
    Assert-VaultId $candidate.ResourceId
    if ($candidate.ResourceType -ine 'Microsoft.KeyVault/vaults') { throw 'TargetScope: the resolved resource is not a vault.' }
}
if ($candidates.Count -gt 1) {
    if ($NonInteractive) { throw 'AmbiguousTarget: the lookup did not resolve to exactly one vault.' }
    for ($i = 0; $i -lt $candidates.Count; $i++) { Write-Host "$($i + 1): $($candidates[$i].ResourceId)" }
    $selection = 0
    if (-not [int]::TryParse((Read-Host 'Select vault number'), [ref] $selection) -or $selection -lt 1 -or $selection -gt $candidates.Count) {
        throw 'TargetSelectionDeclined: no valid vault was selected.'
    }
    $target = $candidates[$selection - 1]
}
else { $target = $candidates[0] }
$targetEvent = $actor.PSObject.Copy()
$targetEvent.Phase = 'TargetResolved'
$targetEvent.TargetResourceId = $target.ResourceId
Write-Information -MessageData $targetEvent -Tags 'AuthContext' -InformationAction Continue

try {
    $status = Invoke-SecretOperation
    if ($null -ne $receipt) {
        $receipt.BusinessResult = @{ Status = $status; Changed = $status -eq 'Changed' }
        Save-AccessReceipt
    }
}
finally {
    if ($accessAttempted) { Restore-OwnedAccess }
}
Write-TaskResult $status
