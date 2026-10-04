/**
 * @fileoverview Effect `Inspection` service: shares one memoized repository inspection session per
 * request across every program of one invocation.
 * @module scripts/inspection/Inspection
 *
 * @remarks
 * Effect counterpart of the retired legacy `RepositoryInspectionRuntime`
 * (`MemoizedInspectionRuntime`). {@link InspectionLive} keeps a
 * layer-scoped map from {@link repositoryInspectionRequestKey} to session, so every session lives
 * (and its in-flight providers are interrupted) with the layer. {@link InspectionLayerFactory} is the
 * layer `commandLayer` builds each invocation's `Inspection` from; the test harness points it at a
 * scripted layer.
 */

import {Context, Deferred, Effect, Layer, Scope} from "effect";

import {
  createRepositoryInspectionSession,
  equivalentRepositoryInspectionRequests,
  repositoryInspectionConflictMessage,
  repositoryInspectionRequestKey,
  type RepositoryInspectionRequest,
  type RepositoryInspectionSession,
} from "./repository.ts";
import type {InspectionRequirements} from "./types.ts";

/** Service tag for shared repository inspection sessions. */
export class Inspection extends Context.Service<
  Inspection,
  {
    /** Returns the shared session for `request`, creating it on first use. */
    readonly session: (request: RepositoryInspectionRequest) => Effect.Effect<RepositoryInspectionSession>;
  }
>()("arolariu/scripts/Inspection") {}

/** One memoized session and the request that created it. */
interface SessionEntry {
  readonly request: RepositoryInspectionRequest;
  readonly session: Deferred.Deferred<RepositoryInspectionSession>;
}

/**
 * Live {@link Inspection} layer.
 *
 * @remarks
 * Captures the {@link InspectionRequirements} services and the layer scope once. An equal request
 * key returns the same session (concurrent first calls share one creation); the same key with a
 * structurally different request (for example the same root, profile, and engine but different
 * paths) dies with the legacy conflicting-request message. Sessions live in the layer scope.
 */
export const InspectionLive: Layer.Layer<Inspection, never, InspectionRequirements> = Layer.effect(
  Inspection,
  Effect.gen(function* () {
    const context = yield* Effect.context<InspectionRequirements | Scope.Scope>();
    const sessions = new Map<string, SessionEntry>();

    const session = (request: RepositoryInspectionRequest): Effect.Effect<RepositoryInspectionSession> =>
      Effect.uninterruptibleMask((restore) =>
        Effect.suspend(() => {
          const key = repositoryInspectionRequestKey(request);
          const existing = sessions.get(key);
          if (existing !== undefined) {
            return equivalentRepositoryInspectionRequests(existing.request, request)
              ? restore(Deferred.await(existing.session))
              : Effect.die(new Error(repositoryInspectionConflictMessage(key)));
          }
          const created = Deferred.makeUnsafe<RepositoryInspectionSession>();
          sessions.set(key, {request, session: created});
          return createRepositoryInspectionSession(request).pipe(
            Effect.provideContext(context),
            Effect.exit,
            Effect.flatMap((exit) => Deferred.done(created, exit)),
            Effect.andThen(restore(Deferred.await(created))),
          );
        }),
      );

    return Inspection.of({session});
  }),
);

/** A layer building the {@link Inspection} service over one invocation's inspection services. */
export type InspectionLayer = Layer.Layer<Inspection, never, InspectionRequirements>;

/**
 * The layer `commandLayer` builds each invocation's {@link Inspection} from; defaults to
 * {@link InspectionLive}.
 *
 * @remarks
 * The test harness sets it to its scripted inspection layer (or `InspectionLive` over its own
 * services), so a CLI run under test resolves the same sessions as a direct effect test.
 */
export const InspectionLayerFactory: Context.Reference<InspectionLayer> = Context.Reference<InspectionLayer>(
  "arolariu/scripts/InspectionLayerFactory",
  {
    defaultValue: () => InspectionLive,
  },
);
