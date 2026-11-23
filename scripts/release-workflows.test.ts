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

describe("Copilot setup workflow", () => {
  it("caches npm dependencies without scheduling a NuGet package cache save", () => {
    const workflow = readFileSync(join(workflows, "copilot-setup-steps.yml"), "utf8").replaceAll("\r\n", "\n");
    const setup = [...workflow.matchAll(/uses: \.\/\.github\/actions\/setup-workspace\n        with:\n((?: {10}[^\n]+\n)+)/gu)];
    expect(setup).toHaveLength(2);
    const sdk = setup.find(([, inputs]) => inputs?.includes('dotnet-install: "true"'))?.[1];
    const node = setup.find(([, inputs]) => inputs?.includes('node-deps-install: "true"'))?.[1];
    expect(sdk).toContain('cache: "false"');
    expect(sdk).not.toContain('install-dotnet-deps: "true"');
    expect(node).toContain('node-install: "true"');
    expect(node).not.toContain('cache: "false"');
  });
});

describe("docs deployment workflow", () => {
  it("uses the Static Web Apps deployment token without granting OIDC", () => {
    const workflow = readFileSync(join(workflows, "official-docs-trigger.yml"), "utf8");
    expect(workflow).not.toMatch(/^\s+id-token:\s*write/mu);
    expect(workflow).toContain("azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_DOCS_TOKEN }}");
  });
});

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
  it.each(["api", "cv", "status", "exp"])("validates the %s revision in the consuming worktree before setup", (target) => {
    const workflow = readFileSync(join(workflows, `official-${target}-trigger.yml`), "utf8");
    expect(workflow).toMatch(/workflow_dispatch:\r?\n    inputs:\r?\n      commit_sha:\r?\n(?:        .*\r?\n)*?        required: false/u);
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("REQUESTED_SHA: ${{ inputs.commit_sha }}");
    const text = workflow.replaceAll("\r\n", "\n");
    expect(text).not.toMatch(/ref: .*\bneeds\.revision\b/u);
    expect(text).toContain("run: bash .github/scripts/resolve-deploy-revision.sh --checkout");
    expect(text).toContain("if: needs.revision.outputs.source_sha != github.sha");
    const consumers = [...text.matchAll(/^      - (?:&validated_checkout|\*validated_checkout)$/gmu)];
    expect(consumers).toHaveLength(target === "api" || target === "exp" ? 3 : 2);
    for (const consumer of consumers) {
      expect(text.slice(consumer.index).split(/^  [\w-]+:$/mu)[0]).toMatch(/uses: \.\/\.github\/actions\/setup-workspace|docker build/u);
    }
    expect(workflow).toContain("needs: [revision, test]");
  });

  describe("API and EXP local image workflows", () => {
    function job(workflow: string, id: string): string {
      const body = workflow.match(new RegExp(`^  ${id}:\\n([\\s\\S]*?)(?=^  [a-z-]+:|(?![\\s\\S]))`, "mu"))?.[1];
      if (!body) throw new Error(`Missing ${id} job`);
      return body;
    }

    it("runs the catalog check belonging to the validated API revision and fails if none applies", () => {
      const workflow = readFileSync(join(workflows, "official-api-trigger.yml"), "utf8").replaceAll("\r\n", "\n");
      const script = job(workflow, "test")
        .match(/^      - &verify_catalog_assets\n(?:.*\n)*?        run: \|\n((?: {10}.*\n)+)/mu)?.[1]
        ?.replace(/^ {10}/gmu, "");
      if (!script) throw new Error("Missing API catalog verification script");
      const temp = mkdtempSync(join(tmpdir(), "api-catalog-gate-"));
      const parity = join(temp, "scripts", "common", "category-catalog-parity.test.ts");
      const oldGate = join(temp, "scripts", "commands", "generate", "taxonomy-check.ts");
      try {
        const run = (selected: string, expectedStatus: number, checkerStatus = 0) => {
          const {status, stdout} = spawnSync(bash, ["-eo", "pipefail", "-s"], {
            cwd: temp,
            encoding: "utf8",
            input: `npm() { echo flat; return ${checkerStatus}; }\nnode() { echo pinned; return ${checkerStatus}; }\n${script}`,
            env: {...process.env, COMMIT_SHA: selected, GITHUB_SHA: "workflow-sha", GITHUB_EVENT_NAME: "workflow_dispatch"},
          });
          expect(status).toBe(expectedStatus);
          return stdout;
        };
        mkdirSync(join(temp, "scripts", "common"), {recursive: true});
        mkdirSync(join(temp, "scripts", "commands", "generate"), {recursive: true});
        expect(run("older-sha", 1)).not.toMatch(/flat|pinned/u);
        writeFileSync(oldGate, "");
        expect(run("older-sha", 0)).toContain("pinned");
        expect(run("older-sha", 7, 7)).toContain("pinned");
        expect(run("workflow-sha", 1)).not.toMatch(/^pinned$/mu);
        writeFileSync(parity, "");
        expect(run("workflow-sha", 0)).toContain("flat");
        expect(run("older-sha", 7, 7)).toContain("flat");
        for (const id of ["build-local", "build-azure"]) {
          const build = job(workflow, id);
          expect(build).toContain("*verify_catalog_assets");
          expect(build.indexOf("*verify_catalog_assets")).toBeLessThan(build.indexOf("docker build"));
        }
      } finally {
        rmSync(temp, {recursive: true, force: true});
      }
    });

    it.each(["api", "exp"])("isolates LOCAL %s from cloud jobs and exports only the built image", (service) => {
      const workflow = readFileSync(join(workflows, `official-${service}-trigger.yml`), "utf8").replaceAll("\r\n", "\n");
      const local = job(workflow, "build-local");
      expect(local).toContain("github.event_name == 'workflow_dispatch' && inputs.infrastructure == 'local'");
      expect(local).toContain("needs: revision");
      expect(local).toContain("COMMIT_SHA: ${{ needs.revision.outputs.source_sha }}");
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
          ? ["*verify_catalog_assets", "dotnet test --configuration Release", '--collect:"XPlat Code Coverage"']
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

    describe("CV and status static site delivery", () => {
      it.each(["cv", "status"])("keeps %s tests independent and only deploys the Azure build's verified payload", (site) => {
        const workflow = readFileSync(join(workflows, `official-${site}-trigger.yml`), "utf8").replaceAll("\r\n", "\n");
        const [, testJob, local, build, deploy] = workflow.split(/^  (?:test|build-local|build-azure|deploy-azure):$/mu);
        expect(workflow).toMatch(/      infrastructure:\n(?:        .*\n)*?        default: "azure"/u);
        expect(testJob).toContain("needs: revision");
        expect(testJob).toContain("npm run test:unit");
        expect(local).toContain("github.event_name == 'workflow_dispatch' && inputs.infrastructure == 'local'");
        expect(local).toContain("needs: [revision, test]");
        expect(local).toContain("steps: &build_steps");
        expect(local).toContain("COMMIT_SHA: ${{ needs.revision.outputs.source_sha }}");
        expect(local).not.toMatch(/^\s+environment:|secrets\.|azure\/static-web-apps-deploy@/imu);
        expect(build).toContain("(inputs.infrastructure || 'azure') == 'azure'");
        expect(build).toContain("needs: [revision, test]");
        expect(build).toContain("steps: *build_steps");
        expect(build).not.toMatch(/^\s+environment:|secrets\./mu);
        expect(deploy).toContain("needs: build-azure");
        expect(deploy).toContain("(inputs.infrastructure || 'azure') == 'azure'");
        expect(deploy).toContain("artifact-ids: ${{ needs.build-azure.outputs.artifact_id }}");
        expect(deploy).toContain("sha256sum --check");
        expect(deploy).toContain("skip_app_build: true");
        expect(deploy).toContain("skip_api_build: true");
        expect(deploy).not.toMatch(/actions\/checkout@|npm (?:ci|run build)/u);
        expect(workflow).toContain(`'deploy-${site}'`);
        expect(workflow).toContain("github.run_id");
      });

      it.each(["cv", "status"])("rejects a bad %s artifact before it can expose a deployment path", (site) => {
        const workflow = readFileSync(join(workflows, `official-${site}-trigger.yml`), "utf8").replaceAll("\r\n", "\n");
        const step = workflow.split("name: Verify and extract the prebuilt payload")[1]?.split(/^      - name:/mu)[0];
        const script = step?.split("        run: |")[1]?.replace(/^ {10}/gmu, "");
        if (!script) throw new Error("Missing site payload verification script");
        const root = mkdtempSync(join(tmpdir(), "swa-artifact-"));
        try {
          const downloads = join(root, "swa-package");
          const payload = join(root, "build");
          const archive = join(downloads, `${site}-site.tar.gz`);
          const output = join(root, "outputs");
          mkdirSync(downloads);
          mkdirSync(join(payload, "static", ".well-known"), {recursive: true});
          writeFileSync(join(payload, "static", "index.html"), "fixture");
          writeFileSync(join(payload, "static", "staticwebapp.config.json"), "{}");
          writeFileSync(join(payload, "static", ".well-known", "fixture"), "retained");
          const bashPath = (file: string): string => file.replaceAll("\\", "/");
          const pack = (...entries: string[]): void => {
            execFileSync(bash, ["-ec", 'tar -czf "$1" -C build "${@:2}"', "pack", `swa-package/${site}-site.tar.gz`, ...entries], {
              cwd: root,
            });
          };
          const verify = (hasApi: string, hash = "0".repeat(64), workspace = root) =>
            spawnSync(bash, ["-eo", "pipefail", "-s"], {
              encoding: "utf8",
              input: script,
              env: {
                ...process.env,
                RUNNER_TEMP: bashPath(root),
                GITHUB_WORKSPACE: bashPath(workspace),
                GITHUB_OUTPUT: bashPath(output),
                EXPECTED_SHA256: hash,
                HAS_API: hasApi,
              },
            });
          expect(verify("false").status).not.toBe(0);
          pack("static");
          expect(verify("false").status).not.toBe(0);
          const digest = (): string => createHash("sha256").update(readFileSync(archive)).digest("hex");
          if (site === "cv") {
            expect(verify("false", digest()).status).not.toBe(0);
          } else {
            const staticOnly = join(root, "static-only");
            mkdirSync(staticOnly);
            const result = verify("false", digest(), staticOnly);
            expect(result.status, result.stderr).toBe(0);
            expect(readFileSync(output, "utf8").trim()).toBe("api_location=");
            rmSync(output);
          }
          mkdirSync(join(payload, "server", "node_modules", "fixture"), {recursive: true});
          writeFileSync(join(payload, "server", "host.json"), "{}");
          writeFileSync(join(payload, "server", "package.json"), "{}");
          writeFileSync(join(payload, "server", "node_modules", "fixture", "index.js"), "retained");
          pack("static", "server");
          const result = verify("true", digest());
          expect(result.status, result.stderr).toBe(0);
          expect(readFileSync(output, "utf8").trim()).toBe("api_location=./swa-payload/server");
          expect(readFileSync(join(root, "swa-payload", "static", ".well-known", "fixture"), "utf8")).toBe("retained");
          expect(readFileSync(join(root, "swa-payload", "server", "node_modules", "fixture", "index.js"), "utf8")).toBe("retained");
        } finally {
          rmSync(root, {recursive: true, force: true});
        }
      });
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
          env: {
            ...process.env,
            REQUESTED_SHA: requested,
            DISPATCH_SHA: requiredInputs[0] === "--checkout" ? tip : first,
            DISPATCH_REF: ref,
            EVENT_NAME: "workflow_dispatch",
          },
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

      expect(run(first, "refs/heads/main", "--checkout").stderr).toContain("Expected the trusted dispatch commit");
      git("switch", "--detach", tip);
      expect(run(outside, "refs/heads/main", "--checkout").status).toBe(1);
      expect(run("", "refs/heads/main", "--checkout").status).toBe(1);
      expect(git("rev-parse", "HEAD")).toBe(tip);
      const historical = run(first, "refs/heads/main", "--checkout");
      expect(historical.status, historical.stderr).toBe(0);
      expect(git("rev-parse", "HEAD")).toBe(first);
      expect(git("ls-files")).toBe("");
    } finally {
      rmSync(dir, {recursive: true, force: true});
    }
  }, 15_000);
});
