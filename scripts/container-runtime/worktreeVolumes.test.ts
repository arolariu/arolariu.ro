// @vitest-environment node
import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import {leaseFixture} from "../platform/__fixtures__/worktreeLease.testing.ts";
import {makeTestLayer, scriptedOutcomes} from "../platform/testing.ts";
import {claimWorktreeLaunch, WorktreePlatform} from "./worktreeLease.ts";
import {prepareWorktreeVolumes} from "./worktreeVolumes.ts";

describe("worktree storage ownership", () => {
  it.each([
    ["rancher", "new"],
    ["podman", "existing"],
    ["podman", "foreign"],
    ["rancher", "in use"],
    ["rancher", "engine changed"],
  ] as const)("handles %s %s volume evidence without deleting data", async (engine, scenario) => {
    const fixture = await leaseFixture();
    try {
      const lease = await Effect.runPromise(
        claimWorktreeLaunch(fixture.checkout).pipe(Effect.provideService(WorktreePlatform, {...fixture.platform, engineKind: engine})),
      );
      const environment = engine === "rancher" ? {DOCKER_HOST: "pinned"} : {CONTAINER_HOST: "pinned"};
      const cli = engine === "rancher" ? "docker" : "podman";
      const commands: string[][] = [];
      const harness = makeTestLayer({
        processes: [
          scriptedOutcomes((request, options) => {
            expect(request.command).toBe(cli);
            expect(options.env).toEqual(environment);
            const args = [...request.args];
            commands.push(args);
            const name = args[1] === "ls" ? args[3]?.slice(5) : args.at(-1);
            let stdout = "";
            if (args[0] === "volume" && args[1] === "ls") stdout = scenario === "new" ? `${name}-other\n` : `${name}\n`;
            else if (args[0] === "volume" && args[1] === "create") stdout = `${name}\n`;
            else if (args[0] === "volume" && args[1] === "inspect")
              stdout = JSON.stringify([
                {
                  Name: name,
                  Driver: "local",
                  Labels: {"ro.arolariu.worktree.scope": scenario === "foreign" ? "b".repeat(32) : lease.scopeId},
                  Options: engine === "rancher" ? null : {},
                },
              ]);
            else if (args[0] === "ps") stdout = scenario === "in use" ? "foreign-container\n" : "";
            else throw new Error("Unexpected storage command");
            return {kind: "succeeded", exitCode: 0, stdout, stderr: "", durationMs: 0};
          }),
        ],
      });
      let probes = 0;
      const run = Effect.runPromise(
        prepareWorktreeVolumes(
          lease,
          Effect.sync(() => ({
            engine,
            environment,
            fingerprint: scenario === "engine changed" && ++probes > 1 ? "e".repeat(64) : lease.engineId,
          })),
        ).pipe(Effect.provide(harness.layer)),
      );
      if (scenario === "new" || scenario === "existing") {
        await expect(run).resolves.toEqual(lease.volumes);
        expect(commands.filter((args) => args[1] === "inspect")).toHaveLength(4);
        expect(commands.filter((args) => args[1] === "create")).toHaveLength(scenario === "new" ? 4 : 0);
      } else {
        await expect(run).rejects.toThrow("Scoped storage could not be verified");
        expect(commands.filter((args) => args[1] === "create")).toHaveLength(0);
        expect(commands.filter((args) => args[1] === "ls")).toHaveLength(1);
      }
    } finally {
      await fixture.dispose();
    }
  });
});
