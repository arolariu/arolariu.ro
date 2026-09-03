/**
 * @fileoverview Static Traefik config generation for engine-agnostic selfhost mode.
 * @module scripts/container-runtime/traefik
 *
 * @remarks
 * {@link buildSelfhostTraefikConfig} stays a pure builder with no capability of its own; the two
 * file operations take the invocation's {@link FileSystem} instead of reaching for Node's
 * filesystem module, so selfhost's Traefik lifecycle is exercised entirely through runtime fakes.
 * The generated file is requested persistent state: the selfhost start action writes it and only
 * the explicit stop action removes it, never invocation cleanup.
 */

import {dirname, resolve} from "node:path";
import type {FileSystem} from "../common/runtime.ts";

const selfhostRoutes = [
  {name: "website-localhost", host: "website.localhost", service: "website", url: "http://website:3000"},
  {name: "api-localhost", host: "api.localhost", service: "api", url: "http://api:8080"},
  {name: "health-localhost", host: "health.localhost", service: "healthchecks", url: "http://healthchecks:8000"},
  {name: "cosmosdb-localhost", host: "cosmosdb.localhost", service: "cosmosdb", url: "http://cosmosdb:8081"},
  {name: "azurite-blob-localhost", host: "azurite-blob.localhost", service: "azurite-blob", url: "http://azurite:10000"},
] as const;

/** Generated Traefik file-provider config path for selfhost mode. */
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
 * @param files - Filesystem capability owned by the invocation.
 * @param config - Exact YAML content to persist, normally from {@link buildSelfhostTraefikConfig}.
 */
export async function writeSelfhostTraefikConfig(files: FileSystem, config: string): Promise<void> {
  await files.createDirectory(dirname(selfhostTraefikConfigPath), {recursive: true});
  await files.writeText(selfhostTraefikConfigPath, config);
}

/**
 * Removes the generated selfhost Traefik file-provider config.
 *
 * @param files - Filesystem capability owned by the invocation.
 */
export async function removeSelfhostTraefikConfig(files: FileSystem): Promise<void> {
  await files.remove(selfhostTraefikConfigPath, {force: true});
}
