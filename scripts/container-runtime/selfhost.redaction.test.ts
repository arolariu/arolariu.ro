// @vitest-environment node
/**
 * @fileoverview SQL password exposure regression tests for `dev selfhost start`.
 * @module scripts/container-runtime/selfhost.redaction.test
 *
 * @remarks
 * The scripts tooling has no output masking: a secret stays `Redacted` until the call that needs it
 * and must never be rendered. `MSSQL_SA_PASSWORD` is needed only by `sqlcmd`, which reads it from
 * `SQLCMDPASSWORD` (spec §7: secrets travel through `env`, not arguments), so these cases pin that
 * it reaches exactly that variable of the one `exec` client and nothing else: no argument vector,
 * no other child environment, no rendered line (human, `--verbose`, or `--json`, on success or on a
 * failed `sqlcmd`), and no failure document. Every case runs the real `dev selfhost start` CLI path
 * on the `selfhostFixture` harness.
 */

import {describe, expect, it} from "vitest";

import {exitCodeFor} from "../platform/exit.ts";
import {SELFHOST_SQL_PASSWORD, selfhostFixture, type SelfhostFixture} from "./selfhost.testing.ts";

/** A fixture whose `sqlcmd` exits with code 1 and a diagnostic. */
function failingSqlFixture(): SelfhostFixture {
  return selfhostFixture({
    process: (_command, args) =>
      args.includes("/opt/mssql-tools/bin/sqlcmd")
        ? {kind: "exited", exitCode: 1, stdout: "", stderr: "Login failed for user 'sa'.", durationMs: 0}
        : {kind: "succeeded", exitCode: 0, stdout: "", stderr: "", durationMs: 0},
  });
}

/**
 * Collects every place the password reached: process arguments and child environments.
 *
 * @param fixture - The fixture after the run.
 * @returns The argument positions and `<command> <first argument> <variable>` for every child
 * environment variable holding it.
 */
function passwordReach(fixture: SelfhostFixture): {readonly args: readonly string[]; readonly env: readonly string[]} {
  const calls = fixture.harness.processCalls();
  return {
    args: calls.flatMap((call) =>
      call.request.args.flatMap((arg, index) =>
        arg.includes(SELFHOST_SQL_PASSWORD)
          ? [`${call.request.args[index - 1] ?? ""} ${arg === SELFHOST_SQL_PASSWORD ? "<exact>" : "<partial>"}`]
          : [],
      ),
    ),
    env: calls.flatMap((call) =>
      Object.entries(call.options.env ?? {}).flatMap(([name, value]) =>
        value?.includes(SELFHOST_SQL_PASSWORD) === true
          ? [`${call.request.command} ${call.request.args[0] ?? ""} ${name}${value === SELFHOST_SQL_PASSWORD ? "" : " <partial>"}`]
          : [],
      ),
    ),
  };
}

describe("selfhost SQL password exposure", () => {
  it.each([[[]], [["--verbose"]], [["--json"]]] as const)("never logs the sql password (flags %j)", async (flags) => {
    // Arrange
    const fixture = selfhostFixture();

    // Act
    const exit = await fixture.runCli(["dev", "selfhost", "start", "--engine", "podman", ...flags]);

    // Assert
    expect(exitCodeFor(exit, undefined)).toBe(0);
    expect(passwordReach(fixture)).toEqual({args: [], env: ["podman exec SQLCMDPASSWORD"]});
    expect(fixture.harness.output().length).toBeGreaterThan(0);
    expect(JSON.stringify(fixture.harness.output())).not.toContain(SELFHOST_SQL_PASSWORD);
  });

  it.each([[[]], [["--verbose"]], [["--json"]], [["--json", "--verbose"]]] as const)(
    "passes the sql password only as the exec client SQLCMDPASSWORD and never in output (failed sqlcmd, flags %j)",
    async (flags) => {
      // Arrange
      const fixture = failingSqlFixture();

      // Act
      const exit = await fixture.runCli(["dev", "selfhost", "start", "--engine", "podman", ...flags]);

      // Assert
      expect(exitCodeFor(exit, undefined)).toBe(1);
      expect(passwordReach(fixture)).toEqual({args: [], env: ["podman exec SQLCMDPASSWORD"]});
      const output = fixture.harness.output();
      expect(JSON.stringify(output)).not.toContain(SELFHOST_SQL_PASSWORD);
      const message = "SQL Server schema bootstrap failed: podman exec mssql sqlcmd exited with code 1.";
      if ((flags as readonly string[]).includes("--json")) {
        expect(output.filter((record) => record.stream === "stdout").map((record) => JSON.parse(record.text) as unknown)).toEqual([
          {status: "failed", kind: "operational", message, evidence: []},
        ]);
      } else {
        expect(output.at(-1)).toEqual({stream: "stderr", text: `[arolariu::cli] ⛔ ${message}\n`});
      }
    },
  );
});
