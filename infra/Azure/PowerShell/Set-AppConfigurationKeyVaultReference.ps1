#Requires -Version 7.0
<#
.SYNOPSIS
Upserts one typed, versionless App Configuration reference to a usable Key Vault secret.
.DESCRIPTION
Reads secret metadata only. Never creates a secret or accepts an arbitrary plaintext value.
Preserves unowned destination tags and description; conditional writes guard concurrent changes.
.EXAMPLE
.\Set-AppConfigurationKeyVaultReference.ps1 -TenantId $tenant -SubscriptionId $subscription -TargetResourceId $storeId -Key 'Auth:JWT:Secret' -Label 'PRODUCTION' -VaultResourceId $vaultId -SecretName 'api-jwt' -WhatIf
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
    [string] $VaultResourceId,
    [string] $SecretName,
    [hashtable] $Tags,
    [switch] $NonInteractive
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$quiet = @{ ErrorAction = 'Stop'; WarningAction = 'SilentlyContinue'; InformationAction = 'SilentlyContinue'; Verbose = $false; Debug = $false }
$referenceType = 'application/vnd.microsoft.appconfig.keyvaultref+json;charset=utf-8'

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

function Assert-ResourceId([string] $Id, [string] $Type) {
    if ($Id -notmatch ('^/subscriptions/([^/]+)/resourceGroups/([^/]+)/providers/' + [regex]::Escape($Type) + '/([a-zA-Z0-9-]+)$') -or
        $Matches[1] -ine $SubscriptionId.ToString() -or [WildcardPattern]::ContainsWildcardCharacters($Id)) {
        throw 'TargetScope: supply exact resource IDs of the expected types in the requested subscription.'
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

function Assert-UsableSecret {
    try { $versions = @(Get-AzKeyVaultSecret -VaultName $vault.Name -Name $SecretName -IncludeVersions -DefaultProfile $context @quiet) }
    catch {
        if ((Get-HttpStatus $_) -eq 404) { throw 'SecretMissing: a usable source secret must exist; this task never creates one.' }
        throw 'SecretReadFailed: source-secret version metadata could not be read; no absence was inferred.'
    }
    if (-not $versions.Count) { throw 'SecretMissing: a usable source secret must exist; this task never creates one.' }
    foreach ($version in $versions) {
        if ($version.Name -ine $SecretName -or $version.VaultName -ine $vault.Name -or
            [string]::IsNullOrWhiteSpace($version.Version) -or $version.Created -isnot [datetime]) {
            throw 'SecretUnusable: source-secret version metadata is incomplete or inconsistent.'
        }
    }
    $ordered = @($versions | Sort-Object Created -Descending)
    if ($ordered.Count -gt 1 -and $ordered[0].Created -eq $ordered[1].Created) {
        throw 'SecretUnusable: the latest source version cannot be determined safely.'
    }
    $latest = $ordered[0]
    $now = [datetime]::UtcNow
    if ($latest.Enabled -isnot [bool] -or -not $latest.Enabled -or
        ($null -ne $latest.Expires -and ($latest.Expires -isnot [datetime] -or $latest.Expires.ToUniversalTime() -le $now)) -or
        ($null -ne $latest.NotBefore -and ($latest.NotBefore -isnot [datetime] -or $latest.NotBefore.ToUniversalTime() -gt $now))) {
        throw 'SecretUnusable: the latest source version is disabled, expired, not yet valid, or unreadable.'
    }
}

function Get-CurrentSetting {
    try { $items = @(Get-AzAppConfigurationKeyValue -Endpoint $endpoint -Key $readKey -Label $readLabel -After '' @quiet) }
    catch { throw 'SettingReadFailed: exact key/label state could not be read; no absence was inferred.' }
    if (-not $items.Count) { return $null }
    if ($items.Count -ne 1 -or $items[0].Key -cne $Key -or [string] $items[0].Label -cne $Label -or
        [string]::IsNullOrWhiteSpace($items[0].Etag) -or $items[0].Locked -isnot [bool]) {
        throw 'SettingUnreadable: key/label metadata is incomplete or inconsistent.'
    }
    if ($items[0].Locked) { throw 'SettingLocked: this task never unlocks a setting.' }
    return $items[0]
}

function Test-DesiredState($Current) {
    if ($null -eq $Current -or $Current.ContentType -ine $referenceType) { return $false }
    try {
        $parsed = ConvertFrom-Json -InputObject $Current.Value -AsHashtable -ErrorAction Stop
        $storedUri = $null
        if ($parsed -isnot [Collections.IDictionary] -or $parsed.Keys -cnotcontains 'uri' -or
            $parsed['uri'] -isnot [string] -or -not [uri]::TryCreate($parsed['uri'], [UriKind]::Absolute, [ref] $storedUri) -or
            -not $storedUri.Equals($referenceUri)) { return $false }
    }
    catch { return $false }
    foreach ($name in $Tags.Keys) {
        if ($null -eq $Current.Tag -or -not $Current.Tag.ContainsKey($name) -or $Current.Tag[$name] -cne $Tags[$name]) { return $false }
    }
    return $true
}

function Write-TaskResult([string] $Status) {
    [pscustomobject]@{
        Task = 'Set-AppConfigurationKeyVaultReference'; Status = $Status; Changed = $Status -eq 'Changed'
        TargetResourceId = $target.ResourceId; Subject = "$Key (label=$Label)"
        Fields = [string[]] $(if ($ownsTags) { @('Value', 'ContentType', 'Tags') } else { @('Value', 'ContentType') })
    }
}

if ($TenantId -eq [guid]::Empty -or $SubscriptionId -eq [guid]::Empty -or [string]::IsNullOrWhiteSpace($Key) -or
    -not $PSBoundParameters.ContainsKey('Label') -or $Key -match '[\x00-\x1f\x7f]' -or $Label -match '[\x00-\x1f\x7f]' -or
    $SecretName -notmatch '^[a-zA-Z0-9-]{1,127}$') {
    throw 'InvalidInput: explicit tenant, subscription, key, label, vault ID, and a valid secret name are required.'
}
Assert-ResourceId $VaultResourceId 'Microsoft.KeyVault/vaults'
$ownsTags = $PSBoundParameters.ContainsKey('Tags')
if ($null -eq $Tags) { $Tags = @{} }
foreach ($name in $Tags.Keys) {
    if ($name -isnot [string] -or $Tags[$name] -isnot [string]) { throw 'InvalidInput: tags must map string names to string values.' }
}
try { $null = Get-Command Get-AzContext, Get-AzResource, Get-AzKeyVaultSecret, Get-AzAppConfigurationKeyValue, Set-AzAppConfigurationKeyValue @quiet }
catch { throw 'PrerequisiteMissing: load Az.Accounts, Az.Resources, Az.KeyVault, and data-plane Az.AppConfiguration before invoking this task.' }
if ($PSCmdlet.ParameterSetName -eq 'ById') { Assert-ResourceId $TargetResourceId 'Microsoft.AppConfiguration/configurationStores' }
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
    $vaults = @(Get-AzResource -ResourceId $VaultResourceId -ExpandProperties -DefaultProfile $context @quiet)
}
catch { throw 'TargetReadFailed: the scoped store or source-vault lookup failed; no change was made.' }
if (-not $candidates.Count) { throw 'TargetNotFound: no store matched the explicit scope.' }
foreach ($candidate in $candidates) {
    Assert-ResourceId $candidate.ResourceId 'Microsoft.AppConfiguration/configurationStores'
    if ($candidate.ResourceType -ine 'Microsoft.AppConfiguration/configurationStores') { throw 'TargetScope: the resolved resource is not a store.' }
}
if ($vaults.Count -ne 1 -or $vaults[0].ResourceId -ine $VaultResourceId -or $vaults[0].ResourceType -ine 'Microsoft.KeyVault/vaults') {
    throw 'TargetScope: the source did not resolve to exactly the requested vault.'
}
$vault = $vaults[0]
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
$vaultUri = $null
$vaultSuffix = [string] $context.Environment.AzureKeyVaultDnsSuffix
if ([string]::IsNullOrWhiteSpace($vaultSuffix) -or -not [uri]::TryCreate($vault.Properties.vaultUri, [UriKind]::Absolute, [ref] $vaultUri) -or
    $vaultUri.Scheme -ne 'https' -or -not $vaultUri.IsDefaultPort -or $vaultUri.UserInfo -or $vaultUri.Query -or $vaultUri.Fragment -or
    $vaultUri.AbsolutePath -ne '/' -or $vaultUri.Host -ine ($vault.Name + '.' + $vaultSuffix.TrimStart('.'))) {
    throw 'TargetEndpoint: the source vault URI does not match the current Azure environment.'
}
Assert-UsableSecret
$referenceUri = [uri] ($vaultUri.AbsoluteUri.TrimEnd('/') + '/secrets/' + [uri]::EscapeDataString($SecretName))
$referenceValue = @{ uri = $referenceUri.AbsoluteUri } | ConvertTo-Json -Compress
$readKey = $Key.Replace('\', '\\').Replace('*', '\*').Replace(',', '\,')
$readLabel = if ($Label.Length) { $Label.Replace('\', '\\').Replace('*', '\*').Replace(',', '\,') } else { [string][char] 0 }
$current = Get-CurrentSetting
if (Test-DesiredState $current) { Write-TaskResult 'NoChange'; return }
if ($NonInteractive -and -not $WhatIfPreference -and
    ((Test-AmbientConsentDefault) -or -not $PSBoundParameters.ContainsKey('Confirm') -or [bool] $PSBoundParameters['Confirm'])) {
    throw 'ConfirmationRequired: supply explicit -NonInteractive -Confirm:$false with session consent defaults disabled.'
}
$ConfirmPreference = if ($NonInteractive) { 'None' } else { 'Low' }
$confirmationTarget = "tenant=$TenantId subscription=$SubscriptionId $($target.ResourceId) key=$Key label=$Label source=$($vault.ResourceId) secret=$SecretName"
$approved = $PSCmdlet.ShouldProcess($confirmationTarget, 'Upsert typed versionless Key Vault reference')
if ($approved -and -not $NonInteractive -and $PSBoundParameters.ContainsKey('Confirm') -and -not [bool] $PSBoundParameters['Confirm']) {
    $approved = $PSCmdlet.ShouldContinue("Upsert typed Key Vault reference: $confirmationTarget", 'Confirm task')
}
if (-not $approved) {
    Write-TaskResult $(if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' })
    return
}
$null = Get-VerifiedContext
Assert-UsableSecret
$mergedTags = [hashtable]::new([StringComparer]::Ordinal)
if ($null -ne $current -and $null -ne $current.Tag) {
    foreach ($name in $current.Tag.Keys) { $mergedTags[$name] = $current.Tag[$name] }
}
foreach ($name in $Tags.Keys) { $mergedTags[$name] = $Tags[$name] }
$write = @{ Endpoint = $endpoint; Key = $Key; Value = $referenceValue; ContentType = $referenceType; Tag = $mergedTags; Confirm = $false }
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
    throw 'SettingWriteFailed: the conditional reference write failed; inspect the exact key/label before retrying.'
}
if (-not (Test-DesiredState (Get-CurrentSetting))) { throw 'VerificationFailed: the intended typed reference was not observed after writing.' }
Write-TaskResult 'Changed'
