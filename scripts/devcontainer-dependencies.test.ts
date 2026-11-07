import {resolve} from "node:path";

import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import * as preparation from "./platform/devcontainer-testing.ts";
import {makeNodeLayer} from "./platform/layers.ts";

const layer = makeNodeLayer({mode: "silent", verbose: false, color: false, context: "devcontainer-dependencies"});

describe("filtered devcontainer CLI dependencies", () => {
  it.each([
    ["website", ["@arolariu/website"]],
    ["cv-docs-status", ["@arolariu/cv", "@arolariu/docs", "@arolariu/status"]],
  ] as const)("%s supplies every package in the CLI runtime import graph", async (_flavor, workspaces) => {
    expect(preparation).toHaveProperty("runtimePackageNames");
    expect(preparation).toHaveProperty("filteredWorkspacePackageNames");
    const required = preparation.runtimePackageNames(resolve("scripts/cli.ts"));
    const supplied = await Effect.runPromise(preparation.filteredWorkspacePackageNames(workspaces).pipe(Effect.provide(layer)));

    expect([...required].filter((name) => !supplied.has(name))).toEqual([]);
  });
});
