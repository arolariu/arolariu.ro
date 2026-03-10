/**
 * @fileoverview /api/health route handler — website health probe with dependency checks.
 * @module sites/arolariu.ro/src/app/api/health/route
 *
 * @remarks
 * Reports website health status including latency to upstream dependencies
 * (exp.arolariu.ro config proxy and api.arolariu.ro backend API).
 * Instrumented with OpenTelemetry spans and metrics.
 */

import {
  addSpanEvent,
  createCounter,
  createHistogram,
  createHttpServerAttributes,
  logWithTrace,
  setSpanAttributes,
  withSpan,
} from "@/instrumentation.server";
import {NextResponse} from "next/server";
import {version as nextVersion} from "next/package.json";

export const dynamic = "force-dynamic";

const healthCheckDuration = createHistogram("website.health.duration", "Health check total duration", "ms");
const healthCheckCounter = createCounter("website.health.requests", "Total health check requests", "1");

/** Whether we're running with Azure identity (determines exp URL). */
const HAS_AZURE_CLIENT_ID = Boolean(process.env["AZURE_CLIENT_ID"]);

// eslint-disable-next-line sonarjs/no-clear-text-protocols -- local Docker bridge
const EXP_URL: string = HAS_AZURE_CLIENT_ID ? "https://exp.arolariu.ro" : "http://exp";
// eslint-disable-next-line sonarjs/no-clear-text-protocols -- local Docker bridge
const API_URL: string = HAS_AZURE_CLIENT_ID ? "https://api.arolariu.ro" : "http://api:8080";

type HealthStatus = "Healthy" | "Degraded" | "Unhealthy";

type DependencyStatus = {
  readonly name: string;
  readonly status: HealthStatus;
  readonly url: string;
  readonly latencyMs: number;
  readonly statusCode?: number;
  readonly error?: string;
};

type HealthResponse = {
  readonly status: HealthStatus;
  readonly timestamp: string;
  readonly checkDurationMs: number;
  readonly process: {
    readonly uptimeSeconds: number;
    readonly startedAt: string;
    readonly nodeVersion: string;
    readonly nextVersion: string;
    readonly platform: string;
    readonly arch: string;
    readonly memoryUsageMB: {
      readonly rss: number;
      readonly heapUsed: number;
      readonly heapTotal: number;
    };
  };
  readonly build: {
    readonly commitSha: string;
    readonly environment: string;
    readonly siteName: string;
    readonly siteUrl: string;
    readonly infraMode: string;
  };
  readonly dependencies: readonly DependencyStatus[];
};

const startedAt = Date.now();
const startedAtISO = new Date(startedAt).toISOString();

/**
 * Checks a single upstream dependency by issuing an HTTP GET.
 * Returns structured status with latency measurement.
 */
async function checkDependency(name: string, url: string): Promise<DependencyStatus> {
  const start = performance.now();
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const latencyMs = Math.round(performance.now() - start);

    if (response.ok) {
      return {name, status: "Healthy", url, latencyMs, statusCode: response.status};
    }
    return {name, status: "Degraded", url, latencyMs, statusCode: response.status};
  } catch (error) {
    const latencyMs = Math.round(performance.now() - start);
    const message = error instanceof Error ? error.message : String(error);
    logWithTrace("warn", `Health check failed for ${name}`, {url, error: message}, "api");
    return {name, status: "Unhealthy", url, latencyMs, error: message};
  }
}

function deriveOverallStatus(dependencies: readonly DependencyStatus[]): HealthStatus {
  if (dependencies.some((d) => d.status === "Unhealthy")) return "Unhealthy";
  if (dependencies.some((d) => d.status === "Degraded")) return "Degraded";
  return "Healthy";
}

/**
 * GET /api/health — website health probe.
 *
 * @returns JSON health report with dependency latencies, process info, and build metadata.
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
  return withSpan("api.health.check", async () => {
    const checkStart = performance.now();
    healthCheckCounter.add(1);

    addSpanEvent("health.check.start");
    setSpanAttributes({
      "health.exp_url": EXP_URL,
      "health.api_url": API_URL,
    });

    // Check dependencies in parallel
    const dependencies = await Promise.all([
      checkDependency("exp (config proxy)", `${EXP_URL}/api/health`),
      checkDependency("api (backend)", `${API_URL}/health`),
    ]);

    const overallStatus = deriveOverallStatus(dependencies);
    const checkDurationMs = Math.round(performance.now() - checkStart);

    addSpanEvent("health.check.complete", {
      "overall.status": overallStatus,
      "check.duration_ms": checkDurationMs,
      "dependencies.count": dependencies.length,
    });

    healthCheckDuration.record(checkDurationMs, {
      ...createHttpServerAttributes("GET", overallStatus === "Healthy" ? 200 : 503, {route: "/api/health"}),
    });

    const mem = process.memoryUsage();
    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checkDurationMs,
      process: {
        uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
        startedAt: startedAtISO,
        nodeVersion: process.version,
        nextVersion: nextVersion ?? "unknown",
        platform: process.platform,
        arch: process.arch,
        memoryUsageMB: {
          rss: Math.round(mem.rss / 1024 / 1024),
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        },
      },
      build: {
        commitSha: process.env["COMMIT_SHA"] ?? "unknown",
        environment: process.env["SITE_ENV"] ?? "unknown",
        siteName: process.env["SITE_NAME"] ?? "unknown",
        siteUrl: process.env["SITE_URL"] ?? "unknown",
        infraMode: process.env["INFRA"] ?? "unknown",
      },
      dependencies,
    };

    logWithTrace("info", "Health check completed", {status: overallStatus, checkDurationMs}, "api");

    const httpStatus = overallStatus === "Healthy" ? 200 : 503;
    return NextResponse.json(response, {status: httpStatus});
  });
}
