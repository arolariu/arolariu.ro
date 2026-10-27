targetScope = 'resourceGroup'

metadata description = 'Proves database access using the actual non-administrative backend identity.'

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
    ]
    scriptContent: '''
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$deadline = (Get-Date).AddMinutes(10)
try {
  if ([string]::IsNullOrWhiteSpace($env:SQL_SERVER_FQDN) -or [string]::IsNullOrWhiteSpace($env:SQL_DATABASE_NAME)) {
    throw 'SQL_PROBE_INVALID_INPUT'
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
  $DeploymentScriptOutputs = @{ completed = $true }
} catch {
  $category = $_.Exception.Message
  if ($category -notmatch '^SQL_PROBE_[A-Z_]+$') { $category = 'SQL_PROBE_FAILED' }
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
