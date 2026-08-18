/**
 * @fileoverview Native fetch boundary helpers for real analysis integration tests.
 * @module tests/helpers/analysisBoundary
 *
 * @remarks
 * The helper keeps the real config proxy, auth action, JWT utility, instrumentation,
 * server actions, stores, and components in the module graph. It responds only to
 * native fetch calls crossing the process boundary.
 */

import {vi} from "vitest";

/** Deterministic external API host returned by the real config proxy. */
export const ANALYSIS_API_URL = "https://api.analysis.test";

/** Input observed at the native fetch boundary. */
export type AnalysisFetchRequest = Readonly<{
  url: string;
  init: RequestInit | undefined;
}>;

type AnalysisFetchHandler = (request: AnalysisFetchRequest) => Response | Promise<Response>;

function createConfigResponse(name: string): Response {
  const value =
    name === "Endpoints:Service:Api"
      ? ANALYSIS_API_URL
      : name === "Endpoints:Storage:Blob"
        ? "https://storage.analysis.test"
        : "analysis-test-jwt-secret";

  return new Response(
    JSON.stringify({
      name,
      value,
      availableForTargets: ["website"],
      availableInDocuments: [],
      requiredInDocuments: [],
      description: "Test-only external configuration response.",
      usage: "analysis integration tests",
      refreshIntervalSeconds: 60,
      fetchedAt: "2026-08-18T00:00:00.000Z",
    }),
    {status: 200},
  );
}

/**
 * Installs an external native-fetch handler while retaining real website modules.
 *
 * @param handler - Response factory for API requests after config resolution.
 */
export function installAnalysisFetchHandler(handler: AnalysisFetchHandler): void {
  const fetchMock = vi.mocked(globalThis.fetch);

  fetchMock.mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);

    if (url.startsWith("https://config.analysis.test/api/v1/config")) {
      const configName = new URL(url).searchParams.get("name");
      if (configName === null) {
        return new Response(null, {status: 400});
      }

      return createConfigResponse(configName);
    }

    return handler({url, init});
  });
}

/**
 * Returns API requests observed after the real config proxy resolved their URL.
 *
 * @returns Requests sent to the deterministic external analysis API host.
 */
export function getAnalysisApiRequests(): ReadonlyArray<AnalysisFetchRequest> {
  return vi
    .mocked(globalThis.fetch)
    .mock.calls.map(([input, init]) => ({
      url: input instanceof Request ? input.url : String(input),
      init,
    }))
    .filter((request) => request.url.startsWith(ANALYSIS_API_URL));
}
