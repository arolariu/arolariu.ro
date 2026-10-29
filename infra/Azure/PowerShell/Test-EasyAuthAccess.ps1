#Requires -Version 7.0
<#
.SYNOPSIS
Verifies ready-host authentication statuses without reading configuration or admin responses.
.DESCRIPTION
Uses the existing actor and an intentionally absent root path. Optional wrong-audience proof requires
an explicitly supplied, current, matching-context v2 token with a verified Entra RSA signature.
Missing or unsuitable negative credentials are NotVerified, never manufactured or fetched implicitly.
.EXAMPLE
.\Test-EasyAuthAccess.ps1 -TenantId $tenant -ExpectedPrincipalId $principalId -ServiceUri $serviceUri -ExpectedApplicationClientId $appId -ExpectedAccess Allowed -WhatIf
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'Low')]
[OutputType([pscustomobject])]
param(
    [guid] $TenantId,
    [guid] $ExpectedPrincipalId,
    [uri] $ServiceUri,
    [guid] $ExpectedApplicationClientId,
    [ValidateSet('Allowed', 'Denied')] [string] $ExpectedAccess = 'Allowed',
    [securestring] $WrongAudienceToken
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$quiet = @{ ErrorAction = 'Stop'; WarningAction = 'SilentlyContinue'; InformationAction = 'SilentlyContinue'; Verbose = $false; Debug = $false }
$checks = @{ Actor = 'Planned'; Readiness = 'Planned'; Unauthenticated = 'Planned'; CurrentActorAccess = 'Planned'; WrongAudience = 'NotVerified' }
$actualPrincipalId = ''
$actualClientId = ''

function Write-ProbeResult([string] $Status) {
    [pscustomobject]@{
        Task = 'Test-EasyAuthAccess'; Status = $Status; Changed = $false; TargetResourceId = $ServiceUri.AbsoluteUri
        Subject = "ExpectedAccess=$ExpectedAccess"; Fields = [string[]] @('Readiness', 'Unauthenticated', 'CurrentActorAccess', 'WrongAudience')
        ActualPrincipalId = $actualPrincipalId; ExpectedPrincipalId = $ExpectedPrincipalId.ToString(); Checks = $checks
    }
}

function ConvertFrom-Base64Url([string] $Value) {
    $value = $Value.Replace('-', '+').Replace('_', '/')
    return ,([Convert]::FromBase64String($value.PadRight($value.Length + ((4 - $value.Length % 4) % 4), '=')))
}

function Read-Jwt([securestring] $Token) {
    try {
        $raw = [Net.NetworkCredential]::new('', $Token).Password
        $parts = $raw.Split('.')
        if ($parts.Length -ne 3) { throw 'Opaque token.' }
        return [pscustomobject]@{
            Parts = $parts
            Header = ([Text.Encoding]::UTF8.GetString((ConvertFrom-Base64Url $parts[0])) | ConvertFrom-Json -AsHashtable)
            Claims = ([Text.Encoding]::UTF8.GetString((ConvertFrom-Base64Url $parts[1])) | ConvertFrom-Json -AsHashtable)
        }
    }
    finally { $raw = $null }
}

function Read-Status([uri] $Uri, [hashtable] $Headers = @{}) {
    try {
        $response = Invoke-WebRequest -Uri $Uri -Method GET -Headers $Headers -MaximumRedirection 0 -TimeoutSec 15 -SkipHttpErrorCheck @quiet
        return [int] $response.StatusCode
    }
    catch { throw 'AuthProbeUnavailable: a bounded, no-redirect status request failed; no alternate target was tried.' }
}

function Test-SuitableWrongAudience {
    $rsa = $null
    try {
        $negative = Read-Jwt $WrongAudienceToken
        $claims = $negative.Claims
        $now = [datetimeoffset]::UtcNow.ToUnixTimeSeconds()
        $client = [string] $(if ($claims.ContainsKey('azp')) { $claims['azp'] } else { $claims['appid'] })
        if ($negative.Header['alg'] -cne 'RS256' -or [string]::IsNullOrWhiteSpace([string] $negative.Header['kid']) -or
            $claims['tid'] -ine $TenantId.ToString() -or $claims['oid'] -ine $actualPrincipalId -or $client -ine $actualClientId -or
            $claims['iss'] -cne $expectedIssuer -or $claims['ver'] -cne '2.0' -or
            -not $claims.ContainsKey('exp') -or [long] $claims['exp'] -le $now -or
            ($claims.ContainsKey('nbf') -and [long] $claims['nbf'] -gt $now) -or
            [string]::IsNullOrWhiteSpace([string] $claims['aud']) -or
            $claims['aud'] -iin $ExpectedApplicationClientId.ToString(), $apiUri) { return $false }
        $keysUri = $cloud.Login + $TenantId.ToString() + '/discovery/v2.0/keys'
        $response = Invoke-WebRequest -Uri $keysUri -Method GET -Headers @{} -MaximumRedirection 0 -TimeoutSec 15 -SkipHttpErrorCheck @quiet
        if ([int] $response.StatusCode -ne 200) { return $false }
        $jwks = $response.Content | ConvertFrom-Json -AsHashtable
        $keys = @($jwks['keys'] | Where-Object { $_['kid'] -ceq $negative.Header['kid'] -and $_['kty'] -ceq 'RSA' -and $_['use'] -ceq 'sig' })
        if ($keys.Count -ne 1) { return $false }
        $key = $keys[0]
        if ($key.ContainsKey('issuer') -and $key['issuer'].Replace('{tenantid}', $TenantId.ToString()) -cne $expectedIssuer) { return $false }
        $parameters = [Security.Cryptography.RSAParameters]::new()
        $parameters.Modulus = ConvertFrom-Base64Url $key['n']
        $parameters.Exponent = ConvertFrom-Base64Url $key['e']
        $rsa = [Security.Cryptography.RSA]::Create()
        $rsa.ImportParameters($parameters)
        return $rsa.VerifyData([Text.Encoding]::UTF8.GetBytes($negative.Parts[0] + '.' + $negative.Parts[1]),
            (ConvertFrom-Base64Url $negative.Parts[2]), [Security.Cryptography.HashAlgorithmName]::SHA256,
            [Security.Cryptography.RSASignaturePadding]::Pkcs1)
    }
    catch { return $false }
    finally {
        if ($null -ne $rsa) { $rsa.Dispose() }
        $negative = $null; $claims = $null
    }
}

if ($TenantId -eq [guid]::Empty -or $ExpectedPrincipalId -eq [guid]::Empty -or $ExpectedApplicationClientId -eq [guid]::Empty) {
    throw 'InvalidInput: explicit tenant, expected caller principal and application client ID are required.'
}
if ($null -eq $ServiceUri -or -not $ServiceUri.IsAbsoluteUri -or $ServiceUri.Scheme -ne 'https' -or -not $ServiceUri.IsDefaultPort -or
    $ServiceUri.UserInfo -or $ServiceUri.Query -or $ServiceUri.Fragment -or $ServiceUri.AbsolutePath -ne '/') {
    throw 'TargetEndpoint: supply one exact trusted service HTTPS root without credentials, path, query or fragment.'
}
try {
    $null = Get-Command Get-AzContext, Get-AzAccessToken, Invoke-WebRequest @quiet
    $context = Get-AzContext @quiet
}
catch { throw 'ContextUnavailable: load Az.Accounts and authenticate separately.' }
if (-not $context -or $context.Tenant.Id -ine $TenantId.ToString()) { throw 'ContextMismatch: current tenant must match the explicit input.' }
$clouds = @{
    AzureCloud = @{ Login = 'https://login.microsoftonline.com/'; SiteSuffix = 'azurewebsites.net' }
    AzureUSGovernment = @{ Login = 'https://login.microsoftonline.us/'; SiteSuffix = 'azurewebsites.us' }
    AzureChinaCloud = @{ Login = 'https://login.chinacloudapi.cn/'; SiteSuffix = 'chinacloudsites.cn' }
}
$cloud = $clouds[[string] $context.Environment.Name]
if ($null -eq $cloud -or ($ServiceUri.Host -notmatch ('^[a-zA-Z0-9-]+\.' + [regex]::Escape($cloud.SiteSuffix) + '$') -and
    -not ($context.Environment.Name -ceq 'AzureCloud' -and $ServiceUri.Host -ieq 'exp.arolariu.ro'))) {
    throw 'TargetEndpoint: only the intended experiments hostname or an explicitly approved current-cloud App Service hostname is supported.'
}
if (-not $PSCmdlet.ShouldProcess("$($ServiceUri.AbsoluteUri) expectedPrincipal=$ExpectedPrincipalId expectedAccess=$ExpectedAccess", 'Probe only readiness and an intentionally nonexistent protected path')) {
    Write-Information -MessageData ([pscustomobject]@{
        Task = 'Test-EasyAuthAccess'; Phase = 'Preview'; Environment = $context.Environment.Name; TenantId = $TenantId.ToString()
        ExpectedPrincipalId = $ExpectedPrincipalId.ToString(); TargetResourceId = $ServiceUri.AbsoluteUri
    }) -Tags 'AuthContext' -InformationAction Continue
    Write-ProbeResult 'WouldRun'
    return
}
$apiUri = 'api://' + $ExpectedApplicationClientId.ToString()
$expectedIssuer = $cloud.Login + $TenantId.ToString() + '/v2.0'
try { $token = Get-AzAccessToken -ResourceUrl $apiUri -DefaultProfile $context @quiet }
catch { throw 'TokenUnavailable: acquiring a service token failed; this is not service denial proof.' }
if ($token.Token -isnot [securestring]) { throw 'ActorUnverifiable: a secure credential is required.' }
try {
    $jwt = Read-Jwt $token.Token
    $claims = $jwt.Claims
    $principal = [guid]::Empty; $client = [guid]::Empty
    if ($claims['tid'] -ine $TenantId.ToString() -or -not [guid]::TryParse([string] $claims['oid'], [ref] $principal) -or $principal -eq [guid]::Empty -or
        $claims['iss'] -cne $expectedIssuer -or $claims['ver'] -cne '2.0' -or
        $claims['aud'] -inotin $ExpectedApplicationClientId.ToString(), $apiUri) { throw 'Unverifiable service credential.' }
    $actualPrincipalId = $principal.ToString()
    $clientClaim = [string] $(if ($claims.ContainsKey('azp')) { $claims['azp'] } else { $claims['appid'] })
    if ([guid]::TryParse($clientClaim, [ref] $client) -and $client -ne [guid]::Empty) { $actualClientId = $client.ToString() }
    $actorKind = if ($claims['idtyp'] -eq 'app' -or $context.Account.Type -in 'ServicePrincipal', 'ManagedService', 'ManagedIdentity') { 'Application' } else { 'User' }
}
catch { throw 'ActorUnverifiable: the trusted credential did not expose a matching tenant, v2 audience and verifiable actor.' }
finally { $jwt = $null; $claims = $null }
Write-Information -MessageData ([pscustomobject]@{
    Task = 'Test-EasyAuthAccess'; Phase = 'Probe'; Environment = $context.Environment.Name; TenantId = $TenantId.ToString(); ActorKind = $actorKind
    ActualPrincipalId = $actualPrincipalId; ActualClientId = $actualClientId; ExpectedPrincipalId = $ExpectedPrincipalId.ToString()
    TargetResourceId = $ServiceUri.AbsoluteUri
}) -Tags 'AuthContext' -InformationAction Continue
if ($actualPrincipalId -ine $ExpectedPrincipalId.ToString()) { throw 'ActorMismatch: the current principal is not the expected existing caller.' }
$checks.Actor = 'Verified'
$protectedUri = [uri]::new($ServiceUri, '/__arolariu-auth-probe-' + [guid]::NewGuid().ToString('N'))
$headers = @{ Authorization = 'Bearer ' + [Net.NetworkCredential]::new('', $token.Token).Password }
$negativeHeaders = $null
try {
    if ((Read-Status ([uri]::new($ServiceUri, '/api/ready'))) -ne 200) { throw 'ApplicationNotReady: a non-secret ready response is required before auth proof.' }
    $checks.Readiness = 'Verified'
    if ((Read-Status $protectedUri) -ne 401) { throw 'AuthEnforcementMissing: the diagnostic path is excluded or unauthenticated access was not rejected.' }
    $checks.Unauthenticated = 'Verified'
    $expectedStatus = if ($ExpectedAccess -eq 'Allowed') { 404 } else { 403 }
    if ((Read-Status $protectedUri $headers) -ne $expectedStatus) {
        throw 'AuthOutcomeMismatch: the actual current caller did not receive the expected protected-path status; no secret route was fetched.'
    }
    $checks.CurrentActorAccess = 'Verified'
    if ($null -ne $WrongAudienceToken) {
        if (Test-SuitableWrongAudience) {
            $negativeHeaders = @{ Authorization = 'Bearer ' + [Net.NetworkCredential]::new('', $WrongAudienceToken).Password }
            if ((Read-Status $protectedUri $negativeHeaders) -ne 401) { throw 'AuthOutcomeMismatch: a suitable signed wrong-audience token was not rejected with 401.' }
            $checks.WrongAudience = 'Verified'
        }
        else { Write-Information 'WrongAudience=NotVerified: no current matching-context token with a verified tenant signature was available.' -InformationAction Continue }
    }
}
finally {
    $headers.Authorization = $null
    if ($null -ne $negativeHeaders) { $negativeHeaders.Authorization = $null }
    $token = $null
}
Write-ProbeResult 'Verified'
