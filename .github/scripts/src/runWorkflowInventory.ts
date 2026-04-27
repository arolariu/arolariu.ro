/**
 * @fileoverview Generates a GitHub Actions workflow inventory for the monorepo.
 * @module github/scripts/src/runWorkflowInventory
 */

import * as core from "@actions/core";
import {existsSync} from "node:fs";
import {mkdir, readFile, readdir, writeFile} from "node:fs/promises";
import {dirname, join, relative, resolve} from "node:path";
import {fileURLToPath} from "node:url";

export interface WorkflowInventoryItem {
  readonly actionReferences: readonly string[];
  readonly environments: readonly string[];
  readonly file: string;
  readonly hasConcurrency: boolean;
  readonly hasPathFilters: boolean;
  readonly name: string;
  readonly permissions: readonly string[];
  readonly triggers: readonly string[];
}

const WORKFLOW_DIR = ".github/workflows";
const ARTIFACT_DIR = "artifacts/workflows";
const YAML_EXTENSION_REGEX = /\.ya?ml$/i;
const WORKFLOW_NAME_REGEX = /^name:\s*["']?(.+?)["']?\s*$/m;
const USES_REGEX = /^\s*uses:\s*["']?([^"'\s#]+)["']?/gm;
const ENVIRONMENT_REGEX = /^\s*environment:\s*(?:(?:name:\s*)?["']?([^"'\n]+)["']?)?/gm;
const PERMISSIONS_BLOCK_REGEX = /^(\s*)permissions:\s*(.*)$/;

const triggerNames = [
  "branch_protection_rule",
  "check_run",
  "check_suite",
  "create",
  "delete",
  "deployment",
  "deployment_status",
  "discussion",
  "discussion_comment",
  "fork",
  "gollum",
  "issue_comment",
  "issues",
  "label",
  "merge_group",
  "milestone",
  "page_build",
  "project",
  "project_card",
  "project_column",
  "public",
  "pull_request",
  "pull_request_review",
  "pull_request_review_comment",
  "pull_request_target",
  "push",
  "registry_package",
  "release",
  "repository_dispatch",
  "schedule",
  "status",
  "watch",
  "workflow_call",
  "workflow_dispatch",
  "workflow_run",
] as const;

function findWorkspaceRoot(startDirectory: string): string {
  let currentDirectory = resolve(startDirectory);

  while (true) {
    if (existsSync(join(currentDirectory, WORKFLOW_DIR))) {
      return currentDirectory;
    }

    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      throw new Error(`Unable to locate repository root containing ${WORKFLOW_DIR} from ${startDirectory}.`);
    }

    currentDirectory = parentDirectory;
  }
}

function extractMatches(content: string, regex: RegExp, groupIndex = 1): readonly string[] {
  const matches = [...content.matchAll(regex)]
    .map((match) => match[groupIndex]?.trim())
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  return [...new Set(matches)].sort((left, right) => left.localeCompare(right));
}

function extractWorkflowName(content: string, file: string): string {
  const match = WORKFLOW_NAME_REGEX.exec(content);
  return match?.[1]?.trim() ?? file;
}

function extractTriggers(content: string): readonly string[] {
  return triggerNames.filter((trigger) => new RegExp(`^\\s{0,2}${trigger}\\s*:`, "m").test(content));
}

function extractPermissions(content: string): readonly string[] {
  const lines = content.split(/\r?\n/);
  const permissions: string[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? "";
    const permissionsMatch = PERMISSIONS_BLOCK_REGEX.exec(line);
    if (!permissionsMatch) {
      continue;
    }

    const inlineValue = permissionsMatch[2]?.trim();
    if (inlineValue && inlineValue !== "{}") {
      permissions.push(`permissions:${inlineValue}`);
      continue;
    }

    const currentIndent = permissionsMatch[1]?.length ?? 0;
    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex++) {
      const nextLine = lines[nextIndex] ?? "";
      const entryMatch = /^(\s+)([a-z-]+):\s*([a-z-]+)\s*$/.exec(nextLine);
      if (!entryMatch) {
        if (/^\s*$/.test(nextLine)) {
          continue;
        }

        if (nextLine.search(/\S/) <= currentIndent) {
          break;
        }

        continue;
      }

      const indent = entryMatch[1]?.length ?? 0;
      if (indent <= currentIndent) {
        break;
      }

      permissions.push(`${entryMatch[2]}:${entryMatch[3]}`);
    }
  }

  return [...new Set(permissions)].sort((left, right) => left.localeCompare(right));
}

function extractEnvironments(content: string): readonly string[] {
  const environments = extractMatches(content, ENVIRONMENT_REGEX).filter((environment) => environment !== "{}");
  return environments.length > 0 ? environments : content.includes("environment:") ? ["declared"] : [];
}

export function createWorkflowInventoryItem(file: string, content: string): WorkflowInventoryItem {
  return {
    actionReferences: extractMatches(content, USES_REGEX),
    environments: extractEnvironments(content),
    file,
    hasConcurrency: /^concurrency:\s*$/m.test(content),
    hasPathFilters: /^\s*(paths|paths-ignore):\s*/m.test(content),
    name: extractWorkflowName(content, file),
    permissions: extractPermissions(content),
    triggers: extractTriggers(content),
  };
}

async function listWorkflowFiles(workspaceRoot: string): Promise<readonly string[]> {
  const workflowDirectory = join(workspaceRoot, WORKFLOW_DIR);
  const entries = await readdir(workflowDirectory, {withFileTypes: true});

  return entries
    .filter((entry) => entry.isFile() && YAML_EXTENSION_REGEX.test(entry.name))
    .map((entry) => join(workflowDirectory, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

function createSummaryMarkdown(items: readonly WorkflowInventoryItem[]): string {
  const lines = [
    "## GitHub Actions Workflow Inventory",
    "",
    "| Workflow | Triggers | Actions | Environments | Path filters | Concurrency |",
    "| --- | --- | ---: | --- | --- | --- |",
  ];

  for (const item of items) {
    lines.push(
      `| \`${item.file}\` | ${item.triggers.join(", ") || "none"} | ${item.actionReferences.length} | ${
        item.environments.join(", ") || "none"
      } | ${item.hasPathFilters ? "yes" : "no"} | ${item.hasConcurrency ? "yes" : "no"} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

export async function generateWorkflowInventory(workspaceRoot = process.cwd()): Promise<readonly WorkflowInventoryItem[]> {
  const resolvedWorkspaceRoot = findWorkspaceRoot(workspaceRoot);
  const workflowFiles = await listWorkflowFiles(resolvedWorkspaceRoot);
  const items = await Promise.all(
    workflowFiles.map(async (workflowFile) => {
      const content = await readFile(workflowFile, "utf-8");
      return createWorkflowInventoryItem(relative(resolvedWorkspaceRoot, workflowFile).replaceAll("\\", "/"), content);
    }),
  );

  const artifactDirectory = join(resolvedWorkspaceRoot, ARTIFACT_DIR);
  await mkdir(artifactDirectory, {recursive: true});
  await writeFile(join(artifactDirectory, "inventory.json"), `${JSON.stringify(items, null, 2)}\n`, "utf-8");

  const summary = createSummaryMarkdown(items);
  const stepSummaryPath = process.env["GITHUB_STEP_SUMMARY"];
  if (stepSummaryPath) {
    await writeFile(stepSummaryPath, summary, {encoding: "utf-8", flag: "a"});
  }

  core.info(`Workflow inventory generated at ${ARTIFACT_DIR}/inventory.json.`);
  return items;
}

export default async function runWorkflowInventory(): Promise<void> {
  await generateWorkflowInventory();
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;

if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  await runWorkflowInventory();
}
