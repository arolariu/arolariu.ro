// @vitest-environment node
/**
 * @fileoverview Tests for the repository-inspection composition seam: memoization, conflict
 * detection, parent linkage, explicit override precedence, and end-to-end composition through the
 * real command lifecycle.
 * @module scripts/inspection/runtime-capability.test
 */

import {describe, expect, it, vi} from "vitest";

import {createRepositoryPaths} from "../common/repository-paths.ts";
import type {CommandExecutionContext} from "../core/command/command-execution.ts";
import {defineCommand, type LazyMonorepoCommand} from "../core/command/lazy-monorepo-command.ts";
import {CommandCancellation} from "../core/runtime/cancellation.ts";
import {buildCommandHost} from "../testing/builders/command-host.builder.ts";
import {buildCommandExecutionContext, buildRuntimeExecutionContext} from "../testing/builders/runtime-context.builder.ts";
import {
  buildInspectionRuntimeExecutionContext,
  buildRepositoryInspectionRuntime,
  createRepositoryInspectionSessionStub,
} from "../testing/fixtures/inspection.fixture.ts";
import {repositoryFixtureRoot} from "../testing/fixtures/repository.fixture.ts";
import type {RepositoryInspectionSession} from "./repository.ts";
import {
  createInspectionRuntimeExecutionContext,
  createRepositoryInspectionRuntime,
  hasInspectionRuntimeCapability,
  MemoizedInspectionRuntime,
  repositoryInspectionRequestKey,
  type InspectionRuntimeExecutionContext,
  type RepositoryInspectionRequest,
  type RepositoryInspectionRuntime,
} from "./runtime-capability.ts";

const FIXTURE_PATHS = createRepositoryPaths(repositoryFixtureRoot);

function quickRequest(): RepositoryInspectionRequest {
  return {profile: "quick", paths: createRepositoryPaths(repositoryFixtureRoot)};
}

describe("MemoizedInspectionRuntime", () => {
  it("shares one session for an identical request and rejects a differing request on a used key", () => {
    const created: string[] = [];
    const memoized = new MemoizedInspectionRuntime<Readonly<{profile: string; extra?: string}>, string>(
      (request) => {
        created.push(request.profile);
        return `session:${request.profile}`;
      },
      (request) => request.profile,
    );
    const defaultKeyed = new MemoizedInspectionRuntime<Readonly<{tags: readonly string[]}>, string>(() => "session");
    expect(memoized.getRepositorySession({profile: "full"})).toBe("session:full");
    expect(memoized.getRepositorySession({profile: "full"})).toBe("session:full");
    expect(defaultKeyed.getRepositorySession({tags: ["a"]})).toBe(defaultKeyed.getRepositorySession({tags: ["a"]}));
    expect(created).toEqual(["full"]);
    expect(() => memoized.getRepositorySession({profile: "full", extra: "other"})).toThrow(
      'Inspection request for key "full" conflicts with an already-created session.',
    );
  });
});

describe("createRepositoryInspectionRuntime", () => {
  it("shares one session per root, profile, and engine and rejects a conflicting paths object", () => {
    const sessions: RepositoryInspectionSession[] = [];
    const runtime = createRepositoryInspectionRuntime(() => {
      const session = createRepositoryInspectionSessionStub();
      sessions.push(session);
      return session;
    });
    const first = runtime.getRepositorySession({profile: "quick", paths: FIXTURE_PATHS});
    expect(runtime.getRepositorySession(quickRequest())).toBe(first);
    expect(sessions).toHaveLength(1);
    expect(() =>
      runtime.getRepositorySession({
        profile: "quick",
        paths: {...FIXTURE_PATHS, websiteEnvironment: `${FIXTURE_PATHS.websiteEnvironment}.other`},
      }),
    ).toThrow(/conflicts with an already-created session/u);
  });

  it("derives an identical key for structurally equal requests regardless of property order", () => {
    const first = repositoryInspectionRequestKey({profile: "full", paths: FIXTURE_PATHS, requestedEngine: "podman"});
    expect(
      repositoryInspectionRequestKey({requestedEngine: "podman", paths: createRepositoryPaths(repositoryFixtureRoot), profile: "full"}),
    ).toBe(first);
    expect(repositoryInspectionRequestKey(quickRequest())).not.toBe(first);
  });
});

describe("createInspectionRuntimeExecutionContext", () => {
  it("creates a production registry bound to the scope when neither a parent nor an override is supplied", async () => {
    const controller = new AbortController();
    const runtime = createInspectionRuntimeExecutionContext(buildRuntimeExecutionContext({signal: controller.signal}));
    const session = runtime.inspection.getRepositorySession(quickRequest());
    expect(hasInspectionRuntimeCapability(buildRuntimeExecutionContext())).toBe(false);
    expect(hasInspectionRuntimeCapability(runtime)).toBe(true);
    expect(runtime.inspection.getRepositorySession(quickRequest())).toBe(session);
    controller.abort(new CommandCancellation("Command interrupted by SIGINT.", 130));
    await expect(session.inspect("packages")).rejects.toBeInstanceOf(CommandCancellation);
  });

  it("returns the parent's registry and its identical session when a parent carries the capability", () => {
    const parentContext = buildCommandExecutionContext({runtime: buildInspectionRuntimeExecutionContext()});
    const parentRuntime = parentContext.runtime;
    if (!hasInspectionRuntimeCapability(parentRuntime)) {
      throw new Error("The parent context must carry the repository-inspection capability.");
    }
    const childRuntime = createInspectionRuntimeExecutionContext(buildRuntimeExecutionContext(), parentContext);
    expect(childRuntime.inspection).toBe(parentRuntime.inspection);
    expect(childRuntime.inspection.getRepositorySession(quickRequest())).toBe(
      parentRuntime.inspection.getRepositorySession(quickRequest()),
    );
  });

  it("prefers an explicit override over a parent registry and never builds a production registry for it", () => {
    const override = buildRepositoryInspectionRuntime();
    const parentContext = buildCommandExecutionContext({runtime: buildInspectionRuntimeExecutionContext()});
    const withParent = createInspectionRuntimeExecutionContext(buildRuntimeExecutionContext(), parentContext, override);
    const withoutParent = createInspectionRuntimeExecutionContext(buildRuntimeExecutionContext(), undefined, override);
    withoutParent.inspection.getRepositorySession(quickRequest());
    expect(withParent.inspection).toBe(override);
    expect(withoutParent.inspection).toBe(override);
    expect(override.requests).toHaveLength(1);
  });
});

/** Typed input every composed fixture command in this suite decodes. */
type FixtureInput = Readonly<{token: string}>;

function defineInspectionFixtureCommand<TOutput>(
  name: string,
  inspection: RepositoryInspectionRuntime,
  execute: (context: Readonly<CommandExecutionContext<InspectionRuntimeExecutionContext>>, input: FixtureInput) => Promise<TOutput>,
): LazyMonorepoCommand<FixtureInput, TOutput, never> {
  return defineCommand<FixtureInput, TOutput, InspectionRuntimeExecutionContext>(
    {
      name,
      description: `Fixture ${name} command.`,
      configure: () => undefined,
      decode: () => ({token: name}),
      createRuntimeContext: (baseRuntime, parent) => createInspectionRuntimeExecutionContext(baseRuntime, parent, inspection),
      execute,
      complete: (output) => ({exitCode: 0, value: output}),
    },
    {host: buildCommandHost()},
  );
}

describe("composed inspection capability through the command lifecycle", () => {
  it("hands a composed child the identical registry and session its parent carries", async () => {
    const inspection = buildRepositoryInspectionRuntime();
    const observed: Readonly<{registry: RepositoryInspectionRuntime; session: RepositoryInspectionSession}>[] = [];
    const record = (context: Readonly<CommandExecutionContext<InspectionRuntimeExecutionContext>>): void => {
      observed.push({
        registry: context.runtime.inspection,
        session: context.runtime.inspection.getRepositorySession(quickRequest()),
      });
    };
    const child = defineInspectionFixtureCommand("child", inspection, async (context) => {
      record(context);
      return "child-done";
    });
    const parent = defineInspectionFixtureCommand("parent", inspection, async (context, input) => {
      record(context);
      return child.invoke(input, {parent: context});
    });
    const execution = await parent.invoke({token: "parent"});
    expect(execution.status).toBe("completed");
    expect(observed).toHaveLength(2);
    expect(observed[1]?.registry).toBe(observed[0]?.registry);
    expect(observed[1]?.session).toBe(observed[0]?.session);
  });

  it("cancels only the composed child when the child's own invocation signal aborts", async () => {
    const inspection = buildRepositoryInspectionRuntime();
    const childController = new AbortController();
    const childStarted = vi.fn();
    let parentSignalAbortedAfterChild = true;
    let parentCleanupDrainedEarly = true;
    const child = defineInspectionFixtureCommand("child", inspection, async () => {
      childStarted();
      childController.abort(new CommandCancellation("Child cancelled.", 130));
      throw new CommandCancellation("Child cancelled.", 130);
    });
    const parent = defineInspectionFixtureCommand("parent", inspection, async (context, input) => {
      let parentCleanupRan = false;
      context.runtime.cleanup.register("parent", () => {
        parentCleanupRan = true;
      });
      const childExecution = await child.invoke(input, {parent: context, signal: childController.signal});
      parentSignalAbortedAfterChild = context.runtime.signal.aborted;
      parentCleanupDrainedEarly = parentCleanupRan;
      return childExecution;
    });
    const execution = await parent.invoke({token: "parent"});
    expect(childStarted).toHaveBeenCalledTimes(1);
    expect(execution).toMatchObject({status: "completed", exitCode: 0});
    expect(execution.status === "completed" ? execution.value : undefined).toMatchObject({status: "cancelled", exitCode: 130});
    expect(parentSignalAbortedAfterChild).toBe(false);
    expect(parentCleanupDrainedEarly).toBe(false);
  });
});
