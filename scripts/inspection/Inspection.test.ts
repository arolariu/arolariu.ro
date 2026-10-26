// @vitest-environment node
/**
 * @fileoverview Tests for the Effect `Inspection` service and its harness counterpart.
 * @module scripts/inspection/Inspection.test
 */

import {Cause, Effect, Exit} from "effect";
import {describe, expect} from "vitest";

import {createRepositoryPaths} from "../common/repository-paths.ts";
import {effectTest, makeTestLayer, repositoryFixtureRoot} from "../platform/testing.ts";
import {Inspection} from "./Inspection.ts";
import type {RepositoryInspectionRequest} from "./repository.ts";

const paths = createRepositoryPaths(repositoryFixtureRoot);

/** A request over the fixture paths. */
const request: RepositoryInspectionRequest = {profile: "quick", paths};

describe("InspectionLive", () => {
  effectTest(
    "returns the same session for equal requests",
    () =>
      Effect.gen(function* () {
        // Arrange
        const inspection = yield* Inspection;

        // Act
        const [first, second] = yield* Effect.all(
          [inspection.session(request), inspection.session({profile: "quick", paths: createRepositoryPaths(repositoryFixtureRoot)})],
          {concurrency: 2},
        );

        // Assert
        expect(second).toBe(first);
      }),
    makeTestLayer().layer,
  );

  effectTest(
    "returns distinct sessions for a different profile or requested engine",
    () =>
      Effect.gen(function* () {
        // Arrange
        const inspection = yield* Inspection;

        // Act
        const quick = yield* inspection.session(request);
        const full = yield* inspection.session({profile: "full", paths});
        const podman = yield* inspection.session({...request, requestedEngine: "podman"});

        // Assert
        expect(full).not.toBe(quick);
        expect(podman).not.toBe(quick);
      }),
    makeTestLayer().layer,
  );

  effectTest(
    "dies on a conflicting request",
    () =>
      Effect.gen(function* () {
        // Arrange
        const inspection = yield* Inspection;
        yield* inspection.session(request);

        // Act
        const exit = yield* Effect.exit(
          inspection.session({...request, paths: {...paths, websiteEnvironment: `${paths.websiteEnvironment}.other`}}),
        );

        // Assert
        expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
        expect(Exit.isFailure(exit) ? String(Cause.squash(exit.cause)) : "").toMatch(/conflicts with an already-created session/u);
      }),
    makeTestLayer().layer,
  );

  effectTest(
    "serves the quick-profile aggregate fact without running a process",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* (yield* Inspection).session(request);

        // Act
        const outcome = yield* session.inspect("aggregate");

        // Assert
        expect(outcome.kind).toBe("unavailable");
      }),
    makeTestLayer().layer,
  );
});

describe("harness inspection", () => {
  const dotnet = {kind: "unavailable", reason: "scripted", durationMs: 1} as const;

  effectTest(
    "answers scripted keys and dies on an unscripted key",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* (yield* Inspection).session(request);

        // Act
        const scripted = yield* session.inspect("dotnet");
        yield* session.invalidate("dotnet");
        yield* session.updateInfrastructureEngine("podman");
        const unscripted = yield* Effect.exit(session.inspect("python"));

        // Assert
        expect(scripted).toEqual(dotnet);
        expect(Exit.isFailure(unscripted) ? String(Cause.squash(unscripted.cause)) : "").toBe("Error: unscripted inspection: python");
      }),
    makeTestLayer({inspection: {dotnet}}).layer,
  );
});
