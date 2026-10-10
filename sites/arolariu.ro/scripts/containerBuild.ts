import {spawnSync} from "node:child_process";
import {existsSync, readFileSync} from "node:fs";
import {parseEnv} from "node:util";

/**
 * Selects public build configuration without coupling the image to an authentication provider.
 *
 * @param values - Parsed configuration from the build-only secret.
 * @returns Only browser-public variables and the CDN build selector.
 */
export function selectPublicBuildEnvironment(values: Readonly<Record<string, string | undefined>>): Readonly<Record<string, string>> {
  const environment: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && (key.startsWith("NEXT_PUBLIC_") || key === "USE_CDN")) {
      environment[key] = value;
    }
  }
  return environment;
}

if (import.meta.main) {
  const path = "/run/secrets/website_env";
  const values = existsSync(path) ? parseEnv(readFileSync(path, "utf8")) : {};
  const result = spawnSync("npm", ["run", "build"], {
    stdio: "inherit",
    env: {...process.env, ...selectPublicBuildEnvironment(values)},
  });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
