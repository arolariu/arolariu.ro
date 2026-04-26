/**
 * @fileoverview Unit tests for workflow policy checks.
 * @module github/scripts/src/runWorkflowPolicyCheck.test
 */

import {describe, expect, it} from "vitest";

import {checkWorkflowPolicyFiles} from "./runWorkflowPolicyCheck.ts";

function ruleIdsFor(content: string): readonly string[] {
  return checkWorkflowPolicyFiles({".github/workflows/test.yml": content}).map((violation) => violation.rule);
}

describe("checkWorkflowPolicyFiles", () => {
  it("accepts full-SHA pinned external actions", () => {
    const rules = ruleIdsFor(`
name: test
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6
`);

    expect(rules).not.toContain("pin-external-actions");
  });

  it("rejects tag-pinned external actions", () => {
    const rules = ruleIdsFor(`
name: test
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
`);

    expect(rules).toContain("pin-external-actions");
  });

  it("accepts local composite action references", () => {
    const rules = ruleIdsFor(`
name: test
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: ./.github/actions/setup-workspace
`);

    expect(rules).not.toContain("pin-external-actions");
  });

  it("rejects cache restore keys", () => {
    const rules = ruleIdsFor(`
name: test
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/cache@de0fac2e4500dabe0009e67214ff5f5447ce83dd
        with:
          key: cache-key
          restore-keys: |
            cache-
`);

    expect(rules).toContain("no-cache-restore-keys");
  });

  it("rejects deployment steps without an environment gate", () => {
    const rules = ruleIdsFor(`
name: deploy
permissions:
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: docker push example.azurecr.io/app:sha
`);

    expect(rules).toContain("deployment-environment");
  });
});
