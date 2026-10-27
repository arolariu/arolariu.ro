targetScope = 'resourceGroup'

metadata description = 'Proves SQL, Cosmos, blob, and queue data-plane access using the actual non-administrative backend identity.'

import { identity } from '../types/identity.type.bicep'
import { createTags } from '../constants/tags.bicep'

@description('The stable resource namespace.')
param resourceConventionPrefix string

@description('The location of the access-probe execution resource.')
param resourceLocation string

@description('The audit timestamp that forces a new probe attempt.')
param resourceDeploymentDate string

@description('The backend identity whose actual permissions are tested.')
param backendManagedIdentity identity

@description('The SQL server fully qualified domain name.')
param sqlServerFqdn string

@description('The application database to probe.')
param sqlDatabaseName string

@description('The raw HTTPS Cosmos account endpoint.')
param cosmosEndpoint string

@description('The actual blob service endpoint.')
param blobEndpoint string

@description('The actual queue service endpoint.')
param queueEndpoint string

resource backendAccessProbe 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  name: '${resourceConventionPrefix}-backend-probe'
  location: resourceLocation
  kind: 'AzurePowerShell'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${backendManagedIdentity.resourceId}': {}
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
      { name: 'AZURE_CLIENT_ID', value: backendManagedIdentity.clientId }
      { name: 'SQL_SERVER_FQDN', value: sqlServerFqdn }
      { name: 'SQL_DATABASE_NAME', value: sqlDatabaseName }
      { name: 'BACKEND_USER_NAME', value: backendManagedIdentity.name }
      { name: 'COSMOS_ENDPOINT', value: cosmosEndpoint }
      { name: 'BLOB_ENDPOINT', value: blobEndpoint }
      { name: 'QUEUE_ENDPOINT', value: queueEndpoint }
    ]
    scriptContent: '''
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$deadline = (Get-Date).AddMinutes(10)

function Invoke-CosmosRead([string]$path, [switch]$query) {
  for ($attempt = 0; $attempt -lt 24; $attempt++) {
    if ((Get-Date) -ge $deadline) { throw 'COSMOS_PROBE_DEADLINE_EXCEEDED' }
    try {
      $token = (Get-AzAccessToken -ResourceUrl 'https://cosmos.azure.com/').Token
      if ($token -is [Security.SecureString]) { $token = ConvertFrom-SecureString -SecureString $token -AsPlainText }
      $headers = @{
        authorization = [Uri]::EscapeDataString('type=aad&ver=1.0&sig=' + $token)
        'x-ms-date' = (Get-Date).ToUniversalTime().ToString('r', [Globalization.CultureInfo]::InvariantCulture)
        'x-ms-version' = '2018-12-31'
      }
      $request = @{
        Uri = [Uri]::new($cosmosUri, $path)
        Headers = $headers
        Method = 'Get'
        TimeoutSec = 30
        ErrorAction = 'Stop'
      }
      if ($query) {
        $headers['x-ms-documentdb-isquery'] = 'True'
        $headers['x-ms-documentdb-query-enablecrosspartition'] = 'True'
        $headers['x-ms-max-item-count'] = '1'
        $request.Method = 'Post'
        $request.ContentType = 'application/query+json'
        $request.Body = '{"query":"SELECT TOP 1 c.id FROM c","parameters":[]}'
      }
      return Invoke-RestMethod @request
    } catch {
      $status = 0
      $exception = $_.Exception
      for ($depth = 0; $depth -lt 5 -and $exception; $depth++) {
        $response = $exception.PSObject.Properties['Response']
        if ($response -and $response.Value -and $response.Value.PSObject.Properties['StatusCode']) {
          $status = [int]$response.Value.StatusCode
          break
        }
        $exception = $exception.InnerException
      }
      if ($status -notin @(0, 401, 403, 404, 408, 429, 500, 502, 503, 504) -or $attempt -eq 23 -or (Get-Date) -ge $deadline) {
        throw 'COSMOS_PROBE_REQUEST_FAILED'
      }
      Start-Sleep -Seconds ([Math]::Min(30, [Math]::Pow(2, [Math]::Min($attempt + 1, 5))))
    }
  }
  throw 'COSMOS_PROBE_RETRY_EXHAUSTED'
}

function Invoke-StorageRead([Uri]$uri, [string]$rootElement) {
  for ($attempt = 0; $attempt -lt 24; $attempt++) {
    if ((Get-Date) -ge $deadline) { throw 'STORAGE_PROBE_DEADLINE_EXCEEDED' }
    try {
      $token = (Get-AzAccessToken -ResourceUrl 'https://storage.azure.com/').Token
      if ($token -is [Security.SecureString]) { $token = ConvertFrom-SecureString -SecureString $token -AsPlainText }
      $response = Invoke-WebRequest -Uri $uri -Method Get -Headers @{
        Authorization = 'Bearer ' + $token
        'x-ms-date' = (Get-Date).ToUniversalTime().ToString('r', [Globalization.CultureInfo]::InvariantCulture)
        'x-ms-version' = '2026-10-06'
      } -TimeoutSec 30 -ErrorAction Stop
      if ($response.StatusCode -ne 200) { throw 'STORAGE_PROBE_INVALID_RESPONSE' }
      $document = [Xml.XmlDocument]::new()
      $document.XmlResolver = $null
      $settings = [Xml.XmlReaderSettings]::new()
      $settings.DtdProcessing = [Xml.DtdProcessing]::Prohibit
      $reader = [Xml.XmlReader]::Create([IO.StringReader]::new([string]$response.Content), $settings)
      try { $document.Load($reader) } finally { $reader.Dispose() }
      if ($document.DocumentElement.LocalName -ne $rootElement) { throw 'STORAGE_PROBE_INVALID_RESPONSE' }
      return
    } catch {
      $status = 0
      $exception = $_.Exception
      for ($depth = 0; $depth -lt 5 -and $exception; $depth++) {
        $responseProperty = $exception.PSObject.Properties['Response']
        if ($responseProperty -and $responseProperty.Value -and $responseProperty.Value.PSObject.Properties['StatusCode']) {
          $status = [int]$responseProperty.Value.StatusCode
          break
        }
        $exception = $exception.InnerException
      }
      if ($status -notin @(0, 401, 403, 408, 429, 500, 502, 503, 504) -or $attempt -eq 23 -or (Get-Date) -ge $deadline) {
        throw 'STORAGE_PROBE_REQUEST_FAILED'
      }
      Start-Sleep -Seconds ([Math]::Min(30, [Math]::Pow(2, [Math]::Min($attempt + 1, 5))))
    }
  }
  throw 'STORAGE_PROBE_RETRY_EXHAUSTED'
}

try {
  if ([string]::IsNullOrWhiteSpace($env:SQL_SERVER_FQDN) -or [string]::IsNullOrWhiteSpace($env:SQL_DATABASE_NAME)) {
    throw 'SQL_PROBE_INVALID_INPUT'
  }
  try { $cosmosUri = [Uri]::new($env:COSMOS_ENDPOINT, [UriKind]::Absolute) } catch { throw 'COSMOS_PROBE_INVALID_ENDPOINT' }
  if ($cosmosUri.Scheme -ne 'https' -or $cosmosUri.UserInfo -or $cosmosUri.Query -or $cosmosUri.Fragment -or $cosmosUri.AbsolutePath -ne '/') {
    throw 'COSMOS_PROBE_INVALID_ENDPOINT'
  }
  try {
    $blobUri = [Uri]::new($env:BLOB_ENDPOINT, [UriKind]::Absolute)
    $queueUri = [Uri]::new($env:QUEUE_ENDPOINT, [UriKind]::Absolute)
  } catch { throw 'STORAGE_PROBE_INVALID_ENDPOINT' }
  foreach ($uri in @($blobUri, $queueUri)) {
    if ($uri.Scheme -ne 'https' -or $uri.UserInfo -or $uri.Query -or $uri.Fragment -or $uri.AbsolutePath -ne '/') { throw 'STORAGE_PROBE_INVALID_ENDPOINT' }
  }
  if (-not (Get-Module -ListAvailable -Name SqlServer | Where-Object Version -EQ ([Version]'22.4.5.1'))) {
    Install-Module -Name SqlServer -RequiredVersion '22.4.5.1' -Scope CurrentUser -Repository PSGallery -Force -AllowClobber -AcceptLicense
  }
  Import-Module -Name SqlServer -RequiredVersion '22.4.5.1' -ErrorAction Stop
  $result = @()
  for ($attempt = 0; $attempt -lt 24; $attempt++) {
    if ((Get-Date) -ge $deadline) { throw 'SQL_PROBE_DEADLINE_EXCEEDED' }
    try {
      $resource = 'https://' + (Get-AzContext).Environment.SqlDatabaseDnsSuffix.TrimStart('.') + '/'
      $token = (Get-AzAccessToken -ResourceUrl $resource).Token
      if ($token -is [Security.SecureString]) { $token = ConvertFrom-SecureString -SecureString $token -AsPlainText }
      $query = "SELECT DB_NAME() AS DatabaseName, USER_NAME() AS CurrentUser, IS_ROLEMEMBER('db_owner') AS IsOwner, IS_ROLEMEMBER('db_datareader') AS IsReader, IS_ROLEMEMBER('db_datawriter') AS IsWriter, IS_ROLEMEMBER('db_ddladmin') AS IsDdlAdmin;"
      $result = @(Invoke-Sqlcmd -ServerInstance $env:SQL_SERVER_FQDN -Database $env:SQL_DATABASE_NAME -Query $query -AccessToken $token -ConnectionTimeout 30 -QueryTimeout 60 -ErrorAction Stop)
      break
    } catch {
      if ($attempt -eq 23 -or (Get-Date) -ge $deadline) { throw 'SQL_PROBE_CONNECTION_FAILED' }
      Start-Sleep -Seconds ([Math]::Min(30, [Math]::Pow(2, [Math]::Min($attempt + 1, 5))))
    }
  }
  if ($result.Count -ne 1 -or $result[0].DatabaseName -ne $env:SQL_DATABASE_NAME -or $result[0].CurrentUser -ne $env:BACKEND_USER_NAME -or $result[0].IsOwner -ne 0 -or $result[0].IsReader -ne 1 -or $result[0].IsWriter -ne 1 -or $result[0].IsDdlAdmin -ne 1) {
    throw 'SQL_PROBE_PERMISSIONS_FAILED'
  }
  $account = Invoke-CosmosRead ''
  if (-not $account -or -not $account.PSObject.Properties['id']) { throw 'COSMOS_PROBE_INVALID_RESPONSE' }
  foreach ($container in @('invoices', 'merchants')) {
    $path = 'dbs/primary/colls/' + $container
    $metadata = Invoke-CosmosRead $path
    if (-not $metadata -or $metadata.id -cne $container) { throw 'COSMOS_PROBE_INVALID_RESPONSE' }
    $documents = Invoke-CosmosRead ($path + '/docs') -query
    if (-not $documents -or -not $documents.PSObject.Properties['Documents']) { throw 'COSMOS_PROBE_INVALID_RESPONSE' }
  }
  Invoke-StorageRead ([Uri]::new($blobUri, 'invoices?restype=container&comp=list&maxresults=1')) 'EnumerationResults'
  Invoke-StorageRead ([Uri]::new($queueUri, 'invoice-analysis/messages?peekonly=true&numofmessages=1')) 'QueueMessagesList'
  $DeploymentScriptOutputs = @{ completed = $true }
} catch {
  $category = $_.Exception.Message
  if ($category -notmatch '^(SQL|COSMOS|STORAGE)_PROBE_[A-Z_]+$') { $category = 'BACKEND_PROBE_FAILED' }
  throw $category
}
'''
  }
}

output completed bool = bool(backendAccessProbe.properties.outputs.completed)
output executionResourceIds string[] = [
  backendAccessProbe.properties.status.containerInstanceId
  backendAccessProbe.properties.status.storageAccountId
]
