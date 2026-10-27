targetScope = 'resourceGroup'

metadata description = 'Checks public delegation, current parent DS, and managed records before domain completion.'

import { identity } from '../types/identity.type.bicep'
import { dnsReadinessManifest } from '../types/dns.type.bicep'
import { createTags } from '../constants/tags.bicep'

@description('The stable deployment namespace.')
param resourceConventionPrefix string

@description('The execution resource location.')
param resourceLocation string

@description('The audit timestamp that starts a new readiness attempt.')
param resourceDeploymentDate string

@description('The permanent infrastructure identity attached to the execution resource.')
param infrastructureManagedIdentity identity

@description('Expected public DNS names, types, delegation, and values. Values never leave the execution container.')
param expectedRecords dnsReadinessManifest

resource dnsReadiness 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  name: '${resourceConventionPrefix}-dns-readiness'
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
    timeout: 'PT20M'
    forceUpdateTag: resourceDeploymentDate
    environmentVariables: [
      { name: 'AZURE_CLIENT_ID', value: infrastructureManagedIdentity.clientId }
      { name: 'DNS_EXPECTATIONS', value: string(expectedRecords) }
    ]
    scriptContent: '''
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$deadline = (Get-Date).AddMinutes(15)
$types = @{A=1;NS=2;CNAME=5;TXT=16;DS=43}

function Normalize-DnsValue([string]$value, [string]$type) {
  $value = $value.Trim()
  if ($type -in @('NS','CNAME')) { return $value.TrimEnd('.').ToLowerInvariant() }
  if ($type -eq 'TXT') { return $value.Trim('"') }
  if ($type -eq 'DS') { return ($value -replace '\s+', ' ').ToUpperInvariant() }
  return $value
}

function Get-PublicDns([string]$name, [string]$type) {
  if ((Get-Date) -ge $deadline) { throw 'DNS_NOT_READY' }
  $uri = 'https://cloudflare-dns.com/dns-query?name=' + [Uri]::EscapeDataString($name) + '&type=' + [Uri]::EscapeDataString($type) + '&cd=false'
  try {
    $reply = Invoke-RestMethod -Uri $uri -Method Get -Headers @{Accept='application/dns-json'} -TimeoutSec 10 -ErrorAction Stop
  } catch { throw 'DNS_RESOLVER_UNAVAILABLE' }
  if (-not $reply -or -not $reply.PSObject.Properties['Status'] -or ($reply.Status -isnot [int] -and $reply.Status -isnot [long]) -or $reply.Status -lt 0 -or $reply.Status -gt 15) {
    throw 'DNS_RESOLVER_UNAVAILABLE'
  }
  if ($reply.Status -ne 0) { return @() }
  if (-not $reply.PSObject.Properties['Answer']) { return @() }
  if ($reply.Answer -isnot [Array]) { throw 'DNS_RESOLVER_UNAVAILABLE' }
  $values = [Collections.Generic.List[string]]::new()
  foreach ($answer in $reply.Answer) {
    if (-not $answer.PSObject.Properties['type'] -or -not $answer.PSObject.Properties['data'] -or ($answer.type -isnot [int] -and $answer.type -isnot [long]) -or $answer.data -isnot [string] -or [string]::IsNullOrWhiteSpace($answer.data)) {
      throw 'DNS_RESOLVER_UNAVAILABLE'
    }
    if ($answer.type -eq $types[$type]) {
      if ($type -eq 'A') {
        $address = $null
        if (-not [Net.IPAddress]::TryParse($answer.data, [ref]$address) -or $address.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork) {
          throw 'DNS_RESOLVER_UNAVAILABLE'
        }
      }
      $values.Add((Normalize-DnsValue $answer.data $type))
    }
  }
  return @($values.ToArray())
}

try {
  try { $manifest = ConvertFrom-Json -InputObject $env:DNS_EXPECTATIONS -AsHashtable } catch { throw 'DNS_INVALID_INPUT' }
  $zoneName = Normalize-DnsValue $manifest.zoneName 'NS'
  if ($zoneName -notmatch '^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]+$' -or $manifest.authoritativeNameServers.Count -eq 0 -or $manifest.records.Count -eq 0) {
    throw 'DNS_INVALID_INPUT'
  }
  $expectedNs = @($manifest.authoritativeNameServers | ForEach-Object { Normalize-DnsValue $_ 'NS' } | Sort-Object -Unique)
  $hasDs = $false
  foreach ($record in $manifest.records) {
    $name = Normalize-DnsValue $record.name 'NS'
    if (($name -ne $zoneName -and -not $name.EndsWith('.' + $zoneName)) -or $record.type -notin @('A','CNAME','TXT','DS')) { throw 'DNS_INVALID_INPUT' }
    if ($record.expectedValues.Count -eq 0 -and -not ($record.type -eq 'A' -and $name -eq $zoneName)) { throw 'DNS_INVALID_INPUT' }
    if ($record.type -eq 'DS' -and $name -eq $zoneName -and $record.expectedValues.Count -gt 0) { $hasDs = $true }
  }
  if (-not $hasDs) { throw 'DNS_INVALID_INPUT' }

  $failure = 'DNS_NOT_READY'
  $verified = $false
  for ($attempt = 0; $attempt -lt 32 -and (Get-Date) -lt $deadline; $attempt++) {
    try {
      $actualNs = @(Get-PublicDns $zoneName 'NS' | Sort-Object -Unique)
      $ready = ($actualNs -join '|') -ceq ($expectedNs -join '|')
      foreach ($record in $manifest.records) {
        if (-not $ready) { break }
        $actual = @(Get-PublicDns $record.name $record.type)
        $expected = @($record.expectedValues | ForEach-Object { Normalize-DnsValue $_ $record.type })
        if ($record.type -eq 'DS') {
          $ready = @($expected | Where-Object { $_ -cin $actual }).Count -gt 0
        } elseif ($expected.Count -eq 0) {
          $ready = $actual.Count -gt 0
        } else {
          $ready = @($expected | Where-Object { $_ -cnotin $actual }).Count -eq 0
        }
      }
      if ($ready) { $verified = $true; break }
      $failure = 'DNS_NOT_READY'
    } catch {
      $failure = if ($_.Exception.Message -eq 'DNS_RESOLVER_UNAVAILABLE') { 'DNS_RESOLVER_UNAVAILABLE' } else { 'DNS_NOT_READY' }
    }
    if ($attempt -lt 31 -and (Get-Date) -lt $deadline) {
      $remaining = [Math]::Max(0, [Math]::Floor(($deadline - (Get-Date)).TotalSeconds))
      $delay = [Math]::Min($remaining, [Math]::Min(30, [Math]::Pow(2, [Math]::Min($attempt + 1, 5))))
      if ($delay -gt 0) { Start-Sleep -Seconds $delay }
    }
  }
  if (-not $verified) { throw $failure }
  $DeploymentScriptOutputs = @{completed=$true}
} catch {
  $category = $_.Exception.Message
  if ($category -notin @('DNS_NOT_READY','DNS_RESOLVER_UNAVAILABLE','DNS_INVALID_INPUT')) { $category = 'DNS_INVALID_INPUT' }
  throw $category
}
'''
  }
}

output completed bool = bool(dnsReadiness.properties.outputs.completed)
output executionResourceIds string[] = [
  dnsReadiness.properties.status.containerInstanceId
  dnsReadiness.properties.status.storageAccountId
]
