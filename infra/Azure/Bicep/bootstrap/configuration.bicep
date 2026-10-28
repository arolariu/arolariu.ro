targetScope = 'resourceGroup'

metadata description = 'Populates resolved settings and versionless Key Vault references without rotating existing internal secrets.'

import { identity } from '../types/identity.type.bicep'
import { runtimeConfiguration } from '../types/configuration.type.bicep'
import { createTags } from '../constants/tags.bicep'

@description('The stable deployment resource namespace.')
param resourceConventionPrefix string

@description('The location of the bootstrap execution resource.')
param resourceLocation string

@description('The audit timestamp that starts a new bootstrap attempt.')
param resourceDeploymentDate string

@description('Actual non-secret resource values consumed by the configuration service.')
param configuration runtimeConfiguration

@description('The actual Key Vault URI.')
param keyVaultUri string

@description('The actual App Configuration endpoint.')
param appConfigurationEndpoint string

@description('The permanent, resource-scoped configuration writer.')
param infrastructureManagedIdentity identity

@secure()
@description('The AI account key resolved inside the deployment graph.')
param cognitiveServicesKey string

var labels = ['DEVELOPMENT', 'PRODUCTION']
var staticConfiguration = loadJsonContent('../configuration/appConfiguration.json').items
var runtimeSettings = [
  { key: 'Identity:Tenant:Id', value: configuration.tenantId }
  { key: 'Identity:Subscription:Id', value: configuration.subscriptionId }
  {
    key: 'Endpoints:Database:SQL'
    value: 'Server=tcp:${configuration.sqlServerFqdn},1433;Database=${configuration.sqlDatabaseName};Authentication=Active Directory Managed Identity;User Id=${configuration.backendManagedIdentityClientId};Encrypt=True;TrustServerCertificate=False;'
  }
  { key: 'Endpoints:Database:NoSQL', value: configuration.cosmosEndpoint }
  { key: 'Endpoints:Storage:Blob', value: configuration.blobEndpoint }
  { key: 'Endpoints:Observability:Telemetry', value: configuration.telemetryConnectionString }
  { key: 'Endpoints:AI:OCR', value: configuration.cognitiveServicesEndpoint }
  { key: 'Endpoints:Service:Api', value: configuration.apiUrl }
]
var secretReferences = [
  { key: 'Auth:JWT:Secret', name: 'PRODUCTION-JWT-SECRET', owner: 'internal' }
  { key: 'Auth:Clerk:PublishableKey', name: 'ClerkPublishableKey', owner: 'external' }
  { key: 'Auth:Clerk:SecretKey', name: 'ClerkSecretKey', owner: 'external' }
  { key: 'Communication:Email:ApiKey', name: 'ResendKey', owner: 'external', optional: true }
  { key: 'Endpoints:AI:OCR:Key', name: 'CognitiveServicesKey', owner: 'azure' }
]
var configurationManifest = {
  labels: labels
  settings: runtimeSettings
  references: secretReferences
  defaults: staticConfiguration
}

resource configurationBootstrap 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  name: '${resourceConventionPrefix}-config-bootstrap'
  location: resourceLocation
  kind: 'AzurePowerShell'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${infrastructureManagedIdentity.resourceId}': {}
    }
  }
  tags: createTags('bootstrap', resourceDeploymentDate)
  properties: {
    azPowerShellVersion: '16.2'
    cleanupPreference: 'Always'
    retentionInterval: 'PT1H'
    timeout: 'PT30M'
    forceUpdateTag: resourceDeploymentDate
    environmentVariables: [
      { name: 'AZURE_CLIENT_ID', value: infrastructureManagedIdentity.clientId }
      { name: 'KEY_VAULT_URI', value: keyVaultUri }
      { name: 'APP_CONFIGURATION_ENDPOINT', value: appConfigurationEndpoint }
      { name: 'CONFIGURATION_MANIFEST', value: string(configurationManifest) }
      { name: 'COGNITIVE_SERVICES_KEY', secureValue: cognitiveServicesKey }
    ]
    scriptContent: '''
$ErrorActionPreference = 'Stop'
$VerbosePreference = 'SilentlyContinue'
$DebugPreference = 'SilentlyContinue'
Set-StrictMode -Version Latest
$deadline = (Get-Date).AddMinutes(10)

function Get-HttpFailure($record) {
  $status = 0
  $exception = $record.Exception
  for ($depth = 0; $depth -lt 5 -and $exception; $depth++) {
    $response = $exception.PSObject.Properties['Response']
    if ($response -and $response.Value -and $response.Value.PSObject.Properties['StatusCode']) {
      $status = [int]$response.Value.StatusCode
      break
    }
    $exception = $exception.InnerException
  }
  $code = ''
  if ($record.ErrorDetails -and $record.ErrorDetails.Message) {
    try {
      $payload = ConvertFrom-Json -InputObject $record.ErrorDetails.Message -AsHashtable
      if ($payload.ContainsKey('error') -and $payload.error -is [Collections.IDictionary]) {
        if ($payload.error.ContainsKey('code')) { $code = [string]$payload.error.code }
        if ($payload.error.ContainsKey('innererror') -and $payload.error.innererror.ContainsKey('code')) {
          $code = [string]$payload.error.innererror.code
        }
      }
    } catch { $code = '' }
  }
  return @{status=$status;code=$code}
}

function Invoke-ConfigurationRequest([Uri]$uri, [string]$method, [string]$body = '', [switch]$allowMissing) {
  for ($attempt = 0; $attempt -lt 24; $attempt++) {
    if ((Get-Date) -ge $deadline) { throw 'CONFIG_BOOTSTRAP_DEADLINE_EXCEEDED' }
    try {
      $isVault = $uri.Host -eq $vaultUri.Host
      if (-not $isVault -and $uri.Host -ne $storeUri.Host) { throw 'CONFIG_BOOTSTRAP_INVALID_TARGET' }
      $audience = if ($isVault) { (Get-AzContext).Environment.AzureKeyVaultServiceEndpointResourceId.TrimEnd('/') } else { 'https://azconfig.io' }
      $token = (Get-AzAccessToken -ResourceUrl $audience).Token
      if ($token -is [Security.SecureString]) { $token = ConvertFrom-SecureString -SecureString $token -AsPlainText }
      $request = @{
        Uri = $uri
        Method = $method
        Headers = @{Authorization='Bearer ' + $token}
        TimeoutSec = 30
        ErrorAction = 'Stop'
      }
      if ($method -eq 'Put') {
        $request.Body = $body
        $request.ContentType = if ($isVault) { 'application/json' } else { 'application/vnd.microsoft.appconfig.kv+json' }
      }
      return Invoke-RestMethod @request
    } catch {
      $failure = Get-HttpFailure $_
      if ($allowMissing -and $method -eq 'Get' -and $uri.Host -eq $vaultUri.Host -and $uri.AbsolutePath.StartsWith('/secrets/') -and $failure.status -eq 404) {
        return $null
      }
      $propagation = $failure.status -eq 403 -and $failure.code -in @('ForbiddenByRbac', 'RoleAssignmentNotPropagated')
      $retryable = $propagation -or $failure.status -in @(408, 429, 500, 502, 503, 504)
      if (-not $retryable -or $attempt -eq 23 -or (Get-Date) -ge $deadline) { throw 'CONFIG_BOOTSTRAP_REQUEST_FAILED' }
      Start-Sleep -Seconds ([Math]::Min(30, [Math]::Pow(2, [Math]::Min($attempt + 1, 5))))
    }
  }
  throw 'CONFIG_BOOTSTRAP_RETRY_EXHAUSTED'
}

function Get-Secret([string]$name) {
  $path = 'secrets/' + [Uri]::EscapeDataString($name) + '?api-version=2025-07-01'
  return Invoke-ConfigurationRequest ([Uri]::new($vaultUri, $path)) 'Get' -allowMissing
}

function Set-Secret([string]$name, [string]$value) {
  $path = 'secrets/' + [Uri]::EscapeDataString($name) + '?api-version=2025-07-01'
  $body = ConvertTo-Json -Depth 10 -Compress -InputObject @{value=$value;attributes=@{enabled=$true}}
  Invoke-ConfigurationRequest ([Uri]::new($vaultUri, $path)) 'Put' $body | Out-Null
}

function Set-Configuration([string]$key, [string]$label, [string]$value, [string]$contentType = '', [hashtable]$tags = @{}) {
  $disabledEmail = $key -eq 'Communication:Email:ApiKey' -and $value -ceq '' -and $contentType -eq ''
  if ([string]::IsNullOrWhiteSpace($key) -or $label -notin @('DEVELOPMENT','PRODUCTION') -or ([string]::IsNullOrWhiteSpace($value) -and -not $disabledEmail)) {
    throw 'CONFIG_BOOTSTRAP_INVALID_SETTING'
  }
  $path = 'kv/' + [Uri]::EscapeDataString($key) + '?label=' + [Uri]::EscapeDataString($label) + '&api-version=2026-04-01'
  $body = ConvertTo-Json -Depth 10 -Compress -InputObject @{key=$key;label=$label;value=$value;content_type=$contentType;tags=$tags}
  Invoke-ConfigurationRequest ([Uri]::new($storeUri, $path)) 'Put' $body | Out-Null
}

try {
  try {
    $vaultUri = [Uri]::new($env:KEY_VAULT_URI.TrimEnd('/') + '/', [UriKind]::Absolute)
    $storeUri = [Uri]::new($env:APP_CONFIGURATION_ENDPOINT.TrimEnd('/') + '/', [UriKind]::Absolute)
    $manifest = ConvertFrom-Json -InputObject $env:CONFIGURATION_MANIFEST -AsHashtable
  } catch { throw 'CONFIG_BOOTSTRAP_INVALID_INPUT' }
  foreach ($uri in @($vaultUri, $storeUri)) {
    if ($uri.Scheme -ne 'https' -or $uri.UserInfo -or $uri.Query -or $uri.Fragment -or $uri.AbsolutePath -ne '/') { throw 'CONFIG_BOOTSTRAP_INVALID_ENDPOINT' }
  }
  if ([string]::IsNullOrWhiteSpace($env:COGNITIVE_SERVICES_KEY) -or $manifest.labels.Count -ne 2 -or 'DEVELOPMENT' -notin $manifest.labels -or 'PRODUCTION' -notin $manifest.labels) {
    throw 'CONFIG_BOOTSTRAP_INVALID_INPUT'
  }

  $pending = [Collections.Generic.List[string]]::new()
  $jwtName = ($manifest.references | Where-Object key -EQ 'Auth:JWT:Secret').name
  $jwt = Get-Secret $jwtName
  if ($null -eq $jwt -or $jwt.value -in @('<your-jwt-secret>', '<replace-with-jwt-secret>')) {
    $generated = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(64))
    Set-Secret $jwtName $generated
  } elseif ($jwt.value -isnot [string] -or [string]::IsNullOrWhiteSpace($jwt.value) -or [Text.Encoding]::UTF8.GetByteCount($jwt.value) -lt 32) {
    throw 'CONFIG_BOOTSTRAP_INVALID_EXISTING_JWT'
  }

  foreach ($label in $manifest.labels) {
    $aiName = $label + '-CognitiveServicesKey'
    $ai = Get-Secret $aiName
    if ($null -eq $ai -or $ai.value -cne $env:COGNITIVE_SERVICES_KEY) { Set-Secret $aiName $env:COGNITIVE_SERVICES_KEY }
    foreach ($reference in $manifest.references) {
      $name = if ($reference.owner -eq 'internal') { $reference.name } else { $label + '-' + $reference.name }
      if ($reference.owner -eq 'external') {
        $external = Get-Secret $name
        if ($null -eq $external -or [string]::IsNullOrWhiteSpace($external.value) -or $external.value -match '^<(your|replace-with)-[a-z-]+>$') {
          $pending.Add($name)
          if ($reference.ContainsKey('optional') -and $reference.optional) {
            Set-Configuration $reference.key $label ''
            continue
          }
        }
      }
      $value = ConvertTo-Json -Compress -InputObject @{uri=[Uri]::new($vaultUri, 'secrets/' + [Uri]::EscapeDataString($name)).AbsoluteUri}
      Set-Configuration $reference.key $label $value 'application/vnd.microsoft.appconfig.keyvaultref+json;charset=utf-8'
    }
    foreach ($setting in $manifest.settings) { Set-Configuration $setting.key $label $setting.value }
  }
  foreach ($setting in $manifest.defaults) { Set-Configuration $setting.key $setting.label $setting.value $setting.content_type $setting.tags }
  $DeploymentScriptOutputs = @{completed=$true;pendingExternalSecretNames=@($pending.ToArray())}
} catch {
  $category = $_.Exception.Message
  if ($category -notmatch '^CONFIG_BOOTSTRAP_[A-Z_]+$') { $category = 'CONFIG_BOOTSTRAP_FAILED' }
  throw $category
}
'''
  }
}

output completed bool = bool(configurationBootstrap.properties.outputs.completed)
output pendingExternalSecretNames string[] = array(configurationBootstrap.properties.outputs.pendingExternalSecretNames)
output executionResourceIds string[] = [
  configurationBootstrap.properties.status.containerInstanceId
  configurationBootstrap.properties.status.storageAccountId
]
