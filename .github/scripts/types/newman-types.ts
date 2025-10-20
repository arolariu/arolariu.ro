/**
 * @fileoverview Type definitions for Newman test reports and statistics
 * @module types/newman-types
 */

/**
 * Newman report structure from JSON output
 */
export interface NewmanReport {
  collection: {
    info: {
      name: string;
      description?: string;
      schema: string;
    };
  };
  run: {
    stats: {
      requests: {
        total: number;
        failed: number;
      };
      assertions: {
        total: number;
        failed: number;
      };
    };
    timings: {
      started: number; // Unix timestamp
      completed: number; // Unix timestamp
      responseAverage: number;
      responseMin: number;
      responseMax: number;
    };
    executions: NewmanExecution[];
  };
}

/**
 * Individual test execution within Newman run
 */
export interface NewmanExecution {
  item: {
    name: string;
    id?: string;
  };
  request: {
    method: string;
    url: {
      raw: string;
      protocol: string;
      host: string[];
      path: string[];
      toString(): string;
    };
    header?: Array<{key: string; value: string}>;
  };
  response?: {
    code: number;
    status: string;
    responseTime: number;
    responseSize?: number;
    stream?: Uint8Array;
    header?: Array<{key: string; value: string}>;
  };
  assertions?: Array<{
    assertion: string;
    error?: {
      name?: string;
      message?: string;
      toString(): string;
    };
  }>;
}

/**
 * Parsed Newman execution statistics
 */
export interface NewmanExecutionStats {
  collectionName: string;
  totalRequests: number;
  failedRequests: number;
  successRate: number; // Percentage
  totalAssertions: number;
  failedAssertions: number;
  assertionSuccessRate: number; // Percentage
  timings: NewmanTimings;
  failures: NewmanFailedRequest[];
}

/**
 * Timing statistics from Newman run
 */
export interface NewmanTimings {
  started: string; // ISO timestamp
  completed: string; // ISO timestamp
  totalDuration: number; // milliseconds
  responseTimeMin: number; // milliseconds
  responseTimeMax: number; // milliseconds
  responseTimeAvg: number; // milliseconds
}

/**
 * Details of a failed request
 */
export interface NewmanFailedRequest {
  name: string;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  failedAssertions: Array<{
    assertion: string;
    error: string;
  }>;
  responseBody?: string;
}
