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
