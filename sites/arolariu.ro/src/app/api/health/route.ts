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
  createHistogram,
  createHttpServerAttributes,
  logWithTrace,
  setSpanAttributes,
  withSpan,
} from "@/instrumentation.server";
import {NextResponse} from "next/server";

export const dynamic = "force-dynamic";

const healthCheckDuration = createHistogram("website.health.duration", "Health check total duration", "ms");

/** Whether we're running with Azure identity (determines exp URL). */
const HAS_AZURE_CLIENT_ID = Boolean(process.env["AZURE_CLIENT_ID"]);

// eslint-disable-next-line sonarjs/no-clear-text-protocols -- local Docker bridge
const EXP_URL: string = HAS_AZURE_CLIENT_ID ? "https://exp.arolariu.ro" : "http://exp";
// eslint-disable-next-line sonarjs/no-clear-text-protocols -- local Docker bridge
const API_URL: string = HAS_AZURE_CLIENT_ID ? "https://api.arolariu.ro" : "http://api:8080";

type DependencyStatus = {
  readonly status: "Healthy" | "Degraded" | "Unhealthy";
  readonly latencyMs: number;
  readonly statusCode?: number;
  readonly error?: string;
};

type HealthResponse = {
  readonly status: "Healthy" | "Degraded" | "Unhealthy";
  readonly timestamp: string;
  readonly uptimeSeconds: number;
  readonly environment: string;
  readonly commitSha: string;
  readonly nodeVersion: string;
  readonly dependencies: {
    readonly exp: DependencyStatus;
    readonly api: DependencyStatus;
  };
};

const startedAt = Date.now();

async function checkDependency(name: string, url: string): Promise<DependencyStatus> {
  const start = performance.now();
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const latencyMs = Math.round(performance.now() - start);

    if (response.ok) {
      return {status: "Healthy", latencyMs, statusCode: response.status};
    }
    return {status: "Degraded", latencyMs, statusCode: response.status};
  } catch (error) {
    const latencyMs = Math.round(performance.now() - start);
    const message = error instanceof Error ? error.message : String(error);
    logWithTrace("warn", `Health check failed for ${name}`, {url, error: message}, "api");
    return {status: "Unhealthy", latencyMs, error: message};
  }
}

/**
 * GET /api/health — website health probe.
 *
 * @returns JSON health report with dependency latencies.
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
  return withSpan("api.health.check", async () => {
    const checkStart = performance.now();

    addSpanEvent("health.check.start");
    setSpanAttributes({
      "health.exp_url": EXP_URL,
      "health.api_url": API_URL,
    });

    // Check dependencies in parallel
    const [exp, api] = await Promise.all([
      checkDependency("exp", `${EXP_URL}/api/health`),
      checkDependency("api", `${API_URL}/health`),
    ]);

    addSpanEvent("health.check.complete", {
      "exp.status": exp.status,
      "exp.latency_ms": exp.latencyMs,
      "api.status": api.status,
      "api.latency_ms": api.latencyMs,
    });

    // Overall status: Unhealthy if any dep is Unhealthy, Degraded if any is Degraded
    const statuses = [exp.status, api.status];
    const overallStatus: "Healthy" | "Degraded" | "Unhealthy" = statuses.includes("Unhealthy")
      ? "Unhealthy"
      : statuses.includes("Degraded")
        ? "Degraded"
        : "Healthy";

    const totalMs = Math.round(performance.now() - checkStart);
    healthCheckDuration.record(totalMs, {
      ...createHttpServerAttributes("GET", overallStatus === "Healthy" ? 200 : 503, {route: "/api/health"}),
    });

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      environment: process.env["SITE_ENV"] ?? "unknown",
      commitSha: process.env["COMMIT_SHA"] ?? "unknown",
      nodeVersion: process.version,
      dependencies: {exp, api},
    };

    logWithTrace("info", "Health check completed", {status: overallStatus, totalMs}, "api");

    const httpStatus = overallStatus === "Healthy" ? 200 : 503;
    return NextResponse.json(response, {status: httpStatus});
  });
}
