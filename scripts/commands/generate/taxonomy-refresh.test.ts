import {mkdir, mkdtemp, rm, symlink, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join} from "node:path";
import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import {taxonomyArtifactOutputRoots} from "../../common/taxonomy-artifacts.ts";
import {pinnedTaxonomyFixtureFiles} from "../../common/taxonomy-fixtures.testing.ts";
import {makeTestLayer, runScoped} from "../../platform/testing.ts";
import type {TaxonomyArtifactNode} from "../../types/generators.ts";
import {diffTaxonomyNodes, refreshTaxonomies} from "./taxonomy-refresh.ts";

function node(code: string, label: string, parent?: Readonly<TaxonomyArtifactNode>): TaxonomyArtifactNode {
  return {
    code,
    officialLabel: label,
    level: parent === undefined ? "group" : "class",
    parentCode: parent?.code ?? null,
    hierarchyCodes: [...(parent?.hierarchyCodes ?? []), code],
    hierarchyLabels: [...(parent?.hierarchyLabels ?? []), label],
    definition: null,
    searchText: label.toLowerCase(),
  };
}

describe("taxonomy review diff", () => {
  it("reports a NACE ancestor label correction on the ancestor and its descendant paths", () => {
    const old = node("47.6", "Retail sale of cultural and recreational goods");
    const next = node("47.6", "Retail sale of cultural and recreation goods");

    const changes = diffTaxonomyNodes(
      [old, node("47.61", "Retail sale of books", old)],
      [next, node("47.61", "Retail sale of books", next)],
    );

    expect(changes.changed).toMatchObject([
      {code: "47.6", fields: ["officialLabel", "hierarchyLabels", "searchText"]},
      {code: "47.61", fields: ["hierarchyLabels"]},
    ]);
  });

  it("rejects a directory alias into a canonical mirror before publisher access", async () => {
    const root = await mkdtemp(join(tmpdir(), "arolariu-refresh-alias-"));
    try {
      for (const [path, contents] of Object.entries(pinnedTaxonomyFixtureFiles(root))) {
        await mkdir(dirname(path), {recursive: true});
        await writeFile(path, contents);
      }
      await symlink(join(root, taxonomyArtifactOutputRoots[0]), join(root, "alias"), "junction");
      const harness = makeTestLayer({fileSystem: "node"});

      const error = await runScoped(Effect.flip(refreshTaxonomies(root, join("alias", "candidate"))), harness.layer);

      expect(error.message).toContain("outside the canonical API and Website taxonomy directories");
      expect(harness.httpCalls()).toEqual([]);
    } finally {
      await rm(root, {force: true, recursive: true});
    }
  });

  it("reports missing codes without inferring replacements and tracks moves and definition changes", () => {
    const oldParent = node("47.6", "Cultural goods");
    const newParent = node("47.7", "Other goods");
    const old = node("47.61", "Books", oldParent);
    const moved = {...node("47.61", "Books", newParent), definition: "Printed books"};

    const changes = diffTaxonomyNodes([oldParent, old], [newParent, moved]);

    expect(changes).toMatchObject({
      removed: [{code: "47.6"}],
      added: [{code: "47.7"}],
      changed: [{code: "47.61", fields: ["parentCode", "hierarchyCodes", "hierarchyLabels", "definition"]}],
    });
    expect(changes.removed[0]).not.toHaveProperty("replacement");
  });
});
