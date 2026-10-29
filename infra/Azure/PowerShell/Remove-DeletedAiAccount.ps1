#Requires -Version 7.0
<#
.SYNOPSIS
Discovers and permanently purges one explicitly acknowledged retained AI account.
.DESCRIPTION
The original resource group need not exist. Active/recovered accounts are never deleted.
Requires existing subscription-level deleted-account purge authority; never grants it.
.EXAMPLE
.\Remove-DeletedAiAccount.ps1 -TenantId $tenant -SubscriptionId $subscription -ResourceGroupName $originalGroup -Location $region -AccountName '*' -WhatIf
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High', DefaultParameterSetName = 'ById')]
[OutputType([pscustomobject])]
param(
    [guid] $TenantId,
    [guid] $SubscriptionId,
    [Parameter(ParameterSetName = 'ById')] [string] $TargetResourceId,
    [Parameter(ParameterSetName = 'ByName')] [string] $ResourceGroupName,
    [Parameter(ParameterSetName = 'ByName')] [string] $Location,
    [Parameter(ParameterSetName = 'ByName')] [string] $AccountName = '*',
    [string] $AcknowledgePermanentDeletion,
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

function Get-DeletedIdentity([string] $Id, [string] $RecordLocation = '') {
    if ($Id -match '^/subscriptions/([^/]+)/providers/Microsoft\.CognitiveServices/locations/([a-zA-Z0-9]+)/resourceGroups/([a-zA-Z0-9._()-]+)/deletedAccounts/([a-zA-Z0-9][a-zA-Z0-9._-]*)$') {
        $sub = $Matches[1]; $region = $Matches[2].ToLowerInvariant(); $group = $Matches[3]; $name = $Matches[4]
        if ($RecordLocation -and $RecordLocation -ine $region) { throw 'TargetScope: deleted-record region differs from its identity.' }
    }
    elseif ($Id -match '^/subscriptions/([^/]+)/resourceGroups/([a-zA-Z0-9._()-]+)/providers/Microsoft\.CognitiveServices/accounts/([a-zA-Z0-9][a-zA-Z0-9._-]*)$') {
        $sub = $Matches[1]; $group = $Matches[2]; $name = $Matches[3]
        if ($RecordLocation -notmatch '^[a-zA-Z0-9]+$') { throw 'TargetScope: original inventory identity requires a safe location.' }
        $region = $RecordLocation.ToLowerInvariant()
    }
    else { throw 'TargetScope: exact deleted-account identity and original location/group are required.' }
    if ($sub -ine $SubscriptionId.ToString()) { throw 'TargetScope: the deleted account is outside the explicit subscription.' }
    return @{
        Id = "/subscriptions/$SubscriptionId/providers/Microsoft.CognitiveServices/locations/$region/resourceGroups/$group/deletedAccounts/$name"
        ActiveId = "/subscriptions/$SubscriptionId/resourceGroups/$group/providers/Microsoft.CognitiveServices/accounts/$name"
        Location = $region; ResourceGroupName = $group; Name = $name
    }
}

function Get-VerifiedContext {
    try { $current = Get-AzContext @quiet } catch { throw 'ContextUnavailable: authenticate separately.' }
    if (-not $current -or $current.Tenant.Id -ine $TenantId.ToString() -or $current.Subscription.Id -ine $SubscriptionId.ToString()) {
        throw 'ContextMismatch: current tenant/subscription must match explicit inputs.'
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
            Task = 'Remove-DeletedAiAccount'; Phase = 'Discovery'; Environment = $context.Environment.Name
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
        throw 'TargetReadFailed: exact retained/active state could not be read; no absence was inferred.'
    }
}

function Get-Snapshot($Record) {
    if ($Record -isnot [Collections.IDictionary] -or $Record['type'] -ine 'Microsoft.CognitiveServices/accounts' -or
        $Record['kind'] -cnotin 'OpenAI', 'AIServices', 'CognitiveServices' -or $Record['properties'] -isnot [Collections.IDictionary]) {
        throw 'TargetUnreadable: supported retained AI-account metadata is required.'
    }
    $identity = Get-DeletedIdentity $Record['id'] $Record['location']
    if ($identity.Id -ine $TargetResourceId -or $Record['name'] -ine $identity.Name) { throw 'TargetScope: retained identity differs from the selected exact target.' }
    if (-not $Record['properties']['deletionDate'] -and -not $Record['etag']) { throw 'TargetUnreadable: no deletion generation or ETag was observed.' }
    return ([ordered]@{
        Id = $identity.Id; Kind = $Record['kind']; Location = $identity.Location; Etag = $Record['etag']
        DeletedAt = $Record['properties']['deletionDate']; CreatedAt = $Record['properties']['dateCreated']
    } | ConvertTo-Json -Compress)
}

function Assert-NoActiveAccount {
    if ($null -ne (Read-Management "$($identity.ActiveId)?api-version=$apiVersion")) {
        throw 'ActiveAccountExists: an active/recovered account is present; this task never deletes it.'
    }
}

function Write-TaskResult([string] $Status) {
    [pscustomobject]@{
        Task = 'Remove-DeletedAiAccount'; Status = $Status; Changed = $Status -eq 'Changed'; TargetResourceId = $TargetResourceId
        Subject = $identity.Name; Fields = [string[]] @('RetainedAccount')
    }
}

if ($TenantId -eq [guid]::Empty -or $SubscriptionId -eq [guid]::Empty) { throw 'InvalidInput: explicit tenant and subscription are required.' }
if ($PSCmdlet.ParameterSetName -eq 'ById') {
    if ($TargetResourceId -notmatch '/providers/Microsoft\.CognitiveServices/locations/') { throw 'TargetScope: supply the retained resource ID, not an active account ID.' }
    $identity = Get-DeletedIdentity $TargetResourceId
    $TargetResourceId = $identity.Id
}
else {
    if (($ResourceGroupName -and $ResourceGroupName -notmatch '^[a-zA-Z0-9._()-]+$') -or
        ($Location -and $Location -notmatch '^[a-zA-Z0-9]+$') -or [string]::IsNullOrWhiteSpace($AccountName) -or $AccountName -match '[/#%\x00-\x20]') {
        throw 'TargetScope: supply exact original group/location filters and a bounded account name/pattern.'
    }
    if ($NonInteractive) {
        if (-not $ResourceGroupName -or -not $Location -or [WildcardPattern]::ContainsWildcardCharacters($AccountName)) {
            throw 'AmbiguousTarget: automation requires an exact retained ID or original group/location/name tuple.'
        }
        $identity = Get-DeletedIdentity "/subscriptions/$SubscriptionId/providers/Microsoft.CognitiveServices/locations/$Location/resourceGroups/$ResourceGroupName/deletedAccounts/$AccountName"
        $TargetResourceId = $identity.Id
    }
}
try { $null = Get-Command Get-AzContext, Get-AzAccessToken, Invoke-AzRestMethod @quiet }
catch { throw 'PrerequisiteMissing: load Az.Accounts before invoking this task.' }
$context = Get-VerifiedContext
$actor = Read-Actor
if (-not $TargetResourceId) {
    $collection = "/subscriptions/$SubscriptionId/providers/Microsoft.CognitiveServices/deletedAccounts"
    $path = "$collection`?api-version=$apiVersion"; $pages = 0
    $candidates = [Collections.Generic.List[object]]::new()
    do {
        $page = Read-Management $path
        if ($null -eq $page) { break }
        foreach ($record in @($page['value'])) {
            if ($record['kind'] -cnotin 'OpenAI', 'AIServices', 'CognitiveServices') { continue }
            $candidate = Get-DeletedIdentity $record['id'] $record['location']
            if (($ResourceGroupName -and $candidate.ResourceGroupName -ine $ResourceGroupName) -or
                ($Location -and $candidate.Location -ine $Location) -or $candidate.Name -notlike $AccountName) { continue }
            $candidates.Add($candidate)
        }
        $path = ''
        if ($page['nextLink']) {
            $next = [uri] $page['nextLink']; $manager = [uri] $context.Environment.ResourceManagerUrl
            if (-not $next.IsAbsoluteUri -or $next.Scheme -ne 'https' -or $next.Host -ine $manager.Host -or $next.UserInfo -or
                $next.Fragment -or $next.AbsolutePath.TrimEnd('/') -ine $collection) { throw 'TargetScope: pagination escaped the deleted-account inventory.' }
            $path = $next.PathAndQuery
        }
        $pages++
        if ($pages -gt 100) { throw 'TargetReadFailed: inventory pagination limit reached.' }
    } while ($path)
    if (-not $candidates.Count) { throw 'TargetNotFound: no retained AI account matched the manual filters.' }
    for ($i = 0; $i -lt $candidates.Count; $i++) { Write-Host "$($i + 1): $($candidates[$i].Id) original=$($candidates[$i].ActiveId)" }
    $selection = 0
    if (-not [int]::TryParse((Read-Host 'Select retained AI account number'), [ref] $selection) -or $selection -lt 1 -or $selection -gt $candidates.Count) {
        throw 'TargetSelectionDeclined: no exact retained account was selected.'
    }
    $identity = $candidates[$selection - 1]; $TargetResourceId = $identity.Id
}
Assert-NoActiveAccount
$selected = Read-Management "$TargetResourceId`?api-version=$apiVersion"
if ($null -eq $selected) { Write-TaskResult 'NoChange'; return }
$snapshot = Get-Snapshot $selected
Write-Information -MessageData ([pscustomobject]@{
    Task = 'Remove-DeletedAiAccount'; Phase = 'Selected'; TargetResourceId = $TargetResourceId; OriginalResourceId = $identity.ActiveId
    Location = $identity.Location; DeletedAt = $selected['properties']['deletionDate']; Kind = $selected['kind']
    Consequence = 'Permanent and irreversible; recovery becomes impossible. Provisioned deployment charges may continue until purge.'
}) -InformationAction Continue
if (-not $WhatIfPreference -and ((Test-AmbientConsentDefault) -or ($NonInteractive -and
    (-not $PSBoundParameters.ContainsKey('Confirm') -or [bool] $PSBoundParameters['Confirm'])))) {
    throw 'ConfirmationRequired: purge requires invocation-level consent with session control defaults disabled.'
}
$ConfirmPreference = if ($NonInteractive) { 'None' } else { 'Low' }
$approved = $PSCmdlet.ShouldProcess("tenant=$TenantId subscription=$SubscriptionId $TargetResourceId", 'Permanently purge exactly this retained AI account')
if ($approved -and -not $NonInteractive -and $PSBoundParameters.ContainsKey('Confirm') -and -not [bool] $PSBoundParameters['Confirm']) {
    $approved = $PSCmdlet.ShouldContinue("Permanently purge $TargetResourceId; this cannot be undone.", 'Confirm irreversible task')
}
if (-not $approved) { Write-TaskResult $(if ($WhatIfPreference) { 'WouldChange' } else { 'Declined' }); return }
if (-not $NonInteractive -and -not $PSBoundParameters.ContainsKey('AcknowledgePermanentDeletion')) {
    $AcknowledgePermanentDeletion = Read-Host "Type the exact retained ID to acknowledge permanent deletion: $TargetResourceId"
}
if (($NonInteractive -and -not $PSBoundParameters.ContainsKey('AcknowledgePermanentDeletion')) -or $AcknowledgePermanentDeletion -cne $TargetResourceId) {
    throw 'PurgeAcknowledgementRequired: explicitly acknowledge the exact canonical retained resource ID.'
}
$context = Get-VerifiedContext
$currentActor = Read-Actor
if ($currentActor.ActualPrincipalId -ine $actor.ActualPrincipalId) { throw 'ActorMismatch: management actor changed after confirmation.' }
$current = Read-Management "$TargetResourceId`?api-version=$apiVersion"
if ($null -eq $current) { Write-TaskResult 'NoChange'; return }
if ((Get-Snapshot $current) -cne $snapshot) { throw 'StateConflict: deletion generation changed; confirm a new invocation.' }
Assert-NoActiveAccount
try {
    $removed = Invoke-AzRestMethod -Path "$TargetResourceId`?api-version=$apiVersion" -Method DELETE -WaitForCompletion -DefaultProfile $context -Confirm:$false @quiet
    if ([int] $removed.StatusCode -notin 200, 202, 204) { throw 'Purge not accepted.' }
}
catch {
    if ((Get-HttpStatus $_) -eq 403) { throw 'PurgeAuthorityRequired: existing subscription-level Microsoft.CognitiveServices/locations/resourceGroups/deletedAccounts/delete authority is required; no broad role was granted.' }
    throw 'PurgeFailed: exact retained-account purge failed; reconcile state before retrying.'
}
$deadline = (Get-Date).AddSeconds($VerificationTimeoutSeconds)
while ($true) {
    $remaining = Read-Management "$TargetResourceId`?api-version=$apiVersion"
    if ($null -eq $remaining) { break }
    if ((Get-Snapshot $remaining) -cne $snapshot) { throw 'StateConflict: retained generation changed after purge; no second purge was attempted.' }
    if ((Get-Date) -ge $deadline) { throw 'VerificationFailed: purge did not become observable within the bounded wait.' }
    Start-Sleep -Seconds 2
}
Write-TaskResult 'Changed'
