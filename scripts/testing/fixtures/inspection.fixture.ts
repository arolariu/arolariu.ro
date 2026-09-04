/**
 * @fileoverview Repository-inspection fixtures: a stub session, a recording registry, and the
 * extended execution context a composed inspection command observes.
 * @module scripts/testing/fixtures/inspection.fixture
 */

import type {RepositoryInspectionSession} from "../../inspection/repository.ts";
import type {
  InspectionRuntimeExecutionContext,
  RepositoryInspectionRequest,
  RepositoryInspectionRuntime,
} from "../../inspection/runtime-capability.ts";
import type {InspectionOutcome} from "../../inspection/types.ts";
import type {RuntimeExecutionContext} from "../../core/runtime/runtime-execution-context.ts";
import {buildRuntimeExecutionContext} from "../builders/runtime-context.builder.ts";

/**
 * Creates a repository inspection session that reports every fact as unavailable, safe to share
 * across commands that never inspect the repository.
 *
 * @returns A session stub.
 */
export function createRepositoryInspectionSessionStub(): RepositoryInspectionSession {
  return {
    inspect: <TValue>(): Promise<InspectionOutcome<TValue>> =>
      Promise.resolve({kind: "unavailable", reason: "Inspection is stubbed in tests.", durationMs: 0}),
    invalidate: (): void => undefined,
    updateInfrastructureEngine: (): void => undefined,
  };
}

/**
 * Builds a registry that hands out one shared session and records every request it received.
 *
 * @param session - Session every request resolves to; defaults to a fresh stub.
 * @returns The registry plus the requests it observed.
 */
export function buildRepositoryInspectionRuntime(
  session: RepositoryInspectionSession = createRepositoryInspectionSessionStub(),
): RepositoryInspectionRuntime & Readonly<{requests: readonly Readonly<RepositoryInspectionRequest>[]}> {
  const requests: Readonly<RepositoryInspectionRequest>[] = [];

  return {
    getRepositorySession: (request: Readonly<RepositoryInspectionRequest>): RepositoryInspectionSession => {
      requests.push(request);
      return session;
    },
    get requests(): readonly Readonly<RepositoryInspectionRequest>[] {
      return requests;
    },
  };
}

/**
 * Builds one deterministic execution context that already carries the inspection registry.
 *
 * @param overrides - Optional runtime capability overrides and an explicit registry.
 * @returns The extended execution context a composed inspection command observes.
 */
export function buildInspectionRuntimeExecutionContext(
  overrides: Readonly<{
    runtime?: Readonly<Partial<RuntimeExecutionContext>>;
    inspection?: RepositoryInspectionRuntime;
  }> = {},
): InspectionRuntimeExecutionContext {
  return {
    ...buildRuntimeExecutionContext(overrides.runtime ?? {}),
    inspection: overrides.inspection ?? buildRepositoryInspectionRuntime(),
  };
}
