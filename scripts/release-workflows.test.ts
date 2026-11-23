import {execFileSync, spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {describe, expect, it} from "vitest";

const workflows = resolve(".github", "workflows");
const resolver = resolve(".github", "scripts", "resolve-deploy-revision.sh");
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

describe("manual deployment revision contract", () => {
  it.each(["api", "exp"])("pins %s test and build checkouts to the same resolved commit", (target) => {
    const workflow = readFileSync(join(workflows, `official-${target}-trigger.yml`), "utf8");
    expect(workflow).toMatch(/workflow_dispatch:\r?\n    inputs:\r?\n      commit_sha:\r?\n(?:        .*\r?\n)*?        required: false/u);
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("REQUESTED_SHA: ${{ inputs.commit_sha }}");
    expect(workflow.match(/ref: \$\{\{ needs\.revision\.outputs\.source_sha \}\}/gu)).toHaveLength(3);
    expect(workflow).toContain("needs: [revision, test]");
  });

  describe("API and EXP local image workflows", () => {
    function job(workflow: string, id: string): string {
      const body = workflow.match(new RegExp(`^  ${id}:\\n([\\s\\S]*?)(?=^  [a-z-]+:|(?![\\s\\S]))`, "mu"))?.[1];
      if (!body) throw new Error(`Missing ${id} job`);
      return body;
    }

    it.each(["api", "exp"])("isolates LOCAL %s from cloud jobs and exports only the built image", (service) => {
      const workflow = readFileSync(join(workflows, `official-${service}-trigger.yml`), "utf8").replaceAll("\r\n", "\n");
      const local = job(workflow, "build-local");
      expect(local).toContain("github.event_name == 'workflow_dispatch' && inputs.infrastructure == 'local'");
      expect(local).toContain("needs: revision");
      expect(local).toContain("ref: ${{ needs.revision.outputs.source_sha }}");
      expect(local).toContain("persist-credentials: false");
      expect(local).toContain("INFRA: local");
      expect(local).toContain("permissions:\n      contents: read");
      expect(local).not.toMatch(
        /^\s+(?:environment:|id-token:)|secrets\.|docker push|(?:azure\/login|azure\/webapps-deploy)@|\baz\s+(?:acr|webapp)/imu,
      );
      expect(workflow.split(/^jobs:/mu)[0]).not.toMatch(/^\s+id-token:|secrets\./mu);
      for (const id of ["test", "build-azure", "deploy-azure"]) {
        const cloud = job(workflow, id);
        expect(cloud).toContain("(inputs.infrastructure || 'azure') == 'azure'");
        expect(cloud).not.toContain("Export the LOCAL image");
        if (id !== "test") expect(cloud).toContain("id-token: write");
      }
      expect(job(workflow, "deploy-azure")).toContain("needs: [revision, build-azure]");
      expect(job(workflow, "deploy-azure")).toContain("needs.build-azure.outputs.image_tag");
      expect(workflow).not.toMatch(/^  (?:build|deploy):$/mu);

      const tests =
        service === "api"
          ? ["generate --check-taxonomies --json", "dotnet test --configuration Release", '--collect:"XPlat Code Coverage"']
          : ["python -m ruff check .", "python -m bandit", "python -m pytest"];
      for (const command of tests) {
        expect(local.indexOf(command)).toBeGreaterThan(-1);
        expect(local.indexOf(command)).toBeLessThan(local.indexOf("docker build"));
      }
      expect(local).toContain(`IMAGE: arolariu-${service}-local:\${{ needs.revision.outputs.source_sha }}`);
      expect(local).toContain('docker image save "$IMAGE" | gzip -n');
      expect(local).toContain('sha256sum "$IMAGE_ARCHIVE"');
      expect(local).toContain(`name: ${service}-local-image-\${{ needs.revision.outputs.source_sha }}-\${{ github.run_attempt }}`);
      expect(local).toContain("compression-level: 0");
      expect(local).toContain("if-no-files-found: error");
      if (service === "exp") {
        expect(local).toContain("ENV INFRA=local COMMIT_SHA=%s");
        expect(local).toContain('} | docker build --file - --tag "$IMAGE" .');
      } else {
        expect(local).toContain("--build-arg INFRA=local");
        expect(local).not.toMatch(/--build-arg AZURE_|--secret/u);
      }
    });
  });

  it("accepts only a main-history commit and preserves the dispatch SHA when blank", () => {
    const dir = mkdtempSync(join(tmpdir(), "deploy-revision-"));
    try {
      const git = (...args: string[]): string => execFileSync("git", args, {cwd: dir, encoding: "utf8"}).trim();
      git("init", "--initial-branch=main");
      const commit = (subject: string): string => {
        git(
          "-c",
          "user.name=Test",
          "-c",
          "user.email=test@example.com",
          "-c",
          "commit.gpgsign=false",
          "commit",
          "--allow-empty",
          "-m",
          subject,
        );
        return git("rev-parse", "HEAD");
      };
      const first = commit("first");
      const actionPath = join(dir, ".github", "actions", "setup-workspace");
      mkdirSync(actionPath, {recursive: true});
      writeFileSync(join(actionPath, "action.yml"), 'inputs:\n  node-install:\n    default: "false"\n');
      git("add", ".");
      const tip = commit("tip");
      git("update-ref", "refs/remotes/origin/main", tip);
      git("checkout", "--detach", first);
      const outside = commit("outside main");
      const tree = git("rev-parse", `${tip}^{tree}`);
      const run = (requested: string, ref = "refs/heads/main", ...requiredInputs: string[]) =>
        spawnSync(bash, [resolver.replaceAll("\\", "/"), ...requiredInputs], {
          cwd: dir,
          encoding: "utf8",
          env: {...process.env, REQUESTED_SHA: requested, DISPATCH_SHA: first, DISPATCH_REF: ref, EVENT_NAME: "workflow_dispatch"},
        });
      expect(run("").stdout.trim()).toBe(first);
      expect(run(tip.toUpperCase()).stdout.trim()).toBe(tip);
      for (const invalid of [outside, tree, tip.slice(0, 7), `${tip} `, "a".repeat(40)]) {
        expect(run(invalid).status).toBe(1);
      }
      expect(run("", "refs/heads/preview").status).toBe(1);
      expect(run(first, "refs/heads/main", "node-install").stderr).toContain("does not contain the workspace setup action");
      expect(run(tip, "refs/heads/main", "node-install").stdout.trim()).toBe(tip);
      expect(run(tip, "refs/heads/main", "wrong-input").stderr).toContain("does not support the workflow's setup input");
    } finally {
      rmSync(dir, {recursive: true, force: true});
    }
  }, 15_000);
});
