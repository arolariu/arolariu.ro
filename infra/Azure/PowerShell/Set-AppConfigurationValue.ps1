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
    [Parameter(ParameterSetName = 'ById')] [string] $TargetResourceId,
    [Parameter(ParameterSetName = 'ByName')] [string] $ResourceGroupName,
    [Parameter(ParameterSetName = 'ByName')] [string] $StoreName,
    [string] $Key,
    [AllowEmptyString()] [string] $Label,
    [AllowEmptyString()] [string] $Value,
    [AllowEmptyString()] [string] $ContentType,
    [hashtable] $Tags,
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
    try { $items = @(Get-AzAppConfigurationKeyValue -Endpoint $endpoint -Key $readKey -Label $readLabel -After '' @quiet) }
    catch { throw 'SettingReadFailed: exact key/label state could not be read; no absence was inferred.' }
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
        Fields = [string[]] $(if ($ownsTags) { @('Value', 'ContentType', 'Tags') } else { @('Value', 'ContentType') })
    }
}

if ($TenantId -eq [guid]::Empty -or $SubscriptionId -eq [guid]::Empty -or [string]::IsNullOrWhiteSpace($Key) -or
    -not $PSBoundParameters.ContainsKey('Label') -or -not $PSBoundParameters.ContainsKey('Value') -or
    -not $PSBoundParameters.ContainsKey('ContentType') -or $Key -match '[\x00-\x1f\x7f]' -or $Label -match '[\x00-\x1f\x7f]') {
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
try { $null = Get-Command Get-AzContext, Get-AzResource, Get-AzAppConfigurationKeyValue, Set-AzAppConfigurationKeyValue @quiet }
catch { throw 'PrerequisiteMissing: load Az.Accounts, Az.Resources, and data-plane Az.AppConfiguration before invoking this task.' }
if ($PSCmdlet.ParameterSetName -eq 'ById') { Assert-StoreId $TargetResourceId }
elseif ([string]::IsNullOrWhiteSpace($ResourceGroupName) -or [string]::IsNullOrWhiteSpace($StoreName) -or
    [WildcardPattern]::ContainsWildcardCharacters($ResourceGroupName)) {
    throw 'TargetScope: supply an exact resource group and store name or manual name pattern.'
}
if ($NonInteractive -and $PSCmdlet.ParameterSetName -eq 'ByName' -and [WildcardPattern]::ContainsWildcardCharacters($StoreName)) {
    throw 'AmbiguousTarget: noninteractive execution requires an exact target, not a name pattern.'
}
$context = Get-VerifiedContext
try {
    $lookup = @{ ExpandProperties = $true; DefaultProfile = $context }
    if ($PSCmdlet.ParameterSetName -eq 'ById') { $lookup.ResourceId = $TargetResourceId }
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
$uri = $null
if (-not [uri]::TryCreate($target.Properties.endpoint, [UriKind]::Absolute, [ref] $uri) -or $uri.Scheme -ne 'https' -or
    -not $uri.IsDefaultPort -or $uri.UserInfo -or $uri.Query -or $uri.Fragment -or $uri.AbsolutePath -ne '/' -or
    $uri.Host -notmatch ('^' + [regex]::Escape($target.Name) + '\.(azconfig\.io|azconfig\.azure\.us|azconfig\.azure\.cn)$')) {
    throw 'TargetEndpoint: the resolved store endpoint is not a safe App Configuration URI.'
}
$endpoint = $uri.AbsoluteUri.TrimEnd('/')
$readKey = $Key.Replace('\', '\\').Replace('*', '\*').Replace(',', '\,')
$readLabel = if ($Label.Length) { $Label.Replace('\', '\\').Replace('*', '\*').Replace(',', '\,') } else { [string][char] 0 }
$current = Get-CurrentSetting
if (Test-DesiredState $current) { Write-TaskResult 'NoChange'; return }
if ($NonInteractive -and -not $WhatIfPreference -and
    (-not $PSBoundParameters.ContainsKey('Confirm') -or [bool] $PSBoundParameters['Confirm'])) {
    throw 'ConfirmationRequired: noninteractive writes require explicit -Confirm:$false.'
}
$ConfirmPreference = if ($NonInteractive) { 'None' } else { 'Low' }
$confirmationTarget = "tenant=$TenantId subscription=$SubscriptionId $($target.ResourceId) key=$Key label=$Label"
$approved = $PSCmdlet.ShouldProcess($confirmationTarget, 'Upsert ordinary value (value hidden)')
if ($approved -and -not $NonInteractive -and $PSBoundParameters.ContainsKey('Confirm') -and -not [bool] $PSBoundParameters['Confirm']) {
    $approved = $PSCmdlet.ShouldContinue("Upsert ordinary value: $confirmationTarget", 'Confirm task')
}
if (-not $approved) {
    Write-TaskResult $(if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' })
    return
}
$null = Get-VerifiedContext
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
try { $null = Set-AzAppConfigurationKeyValue @write @quiet }
catch {
    if ((Get-HttpStatus $_) -eq 412) {
        if (Test-DesiredState (Get-CurrentSetting)) { Write-TaskResult 'NoChange'; return }
        throw 'StaleState: the setting changed; rerun to inspect and confirm the new state.'
    }
    throw 'SettingWriteFailed: the conditional write failed; inspect the exact key/label before retrying.'
}
if (-not (Test-DesiredState (Get-CurrentSetting))) { throw 'VerificationFailed: the intended key/label state was not observed after writing.' }
Write-TaskResult 'Changed'
