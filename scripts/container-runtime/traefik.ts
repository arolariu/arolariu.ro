/**
 * @fileoverview Static Traefik config generation for engine-agnostic selfhost mode.
 * @module scripts/container-runtime/traefik
 *
 * @remarks
 * {@link buildSelfhostTraefikConfig} stays a pure builder with no capability of its own; the two
 * file operations are Effects over the platform `FileSystem`, so selfhost's Traefik lifecycle is
 * exercised entirely through the in-memory test layer. The generated file is requested persistent
 * state: the selfhost start action writes it and only the explicit stop action removes it.
 */

import {resolve} from "node:path";

import {Effect, FileSystem, type Path, type PlatformError} from "effect";

import {writeTextAtomic} from "../platform/Files.ts";

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
 * @remarks
 * Writes through `writeTextAtomic`, which creates missing parent directories and replaces an
 * existing config without readers ever observing a partial file.
 *
 * @param config - Exact YAML content to persist, normally from {@link buildSelfhostTraefikConfig}.
 * @param path - Destination path; defaults to {@link selfhostTraefikConfigPath}.
 * @returns An effect that completes once `path` holds `config`.
 */
export function writeSelfhostTraefikConfig(
  config: string,
  path: string = selfhostTraefikConfigPath,
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> {
  return writeTextAtomic(path, config);
}

/**
 * Removes the generated selfhost Traefik file-provider config.
 *
 * @remarks
 * Removes with `force`, so a config that was never written (or is already gone) is a success, as in
 * the legacy command.
 *
 * @param path - Config path; defaults to {@link selfhostTraefikConfigPath}.
 * @returns An effect that completes once `path` no longer exists.
 */
export function removeSelfhostTraefikConfig(
  path: string = selfhostTraefikConfigPath,
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    yield* fs.remove(path, {force: true});
  });
}
