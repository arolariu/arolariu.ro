/**
 * @fileoverview Dispatches repository-owned GitHub Actions helper scripts.
 * @module github/scripts/src/runCiScript
 */

import * as core from "@actions/core";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";

type ScriptModule = Readonly<{
  default: () => Promise<void>;
}>;

const scriptModeMap = {
  hygiene: () => import("./runHygieneCheckV2.ts"),
  "live-test": () => import("./runLiveTestAction.ts"),
  "unit-test-comment": () => import("./runUnitTestAction.ts"),
  "workflow-inventory": () => import("./runWorkflowInventory.ts"),
  "workflow-policy": () => import("./runWorkflowPolicyCheck.ts"),
} as const satisfies Readonly<Record<string, () => Promise<ScriptModule>>>;

export type CiScriptMode = keyof typeof scriptModeMap;

export function resolveCiScriptMode(value: string | undefined): CiScriptMode {
  if (!value) {
    throw new Error(`CI_SCRIPT_MODE is required. Supported modes: ${Object.keys(scriptModeMap).join(", ")}.`);
  }

  if (!(value in scriptModeMap)) {
    throw new Error(`Unsupported CI_SCRIPT_MODE '${value}'. Supported modes: ${Object.keys(scriptModeMap).join(", ")}.`);
  }

  return value as CiScriptMode;
}

export async function runCiScript(modeValue = process.env["CI_SCRIPT_MODE"]): Promise<void> {
  const mode = resolveCiScriptMode(modeValue);
  core.info(`Running CI script mode: ${mode}`);

  const scriptModule = await scriptModeMap[mode]();
  await scriptModule.default();
}

export default runCiScript;

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;

if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  try {
    await runCiScript();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(message);
  }
}
