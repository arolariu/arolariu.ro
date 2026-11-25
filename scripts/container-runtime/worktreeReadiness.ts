/** @fileoverview Internal, injectable handoff gate. No live evidence source or CLI entry point. */
import {Effect} from "effect";

import {matchesWorktreeReceipt, observeOwnedWorktreeAspire, type OwnedWorktreeAspire} from "./worktreeAspire.ts";
import {
  isWorktreeProcessIdentity,
  sameWorktreeProcess,
  WorktreePlatform,
  worktreeDescriptorFor,
  worktreeRecord,
  type WorktreeProcessIdentity,
} from "./worktreeLease.ts";
import type {WorktreeCheckout} from "./worktreePreflight.ts";

const healthRoutes = [
  ["website", "/api/health/"],
  ["dashboard", null],
  ["api", "/health"],
  ["exp", "/api/ready"],
  ["identity", "/health"],
] as const;
type Endpoint = (typeof healthRoutes)[number][0];
const healthyResources = ["exp", "local-identities", "api", "website"] as const;

const smokeNames = ["website-auth-route", "seeded-identity-api-metadata"] as const;
type SmokeName = (typeof smokeNames)[number];
const smokeChecks = {
  "website-auth-route": [["website", "/auth/sign-in/", "ordinary-auth-rendered"]],
  "seeded-identity-api-metadata": [
    ["identity", "/personas", "expected-persona-catalog"],
    ["api", "/swagger/v1/swagger.json", "expected-openapi-metadata"],
  ],
} as const satisfies Record<SmokeName, readonly (readonly [Endpoint, string, string])[]>;

interface WorktreeProbeTarget {
  readonly scopeId: string;
  readonly runId: string;
  /** Expected origins, not permission to connect to an unverified listener. */
  readonly origins: Readonly<Record<Endpoint, string>>;
}

/**
 * Trusted, read-only dependency, intentionally not implemented for native Aspire.
 * Each call must freshly verify the selected run, actual connected listener and transport before
 * returning evidence. A response body, non-owned listener, origin string, or replay is not proof.
 * Calls must honor cancellation, not follow redirects or contact foreign origins, and never log
 * raw response bodies, secrets, or provider errors. This is not an interface for arbitrary commands.
 */
export interface WorktreeReadinessSource {
  /** Run receipt, launcher-exit proof, AppHost states, independently verified owned listeners, and actual endpoint connections. */
  readonly observe: (target: WorktreeProbeTarget, signal: AbortSignal) => Promise<unknown>;
  /** Run receipt, the fixed probe name, and content assertions plus connection proofs (not response bodies). */
  readonly smoke: (name: SmokeName, target: WorktreeProbeTarget, signal: AbortSignal) => Promise<unknown>;
}

const blockedReasons = {
  evidence: "No verified readiness source is available.",
  ownership: "The current owned Aspire run could not be verified.",
  readiness: "Owned graph health, launcher lifetime, or exact endpoints could not be verified.",
  smoke: "The required read-only smoke checks could not be verified.",
  revalidation: "The owned run or its readiness evidence could not be reverified.",
  timeout: "The handoff verification exceeded its time budget.",
} as const;
type BlockedStage = keyof typeof blockedReasons;
type BlockedHandoff = {readonly status: "blocked"; readonly stage: BlockedStage; readonly reason: string};

/** Only the internal gate can project URLs; blocked outcomes carry no adapter-supplied text. */
export type WorktreeHandoff =
  | BlockedHandoff
  | {
      readonly status: "ready";
      readonly runId: string;
      readonly websiteUrl: string;
      readonly dashboardUrl: string;
      readonly smoke: readonly SmokeName[];
      readonly stopCommand: string;
    };

function blocked(stage: BlockedStage): BlockedHandoff {
  return {status: "blocked", stage, reason: blockedReasons[stage]};
}

interface VerifiedConnection {
  readonly listener: WorktreeProcessIdentity;
  readonly leafSha256: string | null;
}

function probeTarget(run: OwnedWorktreeAspire): WorktreeProbeTarget {
  const descriptor = worktreeDescriptorFor(run);
  const {ports, loopbackHost, websiteOrigin, scopeId, runId} = descriptor;
  return Object.freeze({
    scopeId,
    runId,
    origins: Object.freeze({
      website: websiteOrigin,
      dashboard: `https://${loopbackHost}:${ports.dashboardHttps}`,
      api: `https://${loopbackHost}:${ports.api}`,
      exp: `http://${loopbackHost}:${ports.exp}`,
      identity: `http://${loopbackHost}:${ports.localIdentity}`,
    }),
  });
}

function receiptMatches(raw: unknown, run: OwnedWorktreeAspire): raw is Readonly<Record<string, unknown>> {
  return worktreeRecord(raw) && matchesWorktreeReceipt(raw, run, run.processIdentity);
}

function verifyConnection(raw: unknown, run: OwnedWorktreeAspire, origin: string, path: string | null): VerifiedConnection | null {
  if (!receiptMatches(raw, run)) return null;
  const {url, responseUrl, status, redirected, remoteAddress, remotePort, listener, tls} = raw;
  const {hostname, port, protocol} = new URL(origin);
  if (url !== origin + (path ?? "") || remoteAddress !== "127.0.0.1" || remotePort !== Number(port) || !isWorktreeProcessIdentity(listener))
    return null;
  if (path !== null && (redirected !== false || responseUrl !== url || status !== 200)) return null;
  // Snapshot only the verified identity fields; the adapter retains no mutable reference into our baseline.
  const identity = {pid: listener.pid, started: listener.started, image: listener.image};
  if (protocol === "http:") return tls === null ? {listener: identity, leafSha256: null} : null;
  if (!worktreeRecord(tls) || tls["verified"] !== true || tls["exactSan"] !== hostname) return null;
  const leafSha256 = tls["leafSha256"];
  return typeof leafSha256 === "string" && /^[a-f0-9]{64}$/u.test(leafSha256) ? {listener: identity, leafSha256} : null;
}

type Connections = ReadonlyMap<Endpoint, VerifiedConnection>;

function sameConnection(next: VerifiedConnection, baseline: VerifiedConnection | undefined): boolean {
  return baseline !== undefined && sameWorktreeProcess(baseline.listener, next.listener) && baseline.leafSha256 === next.leafSha256;
}

function verifyHealth(raw: unknown, run: OwnedWorktreeAspire, target: WorktreeProbeTarget, baseline?: Connections): Connections | null {
  if (!receiptMatches(raw, run)) return null;
  const {survivedLauncherExit, bootstrapExitCode, resources, listeners, endpoints} = raw;
  if (
    survivedLauncherExit !== true
    || bootstrapExitCode !== 0
    || !worktreeRecord(resources)
    || !healthyResources.every((name) => resources[name] === "healthy")
    || !worktreeRecord(listeners)
    || !worktreeRecord(endpoints)
  )
    return null;
  const connections = new Map<Endpoint, VerifiedConnection>();
  for (const [name, path] of healthRoutes) {
    const connection = verifyConnection(endpoints[name], run, target.origins[name], path);
    const ownedListener = listeners[name];
    if (
      !connection
      || !isWorktreeProcessIdentity(ownedListener)
      || !sameWorktreeProcess(ownedListener, connection.listener)
      || (baseline && !sameConnection(connection, baseline.get(name)))
    )
      return null;
    connections.set(name, connection);
  }
  return connections;
}

function verifySmoke(raw: unknown, name: SmokeName, run: OwnedWorktreeAspire, target: WorktreeProbeTarget, baseline: Connections): boolean {
  if (!receiptMatches(raw, run) || raw["name"] !== name || raw["passed"] !== true) return false;
  const {assertions, endpoints} = raw;
  return (
    worktreeRecord(assertions)
    && worktreeRecord(endpoints)
    && smokeChecks[name].every(([endpoint, path, assertion]) => {
      const connection = verifyConnection(endpoints[endpoint], run, target.origins[endpoint], path);
      return assertions[assertion] === true && connection !== null && sameConnection(connection, baseline.get(endpoint));
    })
  );
}

function readEvidence<A>(operation: (signal: AbortSignal) => Promise<A>): Effect.Effect<A | null> {
  // Neither a thrown string nor a rejected error/object becomes user-facing text.
  return Effect.tryPromise({try: operation, catch: () => null}).pipe(Effect.orElseSucceed(() => null));
}

const maxHandoffMs = 30_000;

/**
 * Validates one existing run. Never launches, reserves, writes receipts, stops, or retries an
 * unverified listener. A future caller must supply trusted evidence (and prove lifetime outside
 * this gate); the current product has no such caller. Ready is a point-in-time observation.
 */
export function validateWorktreeHandoff(
  checkout: WorktreeCheckout,
  runId: string,
  source?: WorktreeReadinessSource,
  timeoutMs = maxHandoffMs,
): Effect.Effect<WorktreeHandoff, never, WorktreePlatform> {
  if (!source) return Effect.succeed(blocked("evidence"));
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > maxHandoffMs) return Effect.succeed(blocked("timeout"));
  return Effect.suspend(() => {
    let stage: BlockedStage = "ownership";
    return Effect.gen(function* () {
      const run = yield* observeOwnedWorktreeAspire(checkout, runId);
      if (!run) return blocked(stage);
      const target = probeTarget(run);

      stage = "readiness";
      const baseline = verifyHealth(yield* readEvidence((signal) => source.observe(target, signal)), run, target);
      if (!baseline) return blocked(stage);

      for (const name of smokeNames) {
        stage = "revalidation";
        if (!(yield* observeOwnedWorktreeAspire(checkout, runId, run))) return blocked(stage);
        stage = "smoke";
        const smoke = yield* readEvidence((signal) => source.smoke(name, target, signal));
        if (!verifySmoke(smoke, name, run, target, baseline)) return blocked(stage);
      }

      stage = "revalidation";
      if (!(yield* observeOwnedWorktreeAspire(checkout, runId, run))) return blocked(stage);
      const refreshed = yield* readEvidence((signal) => source.observe(target, signal));
      if (!verifyHealth(refreshed, run, target, baseline) || !(yield* observeOwnedWorktreeAspire(checkout, runId, run))) {
        return blocked(stage);
      }
      return {
        status: "ready",
        runId: run.runId,
        websiteUrl: target.origins.website,
        dashboardUrl: target.origins.dashboard,
        smoke: [...smokeNames],
        stopCommand: `node scripts/cli.ts dev worktree stop --engine podman --expected-run ${run.runId}`,
      } as const;
    }).pipe(
      Effect.catchCause(() => Effect.succeed(blocked(stage))),
      Effect.timeoutOrElse({duration: timeoutMs, orElse: () => Effect.succeed(blocked("timeout"))}),
    );
  });
}
