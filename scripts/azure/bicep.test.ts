// @vitest-environment node
/**
 * @fileoverview Compiled deployment contracts for the Azure infrastructure.
 * @module scripts/azure/bicep.test
 */

import {spawnSync} from "node:child_process";
import {existsSync} from "node:fs";
import {homedir} from "node:os";
import {join, resolve} from "node:path";
import {describe, expect, it} from "vitest";

interface CompiledResource {
  readonly [property: string]: unknown;
  readonly type: string;
  readonly apiVersion?: string;
  readonly name?: string;
  readonly condition?: string | boolean;
  readonly dependsOn?: readonly string[];
  readonly properties?: Readonly<Record<string, unknown>>;
}

interface CompiledTemplate {
  readonly resources: Readonly<Record<string, CompiledResource>>;
  readonly parameters?: Readonly<Record<string, unknown>>;
  readonly variables?: Readonly<Record<string, unknown>>;
  readonly outputs?: Readonly<Record<string, unknown>>;
}

const repositoryRoot = resolve(import.meta.dirname, "..", "..");
const templates = new Map<string, CompiledTemplate>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isResource(value: unknown): value is CompiledResource {
  return (
    isRecord(value)
    && typeof value["type"] === "string"
    && (value["apiVersion"] === undefined || typeof value["apiVersion"] === "string")
    && (value["name"] === undefined || typeof value["name"] === "string")
    && (value["condition"] === undefined || typeof value["condition"] === "string" || typeof value["condition"] === "boolean")
    && (value["properties"] === undefined || isRecord(value["properties"]))
    && (value["dependsOn"] === undefined
      || (Array.isArray(value["dependsOn"]) && value["dependsOn"].every((dependency: unknown) => typeof dependency === "string")))
  );
}

function parseTemplate(value: unknown): CompiledTemplate {
  if (!isRecord(value) || !isRecord(value["resources"])) {
    throw new Error("Bicep must produce a symbolic resource dictionary.");
  }

  const resources: Record<string, CompiledResource> = {};
  for (const [symbol, resource] of Object.entries(value["resources"])) {
    if (!isResource(resource)) throw new Error(`Invalid compiled resource: ${symbol}.`);
    resources[symbol] = resource;
  }

  for (const property of ["parameters", "variables", "outputs"]) {
    if (value[property] !== undefined && !isRecord(value[property])) {
      throw new Error(`Invalid compiled template property: ${property}.`);
    }
  }

  return {
    resources,
    ...(isRecord(value["parameters"]) ? {parameters: value["parameters"]} : {}),
    ...(isRecord(value["variables"]) ? {variables: value["variables"]} : {}),
    ...(isRecord(value["outputs"]) ? {outputs: value["outputs"]} : {}),
  };
}

function compileTemplate(relativePath: string): CompiledTemplate {
  const path = resolve(repositoryRoot, relativePath);
  const cached = templates.get(path);
  if (cached) return cached;

  const managedBinary = join(homedir(), ".azure", "bin", process.platform === "win32" ? "bicep.exe" : "bicep");
  const binary = process.env["BICEP_CLI_PATH"]?.trim() || (existsSync(managedBinary) ? managedBinary : "bicep");
  const result = spawnSync(binary, ["build", path, "--no-restore", "--stdout"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 40 * 1024 * 1024,
  });

  if (result.error) throw new Error(`The installed Bicep compiler is required: ${result.error.message}`);
  if (result.status !== 0 || /BCP081/u.test(result.stderr)) {
    throw new Error(`Bicep compilation failed for ${relativePath}:\n${result.stderr}`);
  }

  const parsed: unknown = JSON.parse(result.stdout);
  const template = parseTemplate(parsed);
  templates.set(path, template);
  return template;
}

function moduleTemplate(template: CompiledTemplate, symbolicName: string): CompiledTemplate {
  const module = template.resources[symbolicName];
  if (module?.type !== "Microsoft.Resources/deployments") {
    throw new Error(`Missing compiled deployment module: ${symbolicName}.`);
  }
  return parseTemplate(module.properties?.["template"]);
}

function moduleParameters(template: CompiledTemplate, symbolicName: string): Readonly<Record<string, unknown>> {
  const parameters = template.resources[symbolicName]?.properties?.["parameters"];
  if (!isRecord(parameters)) throw new Error(`Missing compiled module parameters: ${symbolicName}.`);

  const values: Record<string, unknown> = {};
  for (const [name, parameter] of Object.entries(parameters)) {
    if (!isRecord(parameter) || !Object.hasOwn(parameter, "value")) {
      throw new Error(`Invalid compiled module parameter: ${symbolicName}.${name}.`);
    }
    values[name] = parameter["value"];
  }
  return values;
}

function resourcesOfType(template: CompiledTemplate, type: string): readonly CompiledResource[] {
  const matches: CompiledResource[] = [];
  for (const resource of Object.values(template.resources)) {
    const resourceType = resource.type.split("@")[0]?.toLowerCase();
    if (resourceType === type.toLowerCase()) matches.push(resource);
    if (resource.type === "Microsoft.Resources/deployments" && isRecord(resource.properties?.["template"])) {
      matches.push(...resourcesOfType(parseTemplate(resource.properties["template"]), type));
    }
  }
  return matches;
}

function literalVariable(template: CompiledTemplate, name: string): unknown {
  const value = template.variables?.[name];
  if (typeof value !== "string") return value;
  const reference = /^\[variables\('([^']+)'\)\.([A-Za-z_$][A-Za-z0-9_$]*)\]$/u.exec(value);
  if (!reference) return value;
  const target = template.variables?.[reference[1] ?? ""];
  if (!isRecord(target)) throw new Error(`Missing compiled literal for ${name}.`);
  return target[reference[2] ?? ""];
}

type EnvironmentFixture = Readonly<Record<string, string>>;
type HttpFault = Readonly<{status: number; code: string; attempts: number; body?: string}>;
type ScriptScenario =
  | Readonly<{kind: "sql"; environment: EnvironmentFixture; existingUserSid: string | null; queryError?: string; queryErrorNumber?: number}>
  | Readonly<{kind: "probe"; environment: EnvironmentFixture; queryError?: string; httpFault?: HttpFault}>
  | Readonly<{kind: "configuration"; environment: EnvironmentFixture; secrets: Readonly<Record<string, string>>; httpFault?: HttpFault}>;

interface ScriptOperation {
  readonly kind: "sql" | "http" | "secret-write" | "config-write" | "token" | "module-install" | "sleep";
  readonly target: string;
  readonly value?: string;
  readonly length?: number;
}

interface ScriptRunResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly outputs: Readonly<Record<string, unknown>>;
  readonly operations: readonly ScriptOperation[];
}

function scenario<K extends ScriptScenario["kind"]>(kind: K): Extract<ScriptScenario, {kind: K}> {
  const environment = {
    SQL_SERVER_FQDN: "sql.example.test",
    SQL_DATABASE_NAMES: '["primary-app"]',
    SQL_DATABASE_NAME: "primary-app",
    BACKEND_USER_NAME: "backend",
    BACKEND_CLIENT_ID: "11111111-1111-4111-8111-111111111111",
    BACKEND_PRINCIPAL_ID: "22222222-2222-4222-8222-222222222222",
    COSMOS_ENDPOINT: "https://cosmos.example.test/",
    AZURE_CLIENT_ID: kind === "probe" ? "11111111-1111-4111-8111-111111111111" : "33333333-3333-4333-8333-333333333333",
  };
  const scenarios: {[Key in ScriptScenario["kind"]]: Extract<ScriptScenario, {kind: Key}>} = {
    sql: {kind: "sql", environment, existingUserSid: null},
    probe: {kind: "probe", environment},
    get configuration(): Extract<ScriptScenario, {kind: "configuration"}> {
      const template = compileTemplate(String.raw`infra\Azure\Bicep\bootstrap\configuration.bicep`);
      const variables = template.variables;
      const labels = variables?.["labels"];
      const references = variables?.["secretReferences"];
      const defaults = literalVariable(template, "staticConfiguration");
      if (!Array.isArray(labels) || !Array.isArray(references) || !Array.isArray(defaults)) {
        throw new Error("The configuration fixture requires the real compiled manifest labels, references, and defaults.");
      }
      const settings = [
        {key: "Identity:Tenant:Id", value: "55555555-5555-4555-8555-555555555555"},
        {key: "Identity:Subscription:Id", value: "66666666-6666-4666-8666-666666666666"},
        {
          key: "Endpoints:Database:SQL",
          value:
            "Server=tcp:sql.example.test,1433;Database=primary-app;Authentication=Active Directory Managed Identity;User Id=11111111-1111-4111-8111-111111111111;Encrypt=True;TrustServerCertificate=False;",
        },
        {key: "Endpoints:Database:NoSQL", value: "https://cosmos.example.test/"},
        {key: "Endpoints:Storage:Blob", value: "https://blob.example.test/"},
        {key: "Endpoints:Observability:Telemetry", value: "InstrumentationKey=synthetic-telemetry"},
        {key: "Endpoints:AI:OCR", value: "https://ai.example.test/"},
        {key: "Endpoints:Service:Api", value: "https://api.arolariu.ro"},
      ];
      return {
        kind: "configuration",
        environment: {
          AZURE_CLIENT_ID: "33333333-3333-4333-8333-333333333333",
          KEY_VAULT_URI: "https://vault.example.test/",
          APP_CONFIGURATION_ENDPOINT: "https://config.example.test/",
          COGNITIVE_SERVICES_KEY: "DO_NOT_LOG_AI_KEY_MARKER",
          CONFIGURATION_MANIFEST: JSON.stringify({labels, references, defaults, settings}),
        },
        secrets: {},
      };
    },
  };
  return scenarios[kind];
}

const powershellHarness = String.raw`
$ErrorActionPreference = 'Stop'
$case = ConvertFrom-Json -InputObject $env:BICEP_TEST_SCENARIO -AsHashtable
foreach ($entry in $case.environment.GetEnumerator()) {
  [Environment]::SetEnvironmentVariable($entry.Key, [string]$entry.Value)
}
$script:operations = [Collections.Generic.List[object]]::new()
$script:httpRequests = 0
$script:secrets = if ($case.ContainsKey('secrets')) { $case.secrets } else { @{} }
$script:clock = [DateTime]::Parse('2026-01-01T00:00:00Z').ToUniversalTime()
$script:userSid = if ($case.ContainsKey('existingUserSid') -and $case.existingUserSid) {
  '0x' + [Convert]::ToHexString(([Guid]$case.existingUserSid).ToByteArray())
} else { $null }
$DeploymentScriptOutputs = @{}

function Get-Date { return $script:clock }
function Start-Sleep {
  param([int]$Seconds)
  $script:clock = $script:clock.AddSeconds($Seconds)
  $script:operations.Add(@{kind='sleep';target=[string]$Seconds})
}
function Get-Module {
  param([string]$Name, [switch]$ListAvailable)
  if ($Name -ne 'SqlServer') { throw 'Unexpected module lookup.' }
  return [pscustomobject]@{Name='SqlServer';Version=[Version]'22.4.5.1'}
}
function Install-Module {
  param($Name,$RequiredVersion,$Scope,$Repository,[switch]$Force,[switch]$AllowClobber,[switch]$AcceptLicense)
  if ($Name -ne 'SqlServer' -or $RequiredVersion -ne '22.4.5.1') { throw 'Unexpected module installation.' }
  $script:operations.Add(@{kind='module-install';target=$Name;value=$RequiredVersion})
}
function Import-Module {
  param($Name,$RequiredVersion,$ErrorAction)
  if ($Name -ne 'SqlServer' -or $RequiredVersion -ne '22.4.5.1') { throw 'Unexpected module import.' }
}
function Get-AzContext {
  return [pscustomobject]@{Environment=[pscustomobject]@{SqlDatabaseDnsSuffix='.database.windows.net';AzureKeyVaultServiceEndpointResourceId='https://vault.azure.net';Name='AzureCloud'}}
}
function Get-AzAccessToken {
  param([string]$ResourceUrl)
  $configurationAudience = $case.kind -eq 'configuration' -and $ResourceUrl -in @('https://vault.azure.net', 'https://azconfig.io')
  if ($ResourceUrl -notmatch '^https://database\.windows\.net/?$' -and -not ($case.kind -eq 'probe' -and $ResourceUrl -eq 'https://cosmos.azure.com/') -and -not $configurationAudience) {
    throw 'Unexpected token audience.'
  }
  $script:operations.Add(@{kind='token';target=$ResourceUrl;value=$env:AZURE_CLIENT_ID})
  return [pscustomobject]@{Token=(ConvertTo-SecureString 'synthetic-access-token' -AsPlainText -Force)}
}
function Throw-HttpFailure([int]$status, [string]$body) {
  $failure = [Exception]::new('External service error.')
  Add-Member -InputObject $failure -NotePropertyName Response -NotePropertyValue ([pscustomobject]@{StatusCode=$status})
  $record = [Management.Automation.ErrorRecord]::new($failure,'SyntheticHttpError',[Management.Automation.ErrorCategory]::InvalidOperation,$null)
  $record.ErrorDetails = [Management.Automation.ErrorDetails]::new($body)
  throw $record
}
function Invoke-RestMethod {
  [CmdletBinding()]
  param([Uri]$Uri,[hashtable]$Headers,[string]$Method='Get',[string]$Body,[string]$ContentType,[int]$TimeoutSec)
  if ($case.kind -eq 'configuration') {
    if ($Uri.Scheme -ne 'https' -or $Uri.Host -notin @('vault.example.test','config.example.test') -or $Headers.Authorization -ne 'Bearer synthetic-access-token') {
      throw 'Unexpected configuration request target or authorization.'
    }
    $script:operations.Add(@{kind='http';target=$Uri.AbsolutePath;value=$Method.ToUpperInvariant()})
    $script:httpRequests++
    if ($case.ContainsKey('httpFault') -and $script:httpRequests -le $case.httpFault.attempts) {
      $errorBody = if ($case.httpFault.ContainsKey('body')) { $case.httpFault.body } else {
        ConvertTo-Json -Compress -InputObject @{error=@{code=$case.httpFault.code;innererror=@{code=$case.httpFault.code}}}
      }
      Throw-HttpFailure $case.httpFault.status $errorBody
    }
    if ($Uri.Host -eq 'vault.example.test' -and $Uri.AbsolutePath -match '^/secrets/([^/]+)$') {
      $name = [Uri]::UnescapeDataString($Uri.Segments[-1])
      if ($Method -eq 'Get') {
        if (-not $script:secrets.ContainsKey($name)) { Throw-HttpFailure 404 '{"error":{"code":"SecretNotFound"}}' }
        return [pscustomobject]@{value=$script:secrets[$name];id="https://vault.example.test/secrets/$name/fixture-version"}
      }
      if ($Method -eq 'Put') {
        $payload = ConvertFrom-Json -InputObject $Body
        if ($name -notmatch '^(DEVELOPMENT|PRODUCTION)-(JWT-SECRET|CognitiveServicesKey)$' -or $payload.value -isnot [string]) {
          throw 'Unexpected secret ownership or value.'
        }
        $fingerprint = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($payload.value)))
        $script:operations.Add(@{kind='secret-write';target=$Uri.AbsolutePath;length=$payload.value.Length;value=$fingerprint})
        $script:secrets[$name] = $payload.value
        return [pscustomobject]@{value=$payload.value;id="https://vault.example.test/secrets/$name/new-fixture-version"}
      }
    }
    if ($Uri.Host -eq 'config.example.test' -and $Uri.AbsolutePath.StartsWith('/kv/') -and $Method -eq 'Put') {
      $payload = ConvertFrom-Json -InputObject $Body
      $query = [Web.HttpUtility]::ParseQueryString($Uri.Query)
      if ([Uri]::UnescapeDataString($Uri.AbsolutePath.Substring(4)) -cne $payload.key -or $query['label'] -cne $payload.label) {
        throw 'Incorrect key or label escaping.'
      }
      $script:operations.Add(@{kind='config-write';target=$Uri.AbsolutePath;value=$Body})
      return $payload
    }
    throw 'Unexpected configuration operation.'
  }
  if ($case.kind -ne 'probe' -or $Uri.Scheme -ne 'https' -or $Uri.Host -ne 'cosmos.example.test') {
    throw 'Unexpected network target.'
  }
  if ([Uri]::UnescapeDataString($Headers.authorization) -ne 'type=aad&ver=1.0&sig=synthetic-access-token' -or -not $Headers['x-ms-date'] -or $Headers['x-ms-version'] -ne '2018-12-31') {
    throw 'Invalid Cosmos authorization headers.'
  }
  $script:operations.Add(@{kind='http';target=$Uri.AbsolutePath;value=$Method.ToUpperInvariant()})
  $script:httpRequests++
  if ($case.ContainsKey('httpFault') -and $script:httpRequests -le $case.httpFault.attempts) {
    $failure = [Exception]::new([string]$case.httpFault.body)
    Add-Member -InputObject $failure -NotePropertyName Response -NotePropertyValue ([pscustomobject]@{StatusCode=$case.httpFault.status})
    throw $failure
  }
  if ($Method -eq 'Get' -and $Uri.AbsolutePath -eq '/') {
    return [pscustomobject]@{id='cosmos-test';writableLocations=@([pscustomobject]@{name='Test Region'})}
  }
  if ($Method -eq 'Get' -and $Uri.AbsolutePath -match '^/dbs/primary/colls/(invoices|merchants)$') {
    return [pscustomobject]@{id=$Uri.Segments[-1]}
  }
  if ($Method -eq 'Post' -and $Uri.AbsolutePath -match '^/dbs/primary/colls/(invoices|merchants)/docs$') {
    $query = ConvertFrom-Json -InputObject $Body
    if ($ContentType -ne 'application/query+json' -or $Headers['x-ms-documentdb-isquery'] -ne 'True' -or $Headers['x-ms-documentdb-query-enablecrosspartition'] -ne 'True' -or $query.query -notmatch '^SELECT TOP 1 c\.id FROM c$') {
      throw 'Invalid Cosmos read-only query.'
    }
    return [pscustomobject]@{Documents=@();_count=0}
  }
  throw 'Unexpected Cosmos data operation.'
}
function Invoke-WebRequest { throw 'Unexpected web request.' }
function Invoke-Sqlcmd {
  [CmdletBinding()]
  param([string]$ServerInstance,[string]$Database,[string]$Query,$AccessToken,[int]$ConnectionTimeout,[int]$QueryTimeout)
  if ($ServerInstance -ne 'sql.example.test' -or $Database -ne 'primary-app') { throw 'Unexpected SQL target.' }
  if ($AccessToken -ne 'synthetic-access-token') { throw 'Missing identity token.' }
  $script:operations.Add(@{kind='sql';target="$ServerInstance/$Database";value=$Query})
  if ($case.ContainsKey('queryError') -and $case.queryError) {
    $failure = [Exception]::new([string]$case.queryError)
    if ($case.ContainsKey('queryErrorNumber')) {
      Add-Member -InputObject $failure -NotePropertyName Number -NotePropertyValue ([int]$case.queryErrorNumber)
    }
    throw $failure
  }
  if ($Query -match 'sys\.database_principals') {
    if ($script:userSid) { return [pscustomobject]@{PrincipalSid=$script:userSid} }
    return
  }
  if ($Query -match 'AS\s+DatabaseName') {
    return [pscustomobject]@{
      DatabaseName=$Database;CurrentUser=$env:BACKEND_USER_NAME;IsOwner=0;IsReader=1;IsWriter=1;IsDdlAdmin=1
    }
  }
  if ($Query -match 'CREATE\s+USER') {
    $sidMatch = [regex]::Match($Query, 'SID\s*=\s*(0x[0-9A-Fa-f]+)', 'IgnoreCase')
    if (-not $sidMatch.Success -or $Query -notmatch 'TYPE\s*=\s*E') { throw 'Unbound SQL user.' }
    $script:userSid = $sidMatch.Groups[1].Value
    return
  }
  if ($Query -match 'ALTER\s+ROLE') { return }
  throw 'Unexpected SQL query.'
}

$exitCode = 0
$failure = ''
$captured = [Collections.Generic.List[object]]::new()
try {
  $source = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:BICEP_TEST_SOURCE))
  . ([ScriptBlock]::Create($source)) *>&1 | ForEach-Object { $captured.Add($_) }
} catch {
  $exitCode = 1
  $failure = $_.Exception.Message
}
$payload = @{
  exitCode=$exitCode
  stdout=($captured.ToArray() | Out-String)
  stderr=$failure
  outputs=$DeploymentScriptOutputs
  operations=@($script:operations.ToArray())
}
[Console]::WriteLine('HARNESS_RESULT:' + (ConvertTo-Json -InputObject $payload -Depth 20 -Compress))
exit $exitCode
`;

function runScript(modulePath: string, resourceSymbol: string, input: ScriptScenario): ScriptRunResult {
  const resource = compileTemplate(modulePath).resources[resourceSymbol];
  expect(resource?.type, `${resourceSymbol} must perform the deployment operation`).toBe("Microsoft.Resources/deploymentScripts");
  const source = resource?.properties?.["scriptContent"];
  if (typeof source !== "string") throw new Error(`Missing literal inline script: ${resourceSymbol}.`);

  const environment: Record<string, string> = {};
  for (const key of ["PATH", "Path", "SystemRoot", "SystemDrive", "TEMP", "TMP", "USERPROFILE", "HOME", "PSModulePath"]) {
    const value = process.env[key];
    if (value !== undefined) environment[key] = value;
  }
  environment["BICEP_TEST_SCENARIO"] = JSON.stringify(input);
  environment["BICEP_TEST_SOURCE"] = Buffer.from(source).toString("base64");
  const result = spawnSync(
    "pwsh",
    ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(powershellHarness, "utf16le").toString("base64")],
    {
      encoding: "utf8",
      env: environment,
      timeout: 30_000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  if (result.error) throw new Error(`The installed PowerShell harness failed: ${result.error.message}`);
  const line = result.stdout.split(/\r?\n/u).find((entry) => entry.startsWith("HARNESS_RESULT:"));
  if (!line) throw new Error("PowerShell did not return its controlled result envelope.");
  const payload: unknown = JSON.parse(line.slice("HARNESS_RESULT:".length));
  if (
    !isRecord(payload)
    || typeof payload["exitCode"] !== "number"
    || typeof payload["stdout"] !== "string"
    || typeof payload["stderr"] !== "string"
    || !isRecord(payload["outputs"])
    || !Array.isArray(payload["operations"])
  )
    throw new Error("Invalid PowerShell result envelope.");
  const operations: ScriptOperation[] = [];
  for (const operation of payload["operations"]) {
    if (
      !isRecord(operation)
      || (operation["kind"] !== "sql"
        && operation["kind"] !== "http"
        && operation["kind"] !== "secret-write"
        && operation["kind"] !== "config-write"
        && operation["kind"] !== "token"
        && operation["kind"] !== "module-install"
        && operation["kind"] !== "sleep")
      || typeof operation["target"] !== "string"
    ) {
      throw new Error("Invalid recorded external operation.");
    }
    operations.push({
      kind: operation["kind"],
      target: operation["target"],
      ...(typeof operation["value"] === "string" ? {value: operation["value"]} : {}),
      ...(typeof operation["length"] === "number" ? {length: operation["length"]} : {}),
    });
  }
  expect(result.status).toBe(payload["exitCode"]);
  return {exitCode: payload["exitCode"], stdout: payload["stdout"], stderr: payload["stderr"], outputs: payload["outputs"], operations};
}

describe("Bicep deployment stages", {timeout: 120_000}, () => {
  it("requires an explicit supported stage and defaults to Foundation", () => {
    const main = compileTemplate(String.raw`infra\Azure\Bicep\main.bicep`);

    expect(main.parameters?.["deploymentStage"]).toMatchObject({
      type: "string",
      defaultValue: "foundation",
      allowedValues: ["foundation", "domains"],
    });
  });

  it("routes Foundation and domain completion through opposite conditions", () => {
    const facade = compileTemplate(String.raw`infra\Azure\Bicep\facade.bicep`);

    expect(facade.resources["foundationDeployment"]?.type).toBe("Microsoft.Resources/deployments");
    expect(facade.resources["domainCompletionDeployment"]?.type).toBe("Microsoft.Resources/deployments");
    expect(facade.resources["foundationDeployment"]?.condition).toContain("'foundation'");
    expect(facade.resources["domainCompletionDeployment"]?.condition).toContain("'domains'");
  });

  it("derives shared resource names from the resource group rather than the audit timestamp", () => {
    const facade = compileTemplate(String.raw`infra\Azure\Bicep\facade.bicep`);
    const prefix = facade.variables?.["resourceConventionPrefix"];

    expect(prefix).toEqual(expect.stringContaining("uniqueString(resourceGroup().id)"));
    expect(prefix).not.toEqual(expect.stringContaining("resourceDeploymentDate"));
    expect(moduleParameters(facade, "foundationDeployment")["resourceConventionPrefix"]).toBe("[variables('resourceConventionPrefix')]");
    expect(moduleParameters(facade, "domainCompletionDeployment")["resourceConventionPrefix"]).toBe(
      "[variables('resourceConventionPrefix')]",
    );
  });

  it("completes domains without creating foundational resources", () => {
    const facade = compileTemplate(String.raw`infra\Azure\Bicep\facade.bicep`);
    expect(facade.resources["domainCompletionDeployment"]).toBeDefined();
    const domains = moduleTemplate(facade, "domainCompletionDeployment");

    expect(resourcesOfType(domains, "Microsoft.Resources/deployments").length).toBeGreaterThan(0);
    for (const type of [
      "Microsoft.Storage/storageAccounts",
      "Microsoft.Sql/servers",
      "Microsoft.DocumentDB/databaseAccounts",
      "Microsoft.KeyVault/vaults",
      "Microsoft.AppConfiguration/configurationStores",
      "Microsoft.ManagedIdentity/userAssignedIdentities",
      "Microsoft.Web/serverfarms",
    ]) {
      expect(
        resourcesOfType(domains, type).filter((resource) => resource["existing"] !== true),
        type,
      ).toHaveLength(0);
    }
  });

  it("looks up the fixed release targets without depending on a disabled Foundation module", () => {
    const facade = compileTemplate(String.raw`infra\Azure\Bicep\facade.bicep`);
    expect(facade.resources["domainCompletionDeployment"]).toBeDefined();
    const domains = moduleTemplate(facade, "domainCompletionDeployment");
    const bindings = moduleParameters(domains, "bindingsDeployment");

    expect(bindings).toMatchObject({
      apiWebsiteHostname: "api-arolariu-ro",
      devWebsiteHostname: "dev-arolariu-ro",
      prodWebsiteHostname: "www-arolariu-ro",
      cvWebsiteHostname: "cv-arolariu-ro",
      docsWebsiteHostname: "docs-arolariu-ro",
    });
    expect(moduleParameters(facade, "domainCompletionDeployment")).not.toHaveProperty("foundationOutputs");
  });
});

describe("Bicep experiments registration", {timeout: 120_000}, () => {
  it("provisions a tenant-only application and enabled service principal without client credentials", () => {
    const identity = compileTemplate(String.raw`infra\Azure\Bicep\identity\deploymentFile.bicep`);
    const applications = resourcesOfType(identity, "Microsoft.Graph/applications");
    const principals = resourcesOfType(identity, "Microsoft.Graph/servicePrincipals");

    expect(applications.length).toBeGreaterThan(0);
    expect(principals).toHaveLength(1);
    for (const application of applications) {
      expect(application.properties).toMatchObject({signInAudience: "AzureADMyOrg", api: {requestedAccessTokenVersion: 2}});
      expect(application.properties?.["passwordCredentials"] ?? []).toHaveLength(0);
      expect(application.properties?.["keyCredentials"] ?? []).toHaveLength(0);
    }
    expect(principals[0]?.properties).toMatchObject({accountEnabled: true, appRoleAssignmentRequired: false});
  });

  it("exposes the generated application ID only after application creation", () => {
    const identity = compileTemplate(String.raw`infra\Azure\Bicep\identity\deploymentFile.bicep`);
    expect(identity.resources["expApplication"]).toBeDefined();
    expect(identity.resources["expApplicationExposure"]).toBeDefined();
    const input = moduleParameters(identity, "expApplicationExposure");
    const exposure = moduleTemplate(identity, "expApplicationExposure");
    const application = resourcesOfType(exposure, "Microsoft.Graph/applications")[0];

    expect(input["appClientId"]).toEqual(expect.stringContaining("expApplication"));
    expect(input["appClientId"]).toEqual(expect.stringContaining("appClientId"));
    expect(application?.properties?.["identifierUris"]).toEqual([expect.stringContaining("api://")]);
    expect(application?.properties?.["identifierUris"]).toEqual([expect.stringContaining("appClientId")]);
  });

  it("wires the generated client ID into the site without a required caller-supplied ID", () => {
    const main = compileTemplate(String.raw`infra\Azure\Bicep\main.bicep`);
    const foundation = compileTemplate(String.raw`infra\Azure\Bicep\foundation.bicep`);
    const inputs = moduleParameters(foundation, "websiteDeployment");

    expect(main.parameters).not.toHaveProperty("expEntraAppClientId");
    expect(inputs["expEntraAppClientId"]).toEqual(expect.stringContaining("identitiesDeployment"));
    expect(inputs["expEntraAppClientId"]).toEqual(expect.stringContaining("expEntraAppClientId"));
  });

  it("preserves workload identity positions and the existing GitHub environment trust", () => {
    const identity = compileTemplate(String.raw`infra\Azure\Bicep\identity\deploymentFile.bicep`);
    const identities = moduleTemplate(identity, "managedIdentities");
    const federation = moduleTemplate(identity, "federatedCredentials");

    expect(identities.variables?.["identities"]).toEqual([
      expect.objectContaining({name: expect.stringContaining("-frontend")}),
      expect.objectContaining({name: expect.stringContaining("-backend")}),
      expect.objectContaining({name: expect.stringContaining("-infrastructure")}),
    ]);
    expect(moduleParameters(identity, "federatedCredentials")["infrastructureManagedIdentity"]).toEqual(expect.stringContaining("[2]"));
    expect(federation.variables?.["federatedCredentials"]).toEqual([
      expect.objectContaining({subject: "repo:arolariu/arolariu.ro:environment:development"}),
      expect.objectContaining({subject: "repo:arolariu/arolariu.ro:environment:production"}),
    ]);
  });
});

describe("Bicep SQL bootstrap", {timeout: 120_000}, () => {
  it("uses infrastructure administration and Entra-only SQL without local credentials", () => {
    const template = compileTemplate(String.raw`infra\Azure\Bicep\storage\sqlServer.bicep`);
    const server = resourcesOfType(template, "Microsoft.Sql/servers")[0];
    const admin = server?.properties?.["administrators"];
    expect(isRecord(admin) && String(admin["sid"]).includes("infrastructureManagedIdentity")).toBe(true);
    expect(admin).toMatchObject({azureADOnlyAuthentication: true, principalType: "Application"});
    expect(server?.properties).not.toHaveProperty("administratorLoginPassword");
    const firewall = resourcesOfType(template, "Microsoft.Sql/servers/firewallRules");
    expect(firewall).toHaveLength(1);
    expect(firewall[0]?.properties).toMatchObject({startIpAddress: "0.0.0.0", endIpAddress: "0.0.0.0"});
  });

  it("creates an ID-bound contained user and grants only the required database roles", () => {
    const result = runScript(String.raw`infra\Azure\Bicep\rbac\sql-server-rbac.bicep`, "sqlBootstrap", scenario("sql"));
    expect(result.exitCode).toBe(0);
    expect(result.outputs["completed"]).toBe(true);
    const statements = result.operations
      .filter((op) => op.kind === "sql")
      .map((op) => op.value ?? "")
      .join("\n");
    expect(statements).toMatch(/CREATE\s+USER\s+\[backend\]/iu);
    expect(statements).toMatch(/SID\s*=\s*0x11111111111111418111111111111111/iu);
    expect(statements).toMatch(/TYPE\s*=\s*E/iu);
    expect(statements).not.toMatch(/FROM\s+EXTERNAL\s+PROVIDER|db_owner/iu);
    for (const role of ["db_datareader", "db_datawriter", "db_ddladmin"]) {
      expect(statements).toMatch(new RegExp(`ALTER\\s+ROLE\\s+\\[?${role}\\]?\\s+ADD\\s+MEMBER`, "iu"));
    }
  });

  it("does not recreate a matching contained user on another attempt", () => {
    const result = runScript(String.raw`infra\Azure\Bicep\rbac\sql-server-rbac.bicep`, "sqlBootstrap", {
      ...scenario("sql"),
      existingUserSid: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.exitCode).toBe(0);
    expect(result.outputs["completed"]).toBe(true);
    expect(result.operations.some((op) => op.kind === "sql" && /CREATE\s+USER|DROP\s+USER/iu.test(op.value ?? ""))).toBe(false);
  });

  it("refuses an unrelated existing SID before issuing any mutation", () => {
    const result = runScript(String.raw`infra\Azure\Bicep\rbac\sql-server-rbac.bicep`, "sqlBootstrap", {
      ...scenario("sql"),
      existingUserSid: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.outputs["completed"]).not.toBe(true);
    expect(
      result.operations.some((op) => op.kind === "sql" && /CREATE\s+USER|DROP\s+USER|ALTER\s+(USER|ROLE)/iu.test(op.value ?? "")),
    ).toBe(false);
  });

  it("fails SQL errors without exposing external exception bodies", () => {
    const result = runScript(String.raw`infra\Azure\Bicep\rbac\sql-server-rbac.bicep`, "sqlBootstrap", {
      ...scenario("sql"),
      queryError: "DO_NOT_LOG_SECRET_MARKER",
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.outputs["completed"]).not.toBe(true);
    expect(result.stdout + result.stderr).not.toContain("DO_NOT_LOG_SECRET_MARKER");
  });

  it("does not start SQL queries after the login propagation deadline", () => {
    const result = runScript(String.raw`infra\Azure\Bicep\rbac\sql-server-rbac.bicep`, "sqlBootstrap", {
      ...scenario("sql"),
      queryError: "LOGIN_PROPAGATION_PENDING",
      queryErrorNumber: 18456,
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.outputs["completed"]).not.toBe(true);
    let elapsedSeconds = 0;
    for (const operation of result.operations) {
      if (operation.kind === "sleep") elapsedSeconds += Number(operation.target);
      if (operation.kind === "sql") expect(elapsedSeconds).toBeLessThan(600);
    }
    expect(elapsedSeconds).toBeGreaterThan(0);
  });

  it("runs a separate backend-identity SQL membership probe", () => {
    const foundation = compileTemplate(String.raw`infra\Azure\Bicep\foundation.bicep`);
    expect(foundation.resources["backendAccessProbe"]).toBeDefined();
    const template = compileTemplate(String.raw`infra\Azure\Bicep\bootstrap\access-probe.bicep`);
    const probe = template.resources["backendAccessProbe"];
    expect(JSON.stringify(probe?.["identity"])).toContain("backendManagedIdentity");
    expect(JSON.stringify(probe?.["identity"])).not.toContain("infrastructureManagedIdentity");
    const variables = probe?.properties?.["environmentVariables"];
    expect(variables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({name: "AZURE_CLIENT_ID", value: expect.stringContaining("backendManagedIdentity")}),
      ]),
    );
    const result = runScript(String.raw`infra\Azure\Bicep\bootstrap\access-probe.bicep`, "backendAccessProbe", scenario("probe"));
    expect(result.exitCode).toBe(0);
    expect(result.outputs["completed"]).toBe(true);
    expect(
      result.operations.filter((op) => op.kind === "token" && op.target === "https://database.windows.net/").map((op) => op.value),
    ).toEqual(["11111111-1111-4111-8111-111111111111"]);
  });
});

describe("Bicep Cosmos access", {timeout: 120_000}, () => {
  it("uses a native data-contributor assignment scoped to the primary database", () => {
    const template = compileTemplate(String.raw`infra\Azure\Bicep\rbac\cosmos-db-rbac.bicep`);
    const assignments = resourcesOfType(template, "Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments");

    expect(assignments).toHaveLength(1);
    expect(resourcesOfType(template, "Microsoft.Authorization/roleAssignments")).toHaveLength(0);
    expect(assignments[0]?.properties).toMatchObject({
      principalId: "[parameters('backendPrincipalId')]",
      scope: expect.stringContaining("/dbs/primary"),
      roleDefinitionId: expect.stringContaining("/sqlRoleDefinitions/"),
    });
    expect(JSON.stringify(assignments[0])).toContain("cosmosDbSqlDataContributor");
    expect(Object.values(template.variables ?? {})).toContain("00000000-0000-0000-0000-000000000002");
  });

  it("preserves managed-identity-only authentication and existing partition contracts", () => {
    const template = compileTemplate(String.raw`infra\Azure\Bicep\storage\noSqlServer.bicep`);
    expect(resourcesOfType(template, "Microsoft.DocumentDB/databaseAccounts")[0]?.properties?.["disableLocalAuth"]).toBe(true);
    const containers = resourcesOfType(template, "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers");
    expect(containers.map((container) => container.properties?.["resource"])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({id: "invoices", partitionKey: {paths: ["/UserIdentifier"], kind: "Hash", version: 2}}),
        expect.objectContaining({id: "merchants", partitionKey: {paths: ["/ParentCompanyId"], kind: "Hash", version: 2}}),
      ]),
    );
    expect(containers).toHaveLength(2);
  });

  it("forwards the raw resource endpoint to the backend probe after its native grant", () => {
    const storage = compileTemplate(String.raw`infra\Azure\Bicep\storage\deploymentFile.bicep`);
    const leaf = moduleTemplate(storage, "noSqlServerDeployment");
    const foundation = compileTemplate(String.raw`infra\Azure\Bicep\foundation.bicep`);
    expect(JSON.stringify(leaf.outputs?.["cosmosEndpoint"])).toContain("documentEndpoint");
    expect(JSON.stringify(storage.outputs?.["cosmosEndpoint"])).toContain("cosmosEndpoint");
    expect(moduleParameters(foundation, "backendAccessProbe")["cosmosEndpoint"]).toEqual(expect.stringContaining("storageDeployment"));
    expect(moduleParameters(foundation, "cosmosDbRbac")["backendPrincipalId"]).toEqual(expect.stringContaining("[1].principalId"));
    expect(foundation.resources["backendAccessProbe"]?.dependsOn).toContain("cosmosDbRbac");
    const probe = compileTemplate(String.raw`infra\Azure\Bicep\bootstrap\access-probe.bicep`).resources["backendAccessProbe"];
    expect(probe?.properties?.["environmentVariables"]).toEqual(
      expect.arrayContaining([{name: "COSMOS_ENDPOINT", value: "[parameters('cosmosEndpoint')]"}]),
    );
  });

  it("uses the backend token for native metadata and read-only invoice/merchant queries", () => {
    const result = runScript(String.raw`infra\Azure\Bicep\bootstrap\access-probe.bicep`, "backendAccessProbe", scenario("probe"));

    expect(result.exitCode).toBe(0);
    expect(result.outputs["completed"]).toBe(true);
    const requests = result.operations.filter((op) => op.kind === "http");
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({target: "/", value: "GET"}),
        expect.objectContaining({target: "/dbs/primary/colls/invoices", value: "GET"}),
        expect.objectContaining({target: "/dbs/primary/colls/merchants", value: "GET"}),
        expect.objectContaining({target: "/dbs/primary/colls/invoices/docs", value: "POST"}),
        expect.objectContaining({target: "/dbs/primary/colls/merchants/docs", value: "POST"}),
      ]),
    );
    expect(result.operations).toContainEqual({
      kind: "token",
      target: "https://cosmos.azure.com/",
      value: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("allows bounded native-role propagation before reporting success", () => {
    const result = runScript(String.raw`infra\Azure\Bicep\bootstrap\access-probe.bicep`, "backendAccessProbe", {
      ...scenario("probe"),
      httpFault: {status: 403, code: "Forbidden", attempts: 2, body: "ROLE_PROPAGATING"},
    });

    expect(result.exitCode).toBe(0);
    expect(result.outputs["completed"]).toBe(true);
    expect(result.operations.filter((op) => op.kind === "http" && op.target === "/")).toHaveLength(3);
    expect(result.operations.filter((op) => op.kind === "sleep")).toHaveLength(2);
  });

  it("fails denied data-plane access without exposing the service error body", () => {
    const result = runScript(String.raw`infra\Azure\Bicep\bootstrap\access-probe.bicep`, "backendAccessProbe", {
      ...scenario("probe"),
      httpFault: {status: 403, code: "Forbidden", attempts: 50, body: "DO_NOT_LOG_SECRET_MARKER"},
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.outputs["completed"]).not.toBe(true);
    expect(result.stdout + result.stderr).not.toContain("DO_NOT_LOG_SECRET_MARKER");
    expect(result.operations.filter((op) => op.kind === "http").length).toBeGreaterThan(1);
  });
});

describe("Bicep configuration bootstrap", {timeout: 120_000}, () => {
  const path = String.raw`infra\Azure\Bicep\bootstrap\configuration.bicep`;
  const preservationCases = [
    {name: "missing", secrets: {}, shouldWrite: true},
    {name: "placeholder", secrets: {"PRODUCTION-JWT-SECRET": "<your-jwt-secret>"}, shouldWrite: true},
    {name: "existing", secrets: {"PRODUCTION-JWT-SECRET": "real-fixture-".padEnd(88, "x")}, shouldWrite: false},
  ] satisfies readonly Readonly<{name: string; secrets: Readonly<Record<string, string>>; shouldWrite: boolean}>[];

  function settingsWritten(result: ScriptRunResult): readonly Readonly<Record<string, unknown>>[] {
    return result.operations
      .filter((operation) => operation.kind === "config-write")
      .map((operation) => {
        const value: unknown = JSON.parse(operation.value ?? "");
        if (!isRecord(value) || typeof value["key"] !== "string" || typeof value["label"] !== "string") {
          throw new Error("Invalid configuration write in fixture.");
        }
        return value;
      });
  }

  it("provisions stores separately from placeholder secret and configuration data", () => {
    const vault = compileTemplate(String.raw`infra\Azure\Bicep\configuration\keyVault.bicep`);
    const store = compileTemplate(String.raw`infra\Azure\Bicep\configuration\appConfiguration.bicep`);

    expect(resourcesOfType(vault, "Microsoft.KeyVault/vaults/secrets")).toHaveLength(0);
    expect(resourcesOfType(store, "Microsoft.AppConfiguration/configurationStores/keyValues")).toHaveLength(0);
    expect(resourcesOfType(store, "Microsoft.AppConfiguration/configurationStores")[0]?.properties).not.toHaveProperty("dataPlaneProxy");
    expect(store.outputs).toHaveProperty("appConfigurationEndpoint");
  });

  it("uses permanent resource-scoped writer roles without granting frontend vault writes", () => {
    const store = compileTemplate(String.raw`infra\Azure\Bicep\rbac\app-configuration-rbac.bicep`);
    const vault = compileTemplate(String.raw`infra\Azure\Bicep\rbac\key-vault-rbac.bicep`);

    expect(store.resources["infrastructureConfigOwner"]?.properties?.["principalId"]).toBe("[parameters('infrastructurePrincipalId')]");
    expect(JSON.stringify(store.resources["infrastructureConfigOwner"])).toContain("appConfigurationDataOwner");
    expect(vault.resources["infrastructureSecretsOfficer"]?.properties?.["principalId"]).toBe("[parameters('infrastructurePrincipalId')]");
    expect(JSON.stringify(vault.resources["infrastructureSecretsOfficer"])).toContain("keyVaultSecretsOfficer");
    expect(Object.values(vault.variables ?? {})).toContain("b86a8fe4-44ce-4948-aee5-eccb2c155cd7");
    expect(JSON.stringify(vault)).not.toContain("frontendPrincipalId");
    expect(JSON.stringify(store.resources["infrastructureConfigOwner"]?.["scope"])).toContain(
      "Microsoft.AppConfiguration/configurationStores",
    );
    expect(JSON.stringify(vault.resources["infrastructureSecretsOfficer"]?.["scope"])).toContain("Microsoft.KeyVault/vaults");
  });

  it("wires actual resource values and a secure AI key without a plaintext module output", () => {
    const foundation = compileTemplate(String.raw`infra\Azure\Bicep\foundation.bicep`);
    const template = compileTemplate(path);
    const parameters = moduleParameters(foundation, "configurationBootstrap");
    const configuration = parameters["configuration"];
    expect(isRecord(configuration)).toBe(true);
    if (!isRecord(configuration)) throw new Error("Missing runtime configuration.");
    expect(configuration["sqlDatabaseName"]).toEqual(expect.stringContaining("sqlDatabasePrimaryName"));
    expect(configuration["backendManagedIdentityClientId"]).toEqual(expect.stringContaining("[1].clientId"));
    expect(configuration["cosmosEndpoint"]).toEqual(expect.stringContaining("cosmosEndpoint"));
    expect(configuration["blobEndpoint"]).toEqual(expect.stringContaining("storageAccountBlobEndpoint"));
    expect(configuration["cognitiveServicesEndpoint"]).toEqual(expect.stringContaining("aiFoundryEndpoint"));
    expect(configuration["telemetryConnectionString"]).toEqual(expect.stringContaining("appInsightsConnectionString"));
    expect(parameters["cognitiveServicesKey"]).toEqual(expect.stringContaining("aiDeployment"));
    const ai = compileTemplate(String.raw`infra\Azure\Bicep\ai\deploymentFile.bicep`);
    const account = moduleTemplate(ai, "aiFoundryDeployment");
    expect(ai.outputs?.["cognitiveServicesKey"]).toMatchObject({type: expect.stringMatching(/^securestring$/iu)});
    expect(account.outputs?.["cognitiveServicesKey"]).toMatchObject({
      type: expect.stringMatching(/^securestring$/iu),
      value: expect.stringContaining("listKeys("),
    });
    expect(template.parameters?.["cognitiveServicesKey"]).toMatchObject({type: expect.stringMatching(/^securestring$/iu)});
    const environment = template.resources["configurationBootstrap"]?.properties?.["environmentVariables"];
    expect(environment).toEqual(
      expect.arrayContaining([{name: "COGNITIVE_SERVICES_KEY", secureValue: "[parameters('cognitiveServicesKey')]"}]),
    );
    expect(Object.keys(template.outputs ?? {}).sort()).toEqual(["completed", "executionResourceIds", "pendingExternalSecretNames"]);
    expect(foundation.resources["configurationBootstrap"]?.dependsOn).toEqual(
      expect.arrayContaining(["appConfigRbac", "keyVaultRbac", "backendAccessProbe"]),
    );
    const settings = JSON.stringify(template.variables?.["runtimeSettings"]);
    for (const field of [
      "tenantId",
      "subscriptionId",
      "sqlServerFqdn",
      "sqlDatabaseName",
      "backendManagedIdentityClientId",
      "cosmosEndpoint",
      "blobEndpoint",
      "telemetryConnectionString",
      "cognitiveServicesEndpoint",
      "apiUrl",
    ]) {
      expect(settings).toContain(`.${field}`);
    }
    expect(settings).toContain("Encrypt=True");
    expect(settings).toContain("TrustServerCertificate=False");
  });

  it.each(preservationCases)("preserves real internal secrets: $name", ({name, secrets, shouldWrite}) => {
    const result = runScript(path, "configurationBootstrap", {...scenario("configuration"), secrets});
    const writes = result.operations.filter(
      (operation) => operation.kind === "secret-write" && operation.target.endsWith("/PRODUCTION-JWT-SECRET"),
    );

    expect(result.exitCode).toBe(0);
    expect(result.outputs["completed"]).toBe(true);
    expect(writes).toHaveLength(shouldWrite ? 1 : 0);
    if (shouldWrite) expect(writes[0]?.length).toBeGreaterThanOrEqual(88);
    if (name === "missing") {
      const generated = result.operations.filter(
        (operation) => operation.kind === "secret-write" && operation.target.endsWith("-JWT-SECRET"),
      );
      expect(new Set(generated.map((operation) => operation.value)).size).toBe(2);
    }
    expect(settingsWritten(result)).toContainEqual(
      expect.objectContaining({
        key: "Auth:JWT:Secret",
        label: "PRODUCTION",
        content_type: "application/vnd.microsoft.appconfig.keyvaultref+json;charset=utf-8",
        value: JSON.stringify({uri: "https://vault.example.test/secrets/PRODUCTION-JWT-SECRET"}),
      }),
    );
  });

  it("fails an invalid non-placeholder JWT rather than rotating it", () => {
    const result = runScript(path, "configurationBootstrap", {
      ...scenario("configuration"),
      secrets: {"PRODUCTION-JWT-SECRET": "invalid-short-value"},
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.outputs["completed"]).not.toBe(true);
    expect(
      result.operations.filter((operation) => operation.kind === "secret-write" && operation.target.endsWith("/PRODUCTION-JWT-SECRET")),
    ).toHaveLength(0);
  });

  it("never overwrites operator credentials and reports missing external setup by name", () => {
    const secrets = Object.fromEntries(
      ["DEVELOPMENT", "PRODUCTION"].flatMap((label) =>
        ["ClerkPublishableKey", "ClerkSecretKey", "ResendKey"].map((name) => [`${label}-${name}`, `DO_NOT_LOG_${name}_MARKER`]),
      ),
    );
    const existing = runScript(path, "configurationBootstrap", {...scenario("configuration"), secrets});
    const missing = runScript(path, "configurationBootstrap", scenario("configuration"));

    expect(existing.exitCode).toBe(0);
    expect(existing.outputs["pendingExternalSecretNames"]).toEqual([]);
    expect(missing.exitCode).toBe(0);
    expect(missing.outputs["pendingExternalSecretNames"]).toEqual(expect.arrayContaining(Object.keys(secrets)));
    for (const result of [existing, missing]) {
      expect(
        result.operations.filter((operation) => operation.kind === "secret-write" && /Clerk|Resend/u.test(operation.target)),
      ).toHaveLength(0);
    }
  });

  it("does not mistake forbidden secret reads for missing secrets", () => {
    const result = runScript(path, "configurationBootstrap", {
      ...scenario("configuration"),
      httpFault: {status: 403, code: "Forbidden", attempts: 50, body: "DO_NOT_LOG_ERROR_BODY_MARKER"},
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.outputs["completed"]).not.toBe(true);
    expect(result.operations.filter((operation) => operation.kind === "secret-write")).toHaveLength(0);
    expect(result.operations.filter((operation) => operation.kind === "sleep")).toHaveLength(0);
    expect(result.stdout + result.stderr).not.toContain("DO_NOT_LOG_ERROR_BODY_MARKER");
  });

  it("retries identified RBAC propagation but stops repeated transient failures", () => {
    const propagated = runScript(path, "configurationBootstrap", {
      ...scenario("configuration"),
      httpFault: {status: 403, code: "ForbiddenByRbac", attempts: 2},
    });
    const unavailable = runScript(path, "configurationBootstrap", {
      ...scenario("configuration"),
      httpFault: {status: 503, code: "ServiceUnavailable", attempts: 50, body: "DO_NOT_LOG_ERROR_BODY_MARKER"},
    });

    expect(propagated.exitCode).toBe(0);
    expect(propagated.outputs["completed"]).toBe(true);
    expect(propagated.operations.filter((operation) => operation.kind === "sleep")).toHaveLength(2);
    expect(unavailable.exitCode).not.toBe(0);
    expect(unavailable.outputs["completed"]).not.toBe(true);
    expect(unavailable.operations.filter((operation) => operation.kind === "http").length).toBeLessThanOrEqual(24);
    expect(unavailable.stdout + unavailable.stderr).not.toContain("DO_NOT_LOG_ERROR_BODY_MARKER");
  });

  it("retains resolved Azure values, canonical URLs, labels, and typed versionless references", () => {
    const result = runScript(path, "configurationBootstrap", scenario("configuration"));
    const settings = settingsWritten(result);

    expect(result.exitCode).toBe(0);
    for (const label of ["DEVELOPMENT", "PRODUCTION"]) {
      expect(settings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({key: "Endpoints:Database:SQL", label, value: expect.stringContaining("Database=primary-app;")}),
          expect.objectContaining({
            key: "Endpoints:Database:SQL",
            label,
            value: expect.stringContaining("User Id=11111111-1111-4111-8111-111111111111;"),
          }),
          expect.objectContaining({key: "Endpoints:Database:NoSQL", label, value: "https://cosmos.example.test/"}),
          expect.objectContaining({key: "Endpoints:Storage:Blob", label, value: "https://blob.example.test/"}),
          expect.objectContaining({key: "Endpoints:AI:OCR", label, value: "https://ai.example.test/"}),
          expect.objectContaining({key: "Endpoints:Observability:Telemetry", label, value: "InstrumentationKey=synthetic-telemetry"}),
          expect.objectContaining({key: "Auth:JWT:Issuer", label, value: "https://auth.arolariu.ro"}),
          expect.objectContaining({key: "Auth:JWT:Audience", label, value: "https://api.arolariu.ro"}),
        ]),
      );
      expect(settings).toContainEqual(
        expect.objectContaining({
          key: "Endpoints:AI:OCR:Key",
          label,
          content_type: "application/vnd.microsoft.appconfig.keyvaultref+json;charset=utf-8",
          value: JSON.stringify({uri: `https://vault.example.test/secrets/${label}-CognitiveServicesKey`}),
        }),
      );
    }
    expect(settings.some((setting) => setting["value"] === "")).toBe(false);
  });

  it("does not expose JWT, AI key, access-token, or vendor values in output or diagnostics", () => {
    const result = runScript(path, "configurationBootstrap", {
      ...scenario("configuration"),
      secrets: {
        "PRODUCTION-JWT-SECRET": "DO_NOT_LOG_REAL_JWT_MARKER".padEnd(88, "x"),
        "PRODUCTION-ClerkSecretKey": "DO_NOT_LOG_VENDOR_MARKER",
      },
    });

    expect(result.exitCode).toBe(0);
    const recorded = JSON.stringify(result);
    for (const marker of ["DO_NOT_LOG_AI_KEY_MARKER", "DO_NOT_LOG_REAL_JWT_MARKER", "DO_NOT_LOG_VENDOR_MARKER", "synthetic-access-token"]) {
      expect(recorded).not.toContain(marker);
    }
  });
});

describe("Bicep AI provisioning", {timeout: 120_000}, () => {
  it("creates the approved model router inside the generated AIServices account graph", () => {
    const template = compileTemplate(String.raw`infra\Azure\Bicep\ai\aiFoundry.bicep`);
    const accounts = resourcesOfType(template, "Microsoft.CognitiveServices/accounts");
    const projects = resourcesOfType(template, "Microsoft.CognitiveServices/accounts/projects");
    const models = resourcesOfType(template, "Microsoft.CognitiveServices/accounts/deployments");

    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.["kind"]).toBe("AIServices");
    expect(accounts[0]?.["sku"]).toMatchObject({name: "S0"});
    expect(projects).toHaveLength(1);
    expect(models).toHaveLength(1);
    expect(models[0]?.name).toContain("model-router");
    expect(models[0]?.properties?.["model"]).toEqual({format: "OpenAI", name: "model-router", version: "2025-11-18"});
    expect(models[0]?.["sku"]).toMatchObject({name: "GlobalStandard", capacity: 10});
    expect(models[0]?.dependsOn).toContain("aiFoundry");
  });

  it("forwards the explicit Sweden Central placement and retains key authentication", () => {
    const foundation = compileTemplate(String.raw`infra\Azure\Bicep\foundation.bicep`);
    const orchestrator = compileTemplate(String.raw`infra\Azure\Bicep\ai\deploymentFile.bicep`);
    const account = moduleTemplate(orchestrator, "aiFoundryDeployment");

    expect(moduleParameters(foundation, "aiDeployment")["resourceLocation"]).toBe("swedencentral");
    expect(moduleParameters(orchestrator, "aiFoundryDeployment")["aiFoundryLocation"]).toBe("[parameters('resourceLocation')]");
    expect(resourcesOfType(account, "Microsoft.CognitiveServices/accounts")[0]?.properties?.["disableLocalAuth"]).toBe(false);
  });

  it("keeps backend roles on the generated account and all key outputs secure", () => {
    const foundation = compileTemplate(String.raw`infra\Azure\Bicep\foundation.bicep`);
    const parameters = moduleParameters(foundation, "openAiRbac");
    const rbac = compileTemplate(String.raw`infra\Azure\Bicep\rbac\ai-rbac.bicep`);
    const ai = compileTemplate(String.raw`infra\Azure\Bicep\ai\deploymentFile.bicep`);

    expect(parameters["aiFoundryAccountName"]).toEqual(expect.stringContaining("aiDeployment"));
    expect(parameters["backendPrincipalId"]).toEqual(expect.stringContaining("[1].principalId"));
    const roles = resourcesOfType(rbac, "Microsoft.Authorization/roleAssignments");
    expect(roles).toHaveLength(2);
    for (const role of roles) {
      expect(role.properties?.["principalId"]).toBe("[parameters('backendPrincipalId')]");
      expect(JSON.stringify(role["scope"])).toContain("aiFoundryAccountName");
    }
    expect(ai.outputs?.["cognitiveServicesKey"]).toMatchObject({type: expect.stringMatching(/^securestring$/iu)});
    expect(JSON.stringify(ai.outputs?.["aiResources"])).not.toContain("cognitiveServicesKey");
  });
});

describe("Bicep site wiring", {timeout: 120_000}, () => {
  const applications = [
    {
      symbol: "mainWebsiteDeployment",
      identity: "productionWebsiteIdentityId",
      client: "productionWebsiteIdentityClientId",
      port: "3000",
      health: "/api/health/",
    },
    {
      symbol: "devWebsiteDeployment",
      identity: "developmentWebsiteIdentityId",
      client: "developmentWebsiteIdentityClientId",
      port: "3000",
      health: "/api/health/",
    },
    {
      symbol: "apiWebsiteDeployment",
      identity: "apiWebsiteIdentityId",
      client: "apiWebsiteIdentityClientId",
      port: "8080",
      health: "/health",
    },
    {
      symbol: "expWebsiteDeployment",
      identity: "expWebsiteIdentityId",
      client: "expWebsiteIdentityClientId",
      port: "8080",
      health: "/api/health",
    },
  ] as const;

  function application(symbol: string): CompiledResource {
    const sites = compileTemplate(String.raw`infra\Azure\Bicep\sites\deploymentFile.bicep`);
    const resources = resourcesOfType(moduleTemplate(sites, symbol), "Microsoft.Web/sites");
    expect(resources, `${symbol} must deploy a real web app`).toHaveLength(1);
    const resource = resources[0];
    if (!resource) throw new Error(`Missing web application ${symbol}.`);
    return resource;
  }

  function siteConfiguration(resource: CompiledResource): Readonly<Record<string, unknown>> {
    const config = resource.properties?.["siteConfig"];
    if (!isRecord(config)) throw new Error("Missing web application configuration.");
    return config;
  }

  function settings(resource: CompiledResource): Readonly<Record<string, unknown>> {
    const entries = siteConfiguration(resource)["appSettings"];
    if (!Array.isArray(entries)) throw new Error("Missing runtime application settings.");
    const values: Record<string, unknown> = {};
    for (const entry of entries) {
      if (!isRecord(entry) || typeof entry["name"] !== "string") throw new Error("Invalid application setting.");
      values[entry["name"]] = entry["value"];
    }
    return values;
  }

  it("uses each assigned resource ID for attachment and its client ID for ACR pulls", () => {
    for (const contract of applications) {
      const app = application(contract.symbol);
      expect(JSON.stringify(app["identity"])).toContain(`parameters('${contract.identity}')`);
      expect(JSON.stringify(app["identity"])).not.toContain(`parameters('${contract.client}')`);
      expect(siteConfiguration(app)["acrUseManagedIdentityCreds"]).toBe(true);
      expect(siteConfiguration(app)["acrUserManagedIdentityID"]).toBe(`[parameters('${contract.client}')]`);
    }
  });

  it("uses real registry/configuration endpoints and waits for configuration completion", () => {
    const foundation = compileTemplate(String.raw`infra\Azure\Bicep\foundation.bicep`);
    const storage = compileTemplate(String.raw`infra\Azure\Bicep\storage\deploymentFile.bicep`);
    const sites = compileTemplate(String.raw`infra\Azure\Bicep\sites\deploymentFile.bicep`);
    const inputs = moduleParameters(foundation, "websiteDeployment");

    expect(JSON.stringify(storage.outputs?.["containerRegistryLoginServer"])).toContain("containerRegistryLoginServer");
    expect(inputs["containerRegistryLoginServer"]).toEqual(expect.stringContaining("storageDeployment"));
    expect(inputs["appConfigurationEndpoint"]).toEqual(expect.stringContaining("configurationDeployment"));
    expect(foundation.resources["websiteDeployment"]?.dependsOn).toEqual(
      expect.arrayContaining(["configurationBootstrap", "containerRegistryRbac"]),
    );
    for (const contract of applications) {
      expect(settings(application(contract.symbol))["DOCKER_REGISTRY_SERVER_URL"]).toEqual(
        expect.stringContaining("containerRegistryLoginServer"),
      );
      expect(moduleParameters(sites, contract.symbol)["containerRegistryLoginServer"]).toBe("[parameters('containerRegistryLoginServer')]");
    }
    expect(settings(application("expWebsiteDeployment"))["AZURE_APPCONFIG_ENDPOINT"]).toBe("[parameters('appConfigurationEndpoint')]");
  });

  it("sets runtime identity, infrastructure, tenant, audience, ports, and real health paths", () => {
    for (const contract of applications) {
      const app = application(contract.symbol);
      const values = settings(app);
      expect(values["AZURE_CLIENT_ID"]).toBe(`[parameters('${contract.client}')]`);
      expect(values["AZURE_TENANT_ID"]).toEqual(expect.stringContaining("tenantId"));
      expect(values["AZURE_SUBSCRIPTION_ID"]).toEqual(expect.stringContaining("subscriptionId"));
      expect(values["INFRA"]).toBe("azure");
      expect(values["EXP_ENTRA_APP_CLIENT_ID"]).toEqual(expect.stringContaining("AppClientId"));
      expect(values["WEBSITES_PORT"]).toBe(contract.port);
      expect(siteConfiguration(app)["healthCheckPath"]).toBe(contract.health);
      expect(values["APPLICATIONINSIGHTS_CONNECTION_STRING"]).toEqual(expect.stringContaining("appInsightsConnectionString"));
    }
    for (const symbol of ["mainWebsiteDeployment", "devWebsiteDeployment"]) {
      expect(settings(application(symbol))["NODE_ENV"]).toBe("production");
    }
    expect(settings(application("mainWebsiteDeployment"))["SITE_ENV"]).toBe("PRODUCTION");
    expect(settings(application("devWebsiteDeployment"))["SITE_ENV"]).toBe("DEVELOPMENT");
    expect(settings(application("apiWebsiteDeployment"))["ASPNETCORE_ENVIRONMENT"]).toBe("Production");
  });

  it("retains principal-ID caller policy and invokes the Free status site", () => {
    const sites = compileTemplate(String.raw`infra\Azure\Bicep\sites\deploymentFile.bicep`);
    const exp = moduleTemplate(sites, "expWebsiteDeployment");
    const auth = resourcesOfType(exp, "Microsoft.Web/sites/config").find((resource) => resource.name?.includes("authsettingsV2"));
    expect(auth).toBeDefined();
    expect(auth?.properties?.["platform"]).toMatchObject({enabled: true});
    const policy = JSON.stringify(auth?.properties);
    for (const principal of ["frontendIdentityPrincipalId", "backendIdentityPrincipalId", "infrastructureIdentityPrincipalId"]) {
      expect(policy).toContain(principal);
    }
    expect(policy).not.toContain("IdentityClientId");
    expect(sites.resources["statusWebsiteDeployment"]).toBeDefined();
    const status = resourcesOfType(moduleTemplate(sites, "statusWebsiteDeployment"), "Microsoft.Web/staticSites");
    expect(status).toHaveLength(1);
    expect(status[0]?.name).toBe("status-arolariu-ro");
    expect(status[0]?.["sku"]).toMatchObject({name: "Free"});
    expect(sites.outputs).toHaveProperty("statusWebsiteUrl");
    expect(sites.outputs).toHaveProperty("statusWebsiteName");
  });

  it("retains Basic non-admin registry access and existing scoped pull/push assignments", () => {
    const registry = compileTemplate(String.raw`infra\Azure\Bicep\storage\containerRegistry.bicep`);
    const rbac = compileTemplate(String.raw`infra\Azure\Bicep\rbac\container-registry-rbac.bicep`);
    expect(resourcesOfType(registry, "Microsoft.ContainerRegistry/registries")[0]?.["sku"]).toMatchObject({name: "Basic"});
    expect(resourcesOfType(registry, "Microsoft.ContainerRegistry/registries")[0]?.properties?.["adminUserEnabled"]).toBe(false);
    for (const symbol of ["frontendAcrPull", "backendAcrPull", "infrastructureAcrPush"]) {
      expect(rbac.resources[symbol]).toBeDefined();
      expect(JSON.stringify(rbac.resources[symbol]?.["scope"])).toContain("containerRegistryName");
    }
  });
});
