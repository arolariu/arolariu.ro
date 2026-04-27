/**
 * @fileoverview Enforces repository GitHub Actions policy rules.
 * @module github/scripts/src/runWorkflowPolicyCheck
 */

import * as core from "@actions/core";
import {existsSync} from "node:fs";
import {readFile, readdir} from "node:fs/promises";
import {dirname, join, relative, resolve} from "node:path";
import {fileURLToPath} from "node:url";

export interface WorkflowPolicyViolation {
  readonly file: string;
  readonly line: number;
  readonly message: string;
  readonly rule: string;
}

const YAML_EXTENSION_REGEX = /\.ya?ml$/i;
const EXTERNAL_ACTION_REGEX = /^\s*(?:-\s*)?uses:\s*["']?([^"'\s#]+@[^"'\s#]+)["']?/;
const SHA_PINNED_ACTION_REGEX = /@[0-9a-fA-F]{40}$/;
const LOCAL_REFERENCE_REGEX = /^(?:\.\/|\.\.\/)/;
const DOCKER_REFERENCE_REGEX = /^docker:\/\//;
const AZURE_LOGIN_REGEX = /uses:\s*["']?azure\/login@/i;
const DEPLOYMENT_STEP_REGEX = /uses:\s*["']?(?:azure\/webapps-deploy|Azure\/static-web-apps-deploy)@|docker\s+push\s+/i;
const STATUS_PROBE_WORKFLOW = ".github/workflows/official-status-probe.yml";
const TOP_LEVEL_CONTENTS_WRITE_ALLOWLIST = new Map<string, string>([
  [
    STATUS_PROBE_WORKFLOW,
    "Publishes generated status data to the status-data orphan branch; no other workflow should have repository-wide contents: write.",
  ],
]);

const scanDirectories = [".github/workflows", ".github/actions"] as const;

function findWorkspaceRoot(startDirectory: string): string {
  let currentDirectory = resolve(startDirectory);

  while (true) {
    if (existsSync(join(currentDirectory, ".github", "workflows"))) {
      return currentDirectory;
    }

    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      throw new Error(`Unable to locate repository root containing .github/workflows from ${startDirectory}.`);
    }

    currentDirectory = parentDirectory;
  }
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/");
}

function isExternalActionReference(reference: string): boolean {
  return !LOCAL_REFERENCE_REGEX.test(reference) && !DOCKER_REFERENCE_REGEX.test(reference);
}

async function listYamlFiles(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, {recursive: true, withFileTypes: true});
  return entries
    .filter((entry) => entry.isFile() && YAML_EXTENSION_REGEX.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

function findLineNumber(lines: readonly string[], predicate: (line: string) => boolean): number {
  const index = lines.findIndex(predicate);
  return index >= 0 ? index + 1 : 1;
}

function hasTopLevelPermission(content: string, permission: string, value: string): boolean {
  const lines = content.split(/\r?\n/);
  const permissionsIndex = lines.findIndex((line) => /^permissions:\s*$/.test(line));
  if (permissionsIndex < 0) {
    return false;
  }

  for (let index = permissionsIndex + 1; index < lines.length; index++) {
    const line = lines[index] ?? "";
    if (/^\S/.test(line)) {
      break;
    }

    if (new RegExp(`^\\s{2}${permission}:\\s*${value}(?:\\s+#.*)?\\s*$`).test(line)) {
      return true;
    }
  }

  return false;
}

function workflowHasEnvironment(content: string): boolean {
  return /^\s{4,}environment:\s*/m.test(content) || /^\s{4,}environment:\s*$/m.test(content);
}

function checkContent(file: string, content: string): readonly WorkflowPolicyViolation[] {
  const violations: WorkflowPolicyViolation[] = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const actionMatch = EXTERNAL_ACTION_REGEX.exec(line);
    const actionReference = actionMatch?.[1];
    if (actionReference && isExternalActionReference(actionReference) && !SHA_PINNED_ACTION_REGEX.test(actionReference)) {
      violations.push({
        file,
        line: lineNumber,
        message: `External action '${actionReference}' must be pinned to a 40-character commit SHA.`,
        rule: "pin-external-actions",
      });
    }

    if (/^\s*restore-keys:\s*/.test(line)) {
      violations.push({
        file,
        line: lineNumber,
        message: "Cache restore keys are prohibited by RFC 0001; use exact hash keys only.",
        rule: "no-cache-restore-keys",
      });
    }

    if (/^permissions:\s*write-all\s*$/.test(line)) {
      violations.push({
        file,
        line: lineNumber,
        message: "Top-level permissions must be least-privilege and cannot use write-all.",
        rule: "least-privilege-permissions",
      });
    }

    if (/^\s*pull_request_target:\s*$/.test(line)) {
      violations.push({
        file,
        line: lineNumber,
        message: "pull_request_target requires an explicit allowlist entry before use.",
        rule: "no-unreviewed-pull-request-target",
      });
    }
  });

  const isWorkflowFile = file.startsWith(".github/workflows/");
  if (isWorkflowFile && hasTopLevelPermission(content, "contents", "write") && !TOP_LEVEL_CONTENTS_WRITE_ALLOWLIST.has(file)) {
    violations.push({
      file,
      line: findLineNumber(lines, (line) => /^\s{2}contents:\s*write(?:\s+#.*)?\s*$/.test(line)),
      message: "Top-level contents: write is reserved for explicitly allowlisted repository-write workflows.",
      rule: "top-level-contents-write-allowlist",
    });
  }

  const usesAzureLogin = lines.some((line) => AZURE_LOGIN_REGEX.test(line));
  if (isWorkflowFile && usesAzureLogin && !hasTopLevelPermission(content, "id-token", "write")) {
    violations.push({
      file,
      line: findLineNumber(lines, (line) => AZURE_LOGIN_REGEX.test(line)),
      message: "Azure login requires id-token: write for OIDC authentication.",
      rule: "azure-oidc-permissions",
    });
  }

  const hasDeployment = lines.some((line) => DEPLOYMENT_STEP_REGEX.test(line));
  if (isWorkflowFile && hasDeployment && file !== STATUS_PROBE_WORKFLOW && !workflowHasEnvironment(content)) {
    violations.push({
      file,
      line: findLineNumber(lines, (line) => DEPLOYMENT_STEP_REGEX.test(line)),
      message: "Deployment workflows must declare a GitHub Environment gate.",
      rule: "deployment-environment",
    });
  }

  return violations;
}

export function checkWorkflowPolicyFiles(files: Readonly<Record<string, string>>): readonly WorkflowPolicyViolation[] {
  return Object.entries(files).flatMap(([file, content]) => checkContent(normalizePath(file), content));
}

export async function runWorkflowPolicyCheck(workspaceRoot = process.cwd()): Promise<readonly WorkflowPolicyViolation[]> {
  const resolvedWorkspaceRoot = findWorkspaceRoot(workspaceRoot);
  const yamlFiles = (
    await Promise.all(
      scanDirectories.map(async (directory) => {
        try {
          return await listYamlFiles(join(resolvedWorkspaceRoot, directory));
        } catch {
          return [];
        }
      }),
    )
  ).flat();

  const files: Record<string, string> = {};
  await Promise.all(
    yamlFiles.map(async (file) => {
      files[normalizePath(relative(resolvedWorkspaceRoot, file))] = await readFile(file, "utf-8");
    }),
  );

  const violations = checkWorkflowPolicyFiles(files);
  if (violations.length > 0) {
    for (const violation of violations) {
      core.error(`${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`);
    }

    core.setFailed(`Workflow policy check failed with ${violations.length} violation(s).`);
  } else {
    core.info("Workflow policy check passed.");
  }

  return violations;
}

export default async function runWorkflowPolicyCheckAction(): Promise<void> {
  await runWorkflowPolicyCheck();
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;

if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  await runWorkflowPolicyCheckAction();
}
