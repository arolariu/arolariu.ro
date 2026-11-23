import {execFileSync, spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {describe, expect, it} from "vitest";

const workflows = resolve(".github", "workflows");
const bash =
  process.platform === "win32"
    ? resolve(execFileSync("git", ["--exec-path"], {encoding: "utf8"}).trim(), "..", "..", "..", "bin", "bash.exe")
    : "bash";

describe("components release handoff", () => {
  it("publishes the tested tarball by same-run artifact ID without a second build", () => {
    const workflow = readFileSync(join(workflows, "official-components-publish.yml"), "utf8");
    const [validate, publish] = workflow.split(/^  publish:\r?$/mu);
    expect(validate).toContain("AROLARIU_COMPONENTS_PACK_OUTPUT:");
    expect(validate).toContain("if-no-files-found: error");
    expect(publish).toContain("artifact-ids: ${{ needs.validate.outputs.artifact_id }}");
    expect(publish).toContain("EXPECTED_SHA256: ${{ needs.validate.outputs.sha256 }}");
    expect(publish).toContain('npm publish "$TARBALL" --dry-run');
    expect(publish).toContain('npm publish "$TARBALL" --provenance');
    expect(publish).not.toMatch(/npm (?:run build|pack|ci)|node-deps-install: "true"/u);
  });

  it("only exposes one tarball with the expected digest to the publish steps", () => {
    const workflow = readFileSync(join(workflows, "official-components-publish.yml"), "utf8");
    const step = workflow.split("name: Verify the release tarball before publishing")[1]?.split(/^      - name:/mu)[0];
    const script = step
      ?.split("        run: |")[1]
      ?.replaceAll("\r\n", "\n")
      .replace(/^ {10}/gmu, "");
    if (!script) throw new Error("Missing publish verification script");
    const temp = mkdtempSync(join(tmpdir(), "component-tarball-"));
    try {
      const directory = join(temp, "components-publish");
      const output = join(temp, "env");
      const tarball = join(directory, "fixture.tgz");
      const bytes = "validated tarball bytes";
      const run = () =>
        spawnSync(bash, ["-eo", "pipefail", "-s"], {
          encoding: "utf8",
          input: script,
          env: {
            ...process.env,
            RUNNER_TEMP: temp.replaceAll("\\", "/"),
            GITHUB_ENV: output.replaceAll("\\", "/"),
            EXPECTED_SHA256: createHash("sha256").update(bytes).digest("hex"),
          },
        });
      mkdirSync(directory);
      expect(run().status).toBe(1);
      writeFileSync(tarball, "changed");
      expect(run().status).toBe(1);
      writeFileSync(tarball, bytes);
      expect(run().status).toBe(0);
      expect(readFileSync(output, "utf8")).toContain("fixture.tgz");
      writeFileSync(join(directory, "extra.tgz"), bytes);
      expect(run().status).toBe(1);
    } finally {
      rmSync(temp, {recursive: true, force: true});
    }
  });
});
