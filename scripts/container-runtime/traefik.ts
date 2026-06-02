/**
 * @fileoverview Static Traefik config generation for engine-agnostic selfhost mode.
 * @module scripts/container-runtime/traefik
 */

import {mkdir, rm, writeFile} from "node:fs/promises";
import {dirname, resolve} from "node:path";

const selfhostRoutes = [
  {name: "website-localhost", host: "website.localhost", service: "website", url: "http://website:3000"},
  {name: "api-localhost", host: "api.localhost", service: "api", url: "http://api:8080"},
  {name: "health-localhost", host: "health.localhost", service: "healthchecks", url: "http://healthchecks:8000"},
  {name: "cosmosdb-localhost", host: "cosmosdb.localhost", service: "cosmosdb", url: "http://cosmosdb:8081"},
  {name: "azurite-blob-localhost", host: "azurite-blob.localhost", service: "azurite-blob", url: "http://azurite:10000"},
] as const;

/** Default generated Traefik file-provider config path for selfhost mode. */
export const selfhostTraefikConfigPath: string = resolve("infra/Local/Management/traefik/dynamic/selfhost-services.yml");

/**
 * Builds the static Traefik HTTP route configuration for selfhost mode.
 *
 * @returns YAML content loaded by Traefik's file provider.
 */
export function buildSelfhostTraefikConfig(): string {
  const routers = [
    `    traefik-localhost:
      rule: Host(\`traefik.localhost\`)
      entryPoints:
        - websecure
      tls: {}
      service: api@internal`,
    ...selfhostRoutes.map(
      (route) => `    ${route.name}:
      rule: Host(\`${route.host}\`)
      entryPoints:
        - websecure
      tls: {}
      service: ${route.service}`,
    ),
  ].join("\n");

  const services = selfhostRoutes
    .map(
      (route) => `    ${route.service}:
      loadBalancer:
        servers:
          - url: ${route.url}`,
    )
    .join("\n");

  return `http:
  routers:
${routers}
  services:
${services}
`;
}

/**
 * Writes the generated selfhost Traefik file-provider config.
 *
 * @param targetPath - Destination path for the generated YAML.
 */
export async function writeSelfhostTraefikConfig(targetPath: string = selfhostTraefikConfigPath): Promise<void> {
  await mkdir(dirname(targetPath), {recursive: true});
  await writeFile(targetPath, buildSelfhostTraefikConfig(), "utf8");
}

/**
 * Removes the generated selfhost Traefik file-provider config.
 *
 * @param targetPath - Destination path for the generated YAML.
 */
export async function removeSelfhostTraefikConfig(targetPath: string = selfhostTraefikConfigPath): Promise<void> {
  await rm(targetPath, {force: true});
}
