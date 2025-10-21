/**
 * @fileoverview File system utilities for reading logs and artifacts
 * @module lib/file-system-helper
 */

import {access, readdir, readFile} from "node:fs/promises";
import {join} from "node:path";
import type {TestArtifactPaths} from "../types/workflow-types.ts";
import {BACKEND_LOGS_SUBFOLDER, DEFAULT_LOG_TAIL_LENGTH, HEALTH_CHECK_FILENAME} from "./constants.ts";

/**
 * Checks if a file exists and is accessible
 * @param filePath - Absolute or relative path to the file
 * @returns Promise that resolves to true if file exists and is accessible, false otherwise
 * @example
 * ```typescript
 * const exists = await fileExists('/path/to/file.json');
 * if (exists) {
 *   console.log('File is accessible');
 * }
 * ```
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads and parses a JSON file with type safety
 * @template T - The expected type of the parsed JSON content
 * @param filePath - Absolute or relative path to the JSON file
 * @returns Promise that resolves to the parsed JSON object of type T
 * @throws {Error} If file doesn't exist, is not readable, or contains invalid JSON
 * @example
 * ```typescript
 * interface Config { version: string; }
 * const config = await readJsonFile<Config>('./config.json');
 * console.log(config.version);
 * ```
 */
export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to read JSON file '${filePath}': ${err.message}`);
  }
}

/**
 * Reads the entire contents of a text file
 * @param filePath - Absolute or relative path to the text file
 * @returns Promise that resolves to the file content as a UTF-8 string
 * @throws {Error} If file doesn't exist or is not readable
 * @example
 * ```typescript
 * const logContent = await readTextFile('./app.log');
 * console.log(logContent);
 * ```
 */
export async function readTextFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to read text file '${filePath}': ${err.message}`);
  }
}

/**
 * Reads the last N lines from a log file (tail operation)
 * @param filePath - Absolute or relative path to the log file
 * @param lineCount - Number of lines to read from the end (default: 50)
 * @returns Promise that resolves to a string containing the last N lines joined by newlines
 * @throws {Error} If file doesn't exist or is not readable
 * @example
 * ```typescript
 * // Get last 100 lines from error log
 * const recentErrors = await readLogTail('./error.log', 100);
 * console.log(recentErrors);
 * ```
 */
export async function readLogTail(filePath: string, lineCount: number = DEFAULT_LOG_TAIL_LENGTH): Promise<string> {
  try {
    const content = await readTextFile(filePath);
    const lines = content.split("\n");
    const tailLines = lines.slice(-lineCount);
    return tailLines.join("\n");
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to read log tail from '${filePath}': ${err.message}`);
  }
}

/**
 * Recursively finds all files matching a RegExp pattern in a directory tree
 * @param dirPath - Root directory to search in (searched recursively)
 * @param pattern - Regular expression pattern to test against file names (not full paths)
 * @returns Promise that resolves to an array of absolute file paths matching the pattern.
 *          Returns empty array if directory doesn't exist or is not accessible.
 * @example
 * ```typescript
 * // Find all TypeScript files
 * const tsFiles = await findFiles('./src', /\.ts$/);
 *
 * // Find all log files
 * const logs = await findFiles('./logs', /\.log$/);
 * ```
 */
export async function findFiles(dirPath: string, pattern: RegExp): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, {withFileTypes: true, recursive: true});
    const matchingFiles: string[] = [];

    for (const entry of entries) {
      if (entry.isFile() && pattern.test(entry.name)) {
        const fullPath = join(entry.parentPath, entry.name);
        matchingFiles.push(fullPath);
      }
    }

    return matchingFiles;
  } catch {
    return [];
  }
}

/**
 * Automatically discovers and categorizes test artifact files from a directory
 *
 * Searches for:
 * - Log files (*.log)
 * - Newman test reports (newman-*.json, newman-*.xml)
 * - Test summary markdown files (*-summary.md)
 * - Backend health check JSON (backend-test-logs/backend-health.json)
 *
 * @param artifactsBaseDir - Root directory containing downloaded test artifacts
 * @returns Promise that resolves to an object with categorized artifact file paths
 * @example
 * ```typescript
 * const artifacts = await discoverTestArtifacts('./test-results');
 * console.log(`Found ${artifacts.logs?.length ?? 0} log files`);
 * console.log(`Found ${artifacts.reports?.length ?? 0} test reports`);
 * if (artifacts.healthCheck) {
 *   console.log('Health check data available');
 * }
 * ```
 */
export async function discoverTestArtifacts(artifactsBaseDir: string): Promise<TestArtifactPaths> {
  const artifacts: TestArtifactPaths = {
    logs: [],
    reports: [],
    summaries: [],
  };

  // Find all log files
  const logFiles = await findFiles(artifactsBaseDir, /\.log$/);
  artifacts.logs = logFiles;

  // Find report files (JSON and XML)
  const reportFiles = await findFiles(artifactsBaseDir, /newman-.*\.(json|xml)$/);
  artifacts.reports = reportFiles;

  // Find summary markdown files
  const summaryFiles = await findFiles(artifactsBaseDir, /-summary\.md$/);
  artifacts.summaries = summaryFiles;

  // Find health check file
  const healthCheckPath = join(artifactsBaseDir, BACKEND_LOGS_SUBFOLDER, HEALTH_CHECK_FILENAME);
  if (await fileExists(healthCheckPath)) {
    artifacts.healthCheck = healthCheckPath;
  }

  return artifacts;
}
