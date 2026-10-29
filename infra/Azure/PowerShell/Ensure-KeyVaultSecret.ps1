#Requires -Version 7.0
<#
.SYNOPSIS
Preserves one usable Key Vault secret or creates it from an explicit secure value.
.DESCRIPTION
Uses the existing matching Az context. Never rotates, repairs, recovers, or reveals a secret.
Serialize writers for the same secret: Set Secret has no atomic create-if-absent condition.
.EXAMPLE
.\Ensure-KeyVaultSecret.ps1 -TenantId $tenant -SubscriptionId $subscription -TargetResourceId $vaultId -SecretName 'api-jwt' -WhatIf
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High', DefaultParameterSetName = 'ById')]
[OutputType([pscustomobject])]
param(
    [guid] $TenantId,
    [guid] $SubscriptionId,
    [Parameter(ParameterSetName = 'ById')] [string] $TargetResourceId,
    [Parameter(ParameterSetName = 'ByName')] [string] $ResourceGroupName,
    [Parameter(ParameterSetName = 'ByName')] [string] $VaultName,
    [string] $SecretName,
    [securestring] $SecretValue,
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
    try { $versions = @(Get-AzKeyVaultSecret -VaultName $target.Name -Name $SecretName -IncludeVersions -DefaultProfile $context @quiet) }
    catch {
        if ((Get-HttpStatus $_) -eq 404) { return $null }
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
        Fields = [string[]] @('SecretValue')
    }
}

if ($TenantId -eq [guid]::Empty -or $SubscriptionId -eq [guid]::Empty -or $SecretName -notmatch '^[a-zA-Z0-9-]{1,127}$') {
    throw 'InvalidInput: explicit tenant, subscription, and a valid secret name are required.'
}
try { $null = Get-Command Get-AzContext, Get-AzResource, Get-AzKeyVaultSecret, Set-AzKeyVaultSecret @quiet }
catch { throw 'PrerequisiteMissing: load Az.Accounts, Az.Resources, and Az.KeyVault before invoking this task.' }

if ($PSCmdlet.ParameterSetName -eq 'ById') { Assert-VaultId $TargetResourceId }
elseif ([string]::IsNullOrWhiteSpace($ResourceGroupName) -or [string]::IsNullOrWhiteSpace($VaultName) -or
    [WildcardPattern]::ContainsWildcardCharacters($ResourceGroupName)) {
    throw 'TargetScope: supply an exact resource group and a vault name or manual name pattern.'
}
if ($NonInteractive -and $PSCmdlet.ParameterSetName -eq 'ByName' -and [WildcardPattern]::ContainsWildcardCharacters($VaultName)) {
    throw 'AmbiguousTarget: noninteractive execution requires an exact target, not a name pattern.'
}
$context = Get-VerifiedContext
try {
    $lookup = @{ ExpandProperties = $true; DefaultProfile = $context }
    if ($PSCmdlet.ParameterSetName -eq 'ById') { $lookup.ResourceId = $TargetResourceId }
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

if ($null -ne (Get-UsableSecret)) { Write-TaskResult 'NoChange'; return }
try { $removed = @(Get-AzKeyVaultSecret -VaultName $target.Name -Name $SecretName -InRemovedState -DefaultProfile $context @quiet) }
catch {
    if ((Get-HttpStatus $_) -eq 404) { $removed = @() }
    else { throw 'SecretReadFailed: deleted-secret metadata could not be checked; no change was made.' }
}
if ($removed.Count) { throw 'SecretSoftDeleted: recovery, purge, and replacement are outside this task.' }
if ($NonInteractive -and -not $WhatIfPreference -and
    (-not $PSBoundParameters.ContainsKey('Confirm') -or [bool] $PSBoundParameters['Confirm'])) {
    throw 'ConfirmationRequired: noninteractive writes require explicit -Confirm:$false.'
}
$ConfirmPreference = if ($NonInteractive) { 'None' } else { 'Low' }
$confirmationTarget = "tenant=$TenantId subscription=$SubscriptionId $($target.ResourceId) secret=$SecretName"
$approved = $PSCmdlet.ShouldProcess($confirmationTarget, 'Create absent secret')
if ($approved -and -not $NonInteractive -and $PSBoundParameters.ContainsKey('Confirm') -and -not [bool] $PSBoundParameters['Confirm']) {
    $approved = $PSCmdlet.ShouldContinue("Create absent secret: $confirmationTarget", 'Confirm task')
}
if (-not $approved) {
    Write-TaskResult $(if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' })
    return
}
if ($null -eq $SecretValue) {
    if ($NonInteractive) { throw 'SecretValueRequired: supply a SecureString for an absent secret.' }
    $SecretValue = Read-Host 'New secret value' -AsSecureString
}
if ($null -eq $SecretValue -or -not $SecretValue.Length) { throw 'SecretValueRequired: the secure value must not be empty.' }
$context = Get-VerifiedContext
if ($null -ne (Get-UsableSecret)) { Write-TaskResult 'NoChange'; return }
try { $null = Set-AzKeyVaultSecret -VaultName $target.Name -Name $SecretName -SecretValue $SecretValue -DefaultProfile $context -Confirm:$false @quiet }
catch { throw 'SecretWriteFailed: creation failed; inspect the exact secret state before retrying.' }
if ($null -eq (Get-UsableSecret)) { throw 'VerificationFailed: usable metadata was not observed after creation.' }
Write-TaskResult 'Changed'
