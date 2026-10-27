targetScope = 'resourceGroup'

metadata description = 'Creates identity-bound SQL database users and grants the backend its database permissions.'

import { identity } from '../types/identity.type.bicep'
import { createTags } from '../constants/tags.bicep'

@description('The stable deployment resource namespace.')
param resourceConventionPrefix string

@description('The location of the bootstrap execution resource.')
param resourceLocation string

@description('The audit timestamp that starts a new bootstrap attempt.')
param resourceDeploymentDate string

@description('The real SQL server fully qualified domain name.')
param sqlServerFqdn string

@description('The application databases receiving the backend contained user.')
param sqlDatabaseNames string[]

@description('The backend identity receiving contained database permissions.')
param backendManagedIdentity identity

@description('The permanent SQL administrator used for deployment operations.')
param infrastructureManagedIdentity identity

resource sqlBootstrap 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  name: '${resourceConventionPrefix}-sql-bootstrap'
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
      { name: 'SQL_SERVER_FQDN', value: sqlServerFqdn }
      { name: 'SQL_DATABASE_NAMES', value: string(sqlDatabaseNames) }
      { name: 'BACKEND_USER_NAME', value: backendManagedIdentity.name }
      { name: 'BACKEND_CLIENT_ID', value: backendManagedIdentity.clientId }
      { name: 'BACKEND_PRINCIPAL_ID', value: backendManagedIdentity.principalId }
    ]
    scriptContent: '''
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$deadline = (Get-Date).AddMinutes(10)

function Get-SqlErrorNumber($exception) {
  for ($depth = 0; $depth -lt 5 -and $exception; $depth++) {
    $number = $exception.PSObject.Properties['Number']
    if ($number) { return [int]$number.Value }
    $exception = $exception.InnerException
  }
  return $null
}

function Invoke-DatabaseQuery([string]$database, [string]$query) {
  for ($attempt = 0; $attempt -lt 24; $attempt++) {
    if ((Get-Date) -ge $deadline) { throw 'SQL_BOOTSTRAP_DEADLINE_EXCEEDED' }
    try {
      $resource = 'https://' + (Get-AzContext).Environment.SqlDatabaseDnsSuffix.TrimStart('.') + '/'
      $token = (Get-AzAccessToken -ResourceUrl $resource).Token
      if ($token -is [Security.SecureString]) {
        $token = ConvertFrom-SecureString -SecureString $token -AsPlainText
      }
      return Invoke-Sqlcmd -ServerInstance $env:SQL_SERVER_FQDN -Database $database -Query $query -AccessToken $token -ConnectionTimeout 30 -QueryTimeout 60 -ErrorAction Stop
    } catch {
      $number = Get-SqlErrorNumber $_.Exception
      $retryable = $null -ne $number -and $number -in @(-2, 4060, 10928, 10929, 18456, 40197, 40501, 40613, 49918, 49919, 49920)
      if (-not $retryable -or $attempt -eq 23 -or (Get-Date) -ge $deadline) {
        throw 'SQL_BOOTSTRAP_QUERY_FAILED'
      }
      Start-Sleep -Seconds ([Math]::Min(30, [Math]::Pow(2, [Math]::Min($attempt + 1, 5))))
    }
  }
  throw 'SQL_BOOTSTRAP_RETRY_EXHAUSTED'
}

try {
  if ([string]::IsNullOrWhiteSpace($env:SQL_SERVER_FQDN) -or [string]::IsNullOrWhiteSpace($env:BACKEND_USER_NAME) -or $env:BACKEND_USER_NAME.Length -gt 128) {
    throw 'SQL_BOOTSTRAP_INVALID_INPUT'
  }
  try { $clientId = [Guid]::ParseExact($env:BACKEND_CLIENT_ID, 'D') } catch { throw 'SQL_BOOTSTRAP_INVALID_ID' }
  $databases = @($env:SQL_DATABASE_NAMES | ConvertFrom-Json)
  if ($databases.Count -eq 0) { throw 'SQL_BOOTSTRAP_INVALID_INPUT' }

  if (-not (Get-Module -ListAvailable -Name SqlServer | Where-Object Version -EQ ([Version]'22.4.5.1'))) {
    Install-Module -Name SqlServer -RequiredVersion '22.4.5.1' -Scope CurrentUser -Repository PSGallery -Force -AllowClobber -AcceptLicense
  }
  Import-Module -Name SqlServer -RequiredVersion '22.4.5.1' -ErrorAction Stop

  $sid = '0x' + [Convert]::ToHexString($clientId.ToByteArray())
  $identifier = $env:BACKEND_USER_NAME.Replace(']', ']]')
  $literal = $env:BACKEND_USER_NAME.Replace("'", "''")
  foreach ($database in $databases) {
    if ([string]::IsNullOrWhiteSpace($database) -or $database.Length -gt 128) { throw 'SQL_BOOTSTRAP_INVALID_INPUT' }
    $existing = @(Invoke-DatabaseQuery $database "SELECT CONVERT(VARCHAR(34), sid, 1) AS PrincipalSid FROM sys.database_principals WHERE name = N'$literal';")
    if ($existing.Count -gt 1) { throw 'SQL_BOOTSTRAP_IDENTITY_MISMATCH' }
    if ($existing.Count -eq 1) {
      if ($existing[0].PrincipalSid -ine $sid) { throw 'SQL_BOOTSTRAP_IDENTITY_MISMATCH' }
    } else {
      Invoke-DatabaseQuery $database "CREATE USER [$identifier] WITH SID = $sid, TYPE = E;" | Out-Null
    }
    foreach ($role in @('db_datareader', 'db_datawriter', 'db_ddladmin')) {
      Invoke-DatabaseQuery $database "IF IS_ROLEMEMBER(N'$role', N'$literal') = 0 ALTER ROLE [$role] ADD MEMBER [$identifier];" | Out-Null
    }
  }
  $DeploymentScriptOutputs = @{ completed = $true }
} catch {
  $category = $_.Exception.Message
  if ($category -notmatch '^SQL_BOOTSTRAP_[A-Z_]+$') { $category = 'SQL_BOOTSTRAP_FAILED' }
  throw $category
}
'''
  }
}

output completed bool = bool(sqlBootstrap.properties.outputs.completed)
output executionResourceIds string[] = [
  sqlBootstrap.properties.status.containerInstanceId
  sqlBootstrap.properties.status.storageAccountId
]
