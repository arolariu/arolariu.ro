/**
 * @fileoverview Type definitions for GitHub Actions workflows
 * @module types/workflow-types
 */

/**
 * Status of a job or workflow execution
 */
export type JobStatus = "success" | "failure" | "cancelled" | "skipped" | "unknown";

/**
 * GitHub repository information
 */
export interface RepositoryInfo {
  owner: string;
  name: string;
}

/**
 * Test execution result with duration tracking
 */
export interface TestJobResult {
  status: JobStatus;
  duration?: string;
}

/**
 * E2E test results for both frontend and backend
 */
export interface E2ETestResults {
  frontend: TestJobResult;
  backend: TestJobResult;
}

/**
 * Workflow execution metadata
 */
export interface WorkflowMetadata {
  name: string;
  runId: string;
  runNumber: string;
  eventName: string;
  serverUrl: string;
  repository: string;
  executionDate: string;
}

/**
 * Backend health check response structure
 */
export interface BackendHealthCheck {
  status: string;
  timestamp: string;
  dependencies?: Record<string, unknown>;
  version?: string;
  [key: string]: unknown;
}

/**
 * Test artifact paths for logs and reports
 */
export interface TestArtifactPaths {
  logs?: string[];
  reports?: string[];
  healthCheck?: string;
  summaries?: string[];
}

/**
 * Parameters for creating an issue from test failure
 */
export interface CreateIssueParams {
  title: string;
  body: string;
  labels: string[];
  assignees?: string[];
}

/**
 * Environment variables for E2E test workflow
 */
export interface E2ETestEnvironment {
  E2E_TEST_AUTH_TOKEN: string;
  NEWMAN_REPORT_DIR: string;
  TZ?: string;
}
