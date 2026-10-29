#Requires -Version 7.0
<#
.SYNOPSIS
Discovers and deletes one explicitly confirmed Cognitive Services model deployment.
.DESCRIPTION
Preserves all other deployments and the parent account. Never grants management access or purges.
Serialize lifecycle writers: the provider has no atomic snapshot-conditioned delete in this interface.
.EXAMPLE
.\Remove-AiDeployment.ps1 -TenantId $tenant -SubscriptionId $subscription -ResourceGroupName $group -AccountName $account -DeploymentName '*' -WhatIf
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High', DefaultParameterSetName = 'ById')]
[OutputType([pscustomobject])]
param(
    [guid] $TenantId,
    [guid] $SubscriptionId,
    [Parameter(ParameterSetName = 'ById')] [string] $TargetResourceId,
    [Parameter(ParameterSetName = 'ByName')] [string] $ResourceGroupName,
    [Parameter(ParameterSetName = 'ByName')] [string] $AccountName,
    [Parameter(ParameterSetName = 'ByName')] [string] $DeploymentName,
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

function Assert-DeploymentId([string] $Id) {
    if ($Id -notmatch '^/subscriptions/([^/]+)/resourceGroups/([a-zA-Z0-9._()-]+)/providers/Microsoft\.CognitiveServices/accounts/([a-zA-Z0-9][a-zA-Z0-9._-]*)/deployments/([a-zA-Z0-9][a-zA-Z0-9._-]*)$' -or
        $Matches[1] -ine $SubscriptionId.ToString() -or [WildcardPattern]::ContainsWildcardCharacters($Id)) {
        throw 'TargetScope: an exact Cognitive Services deployment ID in the requested subscription is required.'
    }
}

function Get-VerifiedContext {
    try { $current = Get-AzContext @quiet } catch { throw 'ContextUnavailable: authenticate separately before running this task.' }
    if (-not $current -or $current.Tenant.Id -ine $TenantId.ToString() -or $current.Subscription.Id -ine $SubscriptionId.ToString()) {
        throw 'ContextMismatch: the current tenant/subscription must match the explicit inputs.'
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
        $clientClaim = [string] $(if ($claims.ContainsKey('azp')) { $claims['azp'] } else { $claims['appid'] })
        $null = [guid]::TryParse($clientClaim, [ref] $client)
        $actor = [pscustomobject]@{
            Task = 'Remove-AiDeployment'; Phase = 'Discovery'; Environment = $context.Environment.Name
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
        if ([int] $response.StatusCode -ne 200) { throw 'Management read rejected.' }
        return ($response.Content | ConvertFrom-Json -AsHashtable)
    }
    catch {
        if ((Get-HttpStatus $_) -eq 404) { return $null }
        throw 'TargetReadFailed: scoped deployment metadata could not be read; no absence was inferred.'
    }
}

function Get-Snapshot($Deployment) {
    if ($Deployment -isnot [Collections.IDictionary]) { throw 'TargetUnreadable: deployment metadata is incomplete.' }
    Assert-DeploymentId $Deployment['id']
    if ($Deployment['type'] -ine 'Microsoft.CognitiveServices/accounts/deployments' -or
        $Deployment['properties'] -isnot [Collections.IDictionary] -or $Deployment['properties']['model'] -isnot [Collections.IDictionary] -or
        $Deployment['sku'] -isnot [Collections.IDictionary] -or [string]::IsNullOrWhiteSpace([string] $Deployment['sku']['name'])) {
        throw 'TargetUnreadable: actual model and SKU metadata are required.'
    }
    $model = $Deployment['properties']['model']
    if ([string]::IsNullOrWhiteSpace([string] $model['name']) -or $Deployment['properties']['provisioningState'] -cne 'Succeeded') {
        throw 'TargetBusy: complete model metadata and a stable Succeeded deployment are required.'
    }
    return ([ordered]@{
        Id = $Deployment['id']; Etag = $Deployment['etag']; Model = $model['name']; Version = $model['version']; Format = $model['format']
        Sku = $Deployment['sku']['name']; Capacity = $Deployment['sku']['capacity']
        CreatedAt = $(if ($Deployment['systemData'] -is [Collections.IDictionary]) { $Deployment['systemData']['createdAt'] } else { $null })
    } | ConvertTo-Json -Depth 6 -Compress)
}

function Write-TaskResult([string] $Status) {
    [pscustomobject]@{
        Task = 'Remove-AiDeployment'; Status = $Status; Changed = $Status -eq 'Changed'; TargetResourceId = $TargetResourceId
        Subject = ($TargetResourceId -split '/')[-1]; Fields = [string[]] @('Deployment')
    }
}

if ($TenantId -eq [guid]::Empty -or $SubscriptionId -eq [guid]::Empty) { throw 'InvalidInput: explicit tenant and subscription are required.' }
if ($PSCmdlet.ParameterSetName -eq 'ById') { Assert-DeploymentId $TargetResourceId }
else {
    if ($ResourceGroupName -notmatch '^[a-zA-Z0-9._()-]+$' -or $AccountName -notmatch '^[a-zA-Z0-9][a-zA-Z0-9._-]*$' -or
        [string]::IsNullOrWhiteSpace($DeploymentName) -or $DeploymentName -match '[/#%\x00-\x20]' -or
        (-not [WildcardPattern]::ContainsWildcardCharacters($DeploymentName) -and $DeploymentName -notmatch '^[a-zA-Z0-9][a-zA-Z0-9._-]*$')) {
        throw 'TargetScope: supply an exact resource group/account and a deployment name or manual pattern.'
    }
    if ($NonInteractive -and [WildcardPattern]::ContainsWildcardCharacters($DeploymentName)) { throw 'AmbiguousTarget: automation requires an exact deployment name.' }
}
try { $null = Get-Command Get-AzContext, Get-AzAccessToken, Invoke-AzRestMethod @quiet }
catch { throw 'PrerequisiteMissing: load Az.Accounts before invoking this task.' }
$context = Get-VerifiedContext
$actor = Read-Actor
if ($PSCmdlet.ParameterSetName -eq 'ByName') {
    $parentId = "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.CognitiveServices/accounts/$AccountName"
    $path = "$parentId/deployments?api-version=$apiVersion"
    $candidates = [Collections.Generic.List[object]]::new()
    $pages = 0
    do {
        $page = Read-Management $path
        if ($null -eq $page) { break }
        foreach ($item in @($page['value'])) {
            Assert-DeploymentId $item['id']
            if (-not $item['id'].StartsWith($parentId + '/deployments/', [StringComparison]::OrdinalIgnoreCase)) { throw 'TargetScope: inventory escaped the exact account.' }
            if ($item['name'] -like $DeploymentName) { $candidates.Add($item) }
        }
        $path = ''
        if ($page['nextLink']) {
            $next = [uri] $page['nextLink']
            $manager = [uri] $context.Environment.ResourceManagerUrl
            if (-not $next.IsAbsoluteUri -or $next.Scheme -ne 'https' -or $next.Host -ine $manager.Host -or
                $next.UserInfo -or $next.Fragment -or $next.AbsolutePath.TrimEnd('/') -ine "$parentId/deployments") {
                throw 'TargetScope: pagination did not remain on the selected account.'
            }
            $path = $next.PathAndQuery
        }
        $pages++
        if ($pages -gt 100) { throw 'TargetReadFailed: inventory pagination limit reached.' }
    } while ($path)
    if (-not $candidates.Count) {
        if ([WildcardPattern]::ContainsWildcardCharacters($DeploymentName)) { throw 'TargetNotFound: no deployment matched the manual filter.' }
        $TargetResourceId = "$parentId/deployments/$DeploymentName"; Write-TaskResult 'NoChange'; return
    }
    if ($candidates.Count -gt 1) {
        if ($NonInteractive) { throw 'AmbiguousTarget: no unique deployment was resolved.' }
        for ($i = 0; $i -lt $candidates.Count; $i++) {
            Write-Host "$($i + 1): $($candidates[$i]['id']) model=$($candidates[$i]['properties']['model']['name']) SKU=$($candidates[$i]['sku']['name']) capacity=$($candidates[$i]['sku']['capacity'])"
        }
        $selection = 0
        if (-not [int]::TryParse((Read-Host 'Select deployment number'), [ref] $selection) -or $selection -lt 1 -or $selection -gt $candidates.Count) {
            throw 'TargetSelectionDeclined: no exact deployment was selected.'
        }
        $selected = $candidates[$selection - 1]
    }
    else { $selected = $candidates[0] }
    $TargetResourceId = [string] $selected['id']
}
$selected = Read-Management "$TargetResourceId`?api-version=$apiVersion"
if ($null -eq $selected) { Write-TaskResult 'NoChange'; return }
if ($selected['id'] -ine $TargetResourceId) { throw 'TargetScope: resolved deployment differs from the selected exact ID.' }
$snapshot = Get-Snapshot $selected
$model = $selected['properties']['model']
Write-Information -MessageData ([pscustomobject]@{
    Task = 'Remove-AiDeployment'; Phase = 'Selected'; TargetResourceId = $TargetResourceId
    Model = $model['name']; ModelVersion = $model['version']; Sku = $selected['sku']['name']; Capacity = $selected['sku']['capacity']
}) -InformationAction Continue
if ($NonInteractive -and -not $WhatIfPreference -and
    ((Test-AmbientConsentDefault) -or -not $PSBoundParameters.ContainsKey('Confirm') -or [bool] $PSBoundParameters['Confirm'])) {
    throw 'ConfirmationRequired: supply explicit automation consent with session control defaults disabled.'
}
$ConfirmPreference = if ($NonInteractive) { 'None' } else { 'Low' }
$approved = $PSCmdlet.ShouldProcess("tenant=$TenantId subscription=$SubscriptionId $TargetResourceId model=$($model['name']) SKU=$($selected['sku']['name']) capacity=$($selected['sku']['capacity'])", 'Delete exactly this model deployment')
if ($approved -and -not $NonInteractive -and $PSBoundParameters.ContainsKey('Confirm') -and -not [bool] $PSBoundParameters['Confirm']) {
    $approved = $PSCmdlet.ShouldContinue("Delete deployment $TargetResourceId", 'Confirm task')
}
if (-not $approved) { Write-TaskResult $(if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' }); return }
$context = Get-VerifiedContext
$currentActor = Read-Actor
if ($currentActor.ActualPrincipalId -ine $actor.ActualPrincipalId) { throw 'ActorMismatch: the management actor changed after confirmation.' }
$current = Read-Management "$TargetResourceId`?api-version=$apiVersion"
if ($null -eq $current) { Write-TaskResult 'NoChange'; return }
if ((Get-Snapshot $current) -cne $snapshot) { throw 'StateConflict: deployment identity/model/SKU changed; inspect it and confirm a new invocation.' }
try {
    $removed = Invoke-AzRestMethod -Path "$TargetResourceId`?api-version=$apiVersion" -Method DELETE -WaitForCompletion -DefaultProfile $context -Confirm:$false @quiet
    if ([int] $removed.StatusCode -notin 200, 202, 204) { throw 'Delete not accepted.' }
}
catch { throw 'DeleteFailed: exact deployment deletion failed; reconcile its actual state before retrying.' }
$deadline = (Get-Date).AddSeconds($VerificationTimeoutSeconds)
while ($true) {
    $remaining = Read-Management "$TargetResourceId`?api-version=$apiVersion"
    if ($null -eq $remaining) { break }
    if ($remaining['id'] -ine $TargetResourceId -or
        ($selected['systemData'] -is [Collections.IDictionary] -and $remaining['systemData'] -is [Collections.IDictionary] -and
        $selected['systemData']['createdAt'] -cne $remaining['systemData']['createdAt'])) {
        throw 'StateConflict: deployment identity was recreated; no second delete was attempted.'
    }
    if ($remaining['properties']['provisioningState'] -cne 'Deleting' -and (Get-Snapshot $remaining) -cne $snapshot) {
        throw 'StateConflict: deployment changed; no second delete was attempted.'
    }
    if ((Get-Date) -ge $deadline) { throw 'VerificationFailed: deletion did not become observable within the bounded wait.' }
    Start-Sleep -Seconds 2
}
Write-TaskResult 'Changed'
