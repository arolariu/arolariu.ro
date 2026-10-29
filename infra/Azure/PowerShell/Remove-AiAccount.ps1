#Requires -Version 7.0
<#
.SYNOPSIS
Deletes one explicitly selected empty active Cognitive Services AI account, without purging.
.DESCRIPTION
Blocks remaining model deployments before and after confirmation. Never deletes children, sweeps
a resource group, grants privileges, purges retained accounts, or recovers a deleted account.
.EXAMPLE
.\Remove-AiAccount.ps1 -TenantId $tenant -SubscriptionId $subscription -ResourceGroupName $group -AccountName '*' -WhatIf
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High', DefaultParameterSetName = 'ById')]
[OutputType([pscustomobject])]
param(
    [guid] $TenantId,
    [guid] $SubscriptionId,
    [Parameter(ParameterSetName = 'ById')] [string] $TargetResourceId,
    [Parameter(ParameterSetName = 'ByName')] [string] $ResourceGroupName,
    [Parameter(ParameterSetName = 'ByName')] [string] $AccountName,
    [ValidateRange(1, 1800)] [int] $VerificationTimeoutSeconds = 180,
    [switch] $NonInteractive
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$quiet = @{ ErrorAction = 'Stop'; WarningAction = 'SilentlyContinue'; InformationAction = 'SilentlyContinue'; Verbose = $false; Debug = $false }
$apiVersion = '2024-10-01'

function Get-HttpStatus($Record) {
    $exception = $Record.Exception
    while ($null -ne $exception) {
        if ($exception.PSObject.Properties['StatusCode'] -and $null -ne $exception.StatusCode) { return [int] $exception.StatusCode }
        if ($exception.PSObject.Properties['Response'] -and $null -ne $exception.Response -and $exception.Response.PSObject.Properties['StatusCode']) {
            return [int] $exception.Response.StatusCode
        }
        $exception = $exception.InnerException
    }
    return 0
}

function Test-AmbientConsentDefault {
    if ($null -eq $PSDefaultParameterValues -or
        ($PSDefaultParameterValues['Disabled'] -is [bool] -and $PSDefaultParameterValues['Disabled'])) { return $false }
    foreach ($key in $PSDefaultParameterValues.Keys) {
        $separator = $key.LastIndexOf(':')
        if ($separator -lt 0) { continue }
        $pattern = [WildcardPattern]::new($key.Substring($separator + 1).Trim(), [Management.Automation.WildcardOptions]::IgnoreCase)
        foreach ($control in 'Confirm', 'cf', 'NonInteractive', 'ManageTemporaryAccess', 'ResumeCleanup', 'AcknowledgePermanentDeletion') {
            if ($pattern.IsMatch($control)) { return $true }
        }
    }
    return $false
}

function Assert-AccountId([string] $Id) {
    if ($Id -notmatch '^/subscriptions/([^/]+)/resourceGroups/([a-zA-Z0-9._()-]+)/providers/Microsoft\.CognitiveServices/accounts/([a-zA-Z0-9][a-zA-Z0-9._-]*)$' -or
        $Matches[1] -ine $SubscriptionId.ToString() -or [WildcardPattern]::ContainsWildcardCharacters($Id)) {
        throw 'TargetScope: an exact Cognitive Services account ID in the requested subscription is required.'
    }
}

function Get-VerifiedContext {
    try { $current = Get-AzContext @quiet } catch { throw 'ContextUnavailable: authenticate separately.' }
    if (-not $current -or $current.Tenant.Id -ine $TenantId.ToString() -or $current.Subscription.Id -ine $SubscriptionId.ToString()) {
        throw 'ContextMismatch: current tenant/subscription must match the explicit inputs.'
    }
    return $current
}

function Read-Actor {
    try {
        $token = Get-AzAccessToken -DefaultProfile $context @quiet
        if ($token.Token -isnot [securestring]) { throw 'Unverifiable credential.' }
        $raw = [Net.NetworkCredential]::new('', $token.Token).Password
        $parts = $raw.Split('.')
        if ($parts.Length -ne 3) { throw 'Opaque token.' }
        $payload = $parts[1].Replace('-', '+').Replace('_', '/')
        $claims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload.PadRight($payload.Length + ((4 - $payload.Length % 4) % 4), '='))) | ConvertFrom-Json -AsHashtable
        $id = [guid]::Empty; $client = [guid]::Empty
        if ($claims['tid'] -ine $TenantId.ToString() -or -not [guid]::TryParse([string] $claims['oid'], [ref] $id) -or $id -eq [guid]::Empty) { throw 'Unverifiable actor.' }
        $claim = [string] $(if ($claims.ContainsKey('azp')) { $claims['azp'] } else { $claims['appid'] })
        $null = [guid]::TryParse($claim, [ref] $client)
        $actor = [pscustomobject]@{
            Task = 'Remove-AiAccount'; Phase = 'Discovery'; Environment = $context.Environment.Name
            TenantId = $TenantId.ToString(); SubscriptionId = $SubscriptionId.ToString(); ActualPrincipalId = $id.ToString()
            ActualClientId = $(if ($client -ne [guid]::Empty) { $client.ToString() } else { '' })
            ActorKind = $(if ($claims['idtyp'] -eq 'app' -or $context.Account.Type -in 'ServicePrincipal', 'ManagedService', 'ManagedIdentity') { 'Application' } else { 'User' })
            TargetResourceId = $TargetResourceId
        }
        Write-Information -MessageData $actor -Tags 'AuthContext' -InformationAction Continue
        return $actor
    }
    catch { throw 'ActorUnverifiable: current management principal could not be verified.' }
    finally { $raw = $null; $claims = $null; $token = $null }
}

function Read-Management([string] $Path) {
    try {
        $response = Invoke-AzRestMethod -Path $Path -Method GET -DefaultProfile $context -WhatIf:$false -Confirm:$false @quiet
        if ([int] $response.StatusCode -eq 404) { return $null }
        if ([int] $response.StatusCode -ne 200) { throw 'Read rejected.' }
        return ($response.Content | ConvertFrom-Json -AsHashtable)
    }
    catch {
        if ((Get-HttpStatus $_) -eq 404) { return $null }
        throw 'TargetReadFailed: exact account/deployment inventory could not be read; no absence was inferred.'
    }
}

function Read-Inventory([string] $CollectionId) {
    $path = "$CollectionId`?api-version=$apiVersion"
    $pages = 0
    do {
        $page = Read-Management $path
        if ($null -eq $page) { return }
        foreach ($item in @($page['value'])) {
            if ($item -isnot [Collections.IDictionary] -or -not $item['id'].StartsWith($CollectionId + '/', [StringComparison]::OrdinalIgnoreCase)) {
                throw 'TargetScope: inventory escaped its exact collection.'
            }
            $item
        }
        $path = ''
        if ($page['nextLink']) {
            $next = [uri] $page['nextLink']; $manager = [uri] $context.Environment.ResourceManagerUrl
            if (-not $next.IsAbsoluteUri -or $next.Scheme -ne 'https' -or $next.Host -ine $manager.Host -or $next.UserInfo -or
                $next.Fragment -or $next.AbsolutePath.TrimEnd('/') -ine $CollectionId) { throw 'TargetScope: pagination escaped the selected collection.' }
            $path = $next.PathAndQuery
        }
        $pages++
        if ($pages -gt 100) { throw 'TargetReadFailed: pagination limit reached.' }
    } while ($path)
}

function Get-CreationTime($Account) {
    if ($Account['properties'] -is [Collections.IDictionary] -and $Account['properties']['dateCreated']) { return $Account['properties']['dateCreated'] }
    if ($Account['systemData'] -is [Collections.IDictionary]) { return $Account['systemData']['createdAt'] }
    return $null
}

function Get-Snapshot($Account) {
    if ($Account -isnot [Collections.IDictionary]) { throw 'TargetUnreadable: account metadata is incomplete.' }
    Assert-AccountId $Account['id']
    if ($Account['type'] -ine 'Microsoft.CognitiveServices/accounts' -or $Account['kind'] -cnotin 'OpenAI', 'AIServices', 'CognitiveServices' -or
        [string]::IsNullOrWhiteSpace([string] $Account['location']) -or $Account['properties'] -isnot [Collections.IDictionary] -or
        $Account['properties']['provisioningState'] -cne 'Succeeded') { throw 'TargetUnreadable: a stable supported AI account is required.' }
    $created = Get-CreationTime $Account
    if (-not $created -and -not $Account['etag']) { throw 'TargetUnreadable: no observable creation/ETag identity is available.' }
    return ([ordered]@{
        Id = $Account['id']; Etag = $Account['etag']; Kind = $Account['kind']; Location = $Account['location']; CreatedAt = $created
        Sku = $(if ($Account['sku'] -is [Collections.IDictionary]) { $Account['sku']['name'] } else { '' })
    } | ConvertTo-Json -Compress)
}

function Assert-EmptyAccount {
    if (@(Read-Inventory "$TargetResourceId/deployments").Count) {
        throw 'DeploymentsRemain: delete explicitly selected model deployments first; account deletion never cascades or purges them.'
    }
}

function Write-TaskResult([string] $Status) {
    [pscustomobject]@{
        Task = 'Remove-AiAccount'; Status = $Status; Changed = $Status -eq 'Changed'; TargetResourceId = $TargetResourceId
        Subject = ($TargetResourceId -split '/')[-1]; Fields = [string[]] @('ActiveAccount')
    }
}

if ($TenantId -eq [guid]::Empty -or $SubscriptionId -eq [guid]::Empty) { throw 'InvalidInput: explicit tenant and subscription are required.' }
if ($PSCmdlet.ParameterSetName -eq 'ById') { Assert-AccountId $TargetResourceId }
elseif ($ResourceGroupName -notmatch '^[a-zA-Z0-9._()-]+$' -or [string]::IsNullOrWhiteSpace($AccountName) -or $AccountName -match '[/#%\x00-\x20]') {
    throw 'TargetScope: supply an exact resource group and account name or manual pattern.'
}
if ($NonInteractive -and $PSCmdlet.ParameterSetName -eq 'ByName' -and [WildcardPattern]::ContainsWildcardCharacters($AccountName)) {
    throw 'AmbiguousTarget: automation requires an exact account name or ID.'
}
try { $null = Get-Command Get-AzContext, Get-AzAccessToken, Invoke-AzRestMethod @quiet }
catch { throw 'PrerequisiteMissing: load Az.Accounts before invoking this task.' }
$context = Get-VerifiedContext
$actor = Read-Actor
if ($PSCmdlet.ParameterSetName -eq 'ByName') {
    $collection = "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.CognitiveServices/accounts"
    $candidates = @(Read-Inventory $collection | Where-Object { $_['name'] -like $AccountName })
    if (-not $candidates.Count) {
        if ([WildcardPattern]::ContainsWildcardCharacters($AccountName)) { throw 'TargetNotFound: no active account matched the manual filter.' }
        $TargetResourceId = "$collection/$AccountName"; Assert-AccountId $TargetResourceId; Write-TaskResult 'NoChange'; return
    }
    if ($candidates.Count -gt 1) {
        if ($NonInteractive) { throw 'AmbiguousTarget: no unique account was resolved.' }
        for ($i = 0; $i -lt $candidates.Count; $i++) {
            Write-Host "$($i + 1): $($candidates[$i]['id']) kind=$($candidates[$i]['kind']) location=$($candidates[$i]['location'])"
        }
        $selection = 0
        if (-not [int]::TryParse((Read-Host 'Select active account number'), [ref] $selection) -or $selection -lt 1 -or $selection -gt $candidates.Count) {
            throw 'TargetSelectionDeclined: no exact account was selected.'
        }
        $selected = $candidates[$selection - 1]
    }
    else { $selected = $candidates[0] }
    $TargetResourceId = [string] $selected['id']
}
$selected = Read-Management "$TargetResourceId`?api-version=$apiVersion"
if ($null -eq $selected) { Write-TaskResult 'NoChange'; return }
if ($selected['id'] -ine $TargetResourceId) { throw 'TargetScope: returned account differs from the selected exact ID.' }
$snapshot = Get-Snapshot $selected
Assert-EmptyAccount
Write-Information -MessageData ([pscustomobject]@{
    Task = 'Remove-AiAccount'; Phase = 'Selected'; TargetResourceId = $TargetResourceId; Kind = $selected['kind']; Location = $selected['location']
    Consequence = 'Deleted-account recovery/retained name and permanent purge are separate. Delete deployments first to stop provisioned-model charges.'
}) -InformationAction Continue
if ($NonInteractive -and -not $WhatIfPreference -and
    ((Test-AmbientConsentDefault) -or -not $PSBoundParameters.ContainsKey('Confirm') -or [bool] $PSBoundParameters['Confirm'])) {
    throw 'ConfirmationRequired: supply explicit automation consent with session control defaults disabled.'
}
$ConfirmPreference = if ($NonInteractive) { 'None' } else { 'Low' }
$approved = $PSCmdlet.ShouldProcess("tenant=$TenantId subscription=$SubscriptionId $TargetResourceId kind=$($selected['kind']) location=$($selected['location'])", 'Delete only this empty active AI account; do not purge')
if ($approved -and -not $NonInteractive -and $PSBoundParameters.ContainsKey('Confirm') -and -not [bool] $PSBoundParameters['Confirm']) {
    $approved = $PSCmdlet.ShouldContinue("Delete active account $TargetResourceId; retained-name recovery/purge is separate.", 'Confirm task')
}
if (-not $approved) { Write-TaskResult $(if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' }); return }
$context = Get-VerifiedContext
$currentActor = Read-Actor
if ($currentActor.ActualPrincipalId -ine $actor.ActualPrincipalId) { throw 'ActorMismatch: management actor changed after confirmation.' }
$current = Read-Management "$TargetResourceId`?api-version=$apiVersion"
if ($null -eq $current) { Write-TaskResult 'NoChange'; return }
if ((Get-Snapshot $current) -cne $snapshot) { throw 'StateConflict: account identity/state changed; confirm a new invocation.' }
Assert-EmptyAccount
try {
    $removed = Invoke-AzRestMethod -Path "$TargetResourceId`?api-version=$apiVersion" -Method DELETE -WaitForCompletion -DefaultProfile $context -Confirm:$false @quiet
    if ([int] $removed.StatusCode -notin 200, 202, 204) { throw 'Delete not accepted.' }
}
catch { throw 'DeleteFailed: active account deletion failed; reconcile actual state before retrying.' }
$deadline = (Get-Date).AddSeconds($VerificationTimeoutSeconds)
while ($true) {
    $remaining = Read-Management "$TargetResourceId`?api-version=$apiVersion"
    if ($null -eq $remaining) { break }
    if ($remaining['id'] -ine $TargetResourceId -or (Get-CreationTime $remaining) -cne (Get-CreationTime $selected)) {
        throw 'StateConflict: account was recreated/restored; no second deletion was attempted.'
    }
    if ($remaining['properties']['provisioningState'] -cne 'Deleting' -and (Get-Snapshot $remaining) -cne $snapshot) {
        throw 'StateConflict: active account state changed after deletion; no second deletion was attempted.'
    }
    if ((Get-Date) -ge $deadline) { throw 'VerificationFailed: deletion did not become observable within the bounded wait.' }
    Start-Sleep -Seconds 2
}
Write-TaskResult 'Changed'
