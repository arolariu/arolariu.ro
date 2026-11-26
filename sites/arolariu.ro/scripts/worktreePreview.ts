import type {PlaywrightTestConfig} from "@playwright/test";
import {randomUUID} from "node:crypto";
import {realpathSync, statSync} from "node:fs";
import {isAbsolute, join, relative, resolve, sep} from "node:path";

interface WorktreePreviewInput {
  readonly port: string | undefined;
  readonly testEnvironment: string | undefined;
  readonly ci: boolean;
  readonly productionBuild: boolean;
  readonly baseURL: string | undefined;
}

interface WorktreePreview {
  readonly hostname: "127.0.0.1";
  readonly port: number;
  readonly baseURL: string;
}

const MIN_PORT = 1024;
const MAX_PORT = 65_535;
const PREVIEW_TIMEOUT_MS = 60_000;
const CERTIFICATE_KEY = "certificates/localhost-key.pem";
const CERTIFICATE = "certificates/localhost.pem";
const NEXT_ENTRIES = ["./node_modules/next/dist/bin/next", "../../node_modules/next/dist/bin/next"] as const;

/** Reads an opt-in port for a local preview that must be started by this test run. */
export function parseWorktreePreview(input: Readonly<WorktreePreviewInput>): WorktreePreview | undefined {
  if (input.port === undefined) return undefined;

  const {testEnvironment} = input;
  if (
    input.ci
    || input.productionBuild
    || (testEnvironment !== undefined && testEnvironment !== "local" && testEnvironment !== "local-full")
    || input.baseURL
  ) {
    throw new Error("E2E_WORKTREE_PORT requires local development without CI, E2E_USE_PROD=true, or a BASE_URL override.");
  }

  const port = Number(input.port);
  if (input.port === "" || /\D/u.test(input.port) || port < MIN_PORT || port > MAX_PORT) {
    throw new Error(`E2E_WORKTREE_PORT must be a decimal port from ${MIN_PORT} to ${MAX_PORT}.`);
  }

  const hostname = "127.0.0.1";
  return {hostname, port, baseURL: `https://${hostname}:${port}`};
}

/** Configures an owned Next.js process without automatic certificate generation or server reuse. */
export function createWorktreeWebServer(
  preview: Readonly<WorktreePreview>,
  websiteRoot: string,
): NonNullable<PlaywrightTestConfig["webServer"]> {
  for (const file of [CERTIFICATE_KEY, CERTIFICATE]) {
    if (!statSync(join(websiteRoot, file), {throwIfNoEntry: false})?.isFile()) {
      throw new Error(`E2E_WORKTREE_PORT requires ${file} in this website checkout. See DEVELOPMENT.md for local HTTPS preparation.`);
    }
  }

  const checkout = resolve(realpathSync(websiteRoot), "../..");
  const nextEntry = NEXT_ENTRIES.find((entry) => {
    const file = join(websiteRoot, entry);
    if (!statSync(file, {throwIfNoEntry: false})?.isFile()) return false;
    const fromCheckout = relative(checkout, realpathSync(file));
    return !isAbsolute(fromCheckout) && fromCheckout !== ".." && !fromCheckout.startsWith(`..${sep}`);
  });
  if (!nextEntry) {
    throw new Error("E2E_WORKTREE_PORT requires Next.js installed in this checkout; no ancestor npm or PATH fallback is used.");
  }

  const run = randomUUID();
  return {
    cwd: websiteRoot,
    env: {
      SITE_URL: preview.baseURL,
      AROLARIU_PLAYWRIGHT_PREVIEW_RUN: run,
      // Next's internal dev-directory override must not retarget this checkout's launch.
      NEXT_PRIVATE_DEV_DIR: "",
    },
    command:
      `node --import ./scripts/worktreePreviewReady.ts ${nextEntry} dev --hostname ${preview.hostname} --port ${preview.port} --experimental-https`
      + ` --experimental-https-key ${CERTIFICATE_KEY} --experimental-https-cert ${CERTIFICATE}`,
    reuseExistingServer: false,
    // Neither the bind banner nor an external response proves the owned worker initialized.
    wait: {stdout: new RegExp(`Worktree preview application ready: ${run}\\b`, "u")},
    timeout: PREVIEW_TIMEOUT_MS,
    stderr: "pipe",
  };
}
