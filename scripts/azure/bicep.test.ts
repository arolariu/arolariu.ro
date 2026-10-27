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

type EnvironmentFixture = Readonly<Record<string, string>>;
type HttpFault = Readonly<{status: number; code: string; attempts: number; body?: string}>;
type ScriptScenario =
  | Readonly<{kind: "sql"; environment: EnvironmentFixture; existingUserSid: string | null; queryError?: string; queryErrorNumber?: number}>
  | Readonly<{kind: "probe"; environment: EnvironmentFixture; queryError?: string; httpFault?: HttpFault}>;

interface ScriptOperation {
  readonly kind: "sql" | "http" | "token" | "module-install" | "sleep";
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
  return [pscustomobject]@{Environment=[pscustomobject]@{SqlDatabaseDnsSuffix='.database.windows.net';Name='AzureCloud'}}
}
function Get-AzAccessToken {
  param([string]$ResourceUrl)
  if ($ResourceUrl -notmatch '^https://database\.windows\.net/?$' -and -not ($case.kind -eq 'probe' -and $ResourceUrl -eq 'https://cosmos.azure.com/')) {
    throw 'Unexpected token audience.'
  }
  $script:operations.Add(@{kind='token';target=$ResourceUrl;value=$env:AZURE_CLIENT_ID})
  return [pscustomobject]@{Token=(ConvertTo-SecureString 'synthetic-access-token' -AsPlainText -Force)}
}
function Invoke-RestMethod {
  [CmdletBinding()]
  param([Uri]$Uri,[hashtable]$Headers,[string]$Method='Get',[string]$Body,[string]$ContentType,[int]$TimeoutSec)
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
