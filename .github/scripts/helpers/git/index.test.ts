/**
 * @fileoverview Git helper and Git-selected deployment workflow regressions.
 * @module github/scripts/helpers/git/tests
 *
 * @remarks
 * Verifies helper commands via mocked `@actions/exec`, and executes the real
 * workflow validation Bash against isolated Git histories and cloud stubs.
 */

import * as exec from "@actions/exec";
import {execFileSync, spawnSync} from "node:child_process";
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {runInNewContext} from "node:vm";
import {parsers} from "prettier/plugins/yaml";
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {createGitHelper} from "./index";

// Mock @actions/exec
vi.mock("@actions/exec");

describe("Deployment workflow contract", () => {
  // Deployment regressions execute the Bash embedded in the real workflow files.
  // Only Git repositories under the OS temp directory and command-boundary stubs
  // are used; no workflow, Docker, Azure or GitHub request is executed.
  interface YamlNode {
    type: string;
    value?: string;
    children?: YamlNode[];
  }

  interface WorkflowStep {
    id?: string;
    name?: string;
    uses?: string;
    run?: string;
    if?: string;
    env?: Record<string, string>;
    with?: Record<string, string>;
  }

  interface WorkflowJob {
    needs?: string | string[];
    if?: string;
    uses?: string;
    permissions?: Record<string, string>;
    environment?: string | {name: string};
    outputs?: Record<string, string>;
    env?: Record<string, string>;
    with?: Record<string, string>;
    secrets?: Record<string, string>;
    steps?: WorkflowStep[];
  }

  interface DeploymentWorkflow {
    on: Record<
      string,
      {
        branches?: string[];
        paths?: string[];
        inputs?: Record<string, {type: string; required: string}>;
        secrets?: Record<string, {required: string}>;
      }
    >;
    jobs: Record<string, WorkflowJob>;
  }

  /** Decode the declared Prettier YAML parser's AST, without another YAML dependency. */
  function yamlValue(node: YamlNode): unknown {
    const children = node.children ?? [];
    if (node.type === "mapping" || node.type === "flowMapping") {
      const entries = children.map((item) => {
        const [key, value] = item.children ?? [];
        if (!key || !value) throw new Error("Malformed YAML mapping");
        return [String(yamlValue(key)), yamlValue(value)] as const;
      });
      if (new Set(entries.map(([key]) => key)).size !== entries.length) throw new Error("Duplicate YAML mapping key");
      return Object.fromEntries(entries);
    }
    if (node.type === "sequence" || node.type === "flowSequence") return children.map(yamlValue);
    if (node.type === "document") {
      const body = children.find((child) => child.type === "documentBody");
      if (!body) throw new Error("Missing YAML document body");
      return yamlValue(body);
    }
    if (node.value !== undefined) return node.value;
    return children[0] ? yamlValue(children[0]) : null;
  }

  const workflowDirectory = fileURLToPath(new URL("../../../workflows/", import.meta.url));
  const deploymentFiles = ["official-website-build.yml", "official-api-trigger.yml", "official-exp-trigger.yml"] as const;
  const bash = process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "bash";

  function workflow(file: string): DeploymentWorkflow {
    const text = readFileSync(join(workflowDirectory, file), "utf8");
    // This parser's actual arity is one. Prettier's generic Parser type also
    // requires formatter-only options which its YAML implementation never uses.
    const parseYaml = parsers.yaml.parse as (source: string) => YamlNode;
    return yamlValue(parseYaml(text)) as DeploymentWorkflow;
  }

  function step(job: WorkflowJob | undefined, id: string): WorkflowStep & {run: string} {
    const found = job?.steps?.find((candidate) => candidate.id === id);
    if (!found?.run) throw new Error(`Missing executable workflow step: ${id}`);
    return {...found, run: found.run};
  }

  describe("Git-selected deployment workflows", () => {
    let directory: string;
    let oldSha: string;
    let capturedSha: string;
    let movedSha: string;
    let unrelatedSha: string;
    let tagSha: string;

    function git(...args: string[]): string {
      return execFileSync("git", args, {cwd: directory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]}).trim();
    }

    function run(script: string, env: Record<string, string> = {}): {status: number | null; text: string; output: string} {
      const output = join(directory, "outputs");
      const summary = join(directory, "summary");
      writeFileSync(output, "");
      writeFileSync(summary, "");
      const result = spawnSync(bash, ["--noprofile", "--norc", "-euo", "pipefail", "-c", script], {
        cwd: directory,
        encoding: "utf8",
        env: {...process.env, GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: summary, ...env},
      });
      if (result.error) throw result.error;
      return {status: result.status, text: result.stdout + result.stderr, output: readFileSync(output, "utf8")};
    }

    beforeAll(() => {
      directory = mkdtempSync(join(tmpdir(), "git-selected-deployment-"));
      git("init", "--initial-branch=main");
      git("config", "user.name", "Isolated workflow fixture");
      git("config", "user.email", "workflow-fixture@example.invalid");
      git("config", "commit.gpgsign", "false");
      git("config", "core.hooksPath", ".git/no-hooks");
      git("commit", "--allow-empty", "-m", "older allowed application source");
      oldSha = git("rev-parse", "HEAD");
      git("commit", "--allow-empty", "-m", "captured dispatch revision");
      capturedSha = git("rev-parse", "HEAD");
      git("branch", "feature/site", capturedSha);
      git("commit", "--allow-empty", "-m", "branch moved after dispatch");
      movedSha = git("rev-parse", "HEAD");
      git("tag", "-a", "not-a-commit", "-m", "annotated tag object", oldSha);
      tagSha = git("rev-parse", "refs/tags/not-a-commit");
      git("checkout", "--orphan", "unrelated");
      git("commit", "--allow-empty", "-m", "unrelated history");
      unrelatedSha = git("rev-parse", "HEAD");
      git("checkout", "main");
    });

    afterAll(() => {
      if (directory) rmSync(directory, {recursive: true, force: true});
    });

    for (const file of deploymentFiles) {
      describe(file, () => {
        function validate(env: Record<string, string> = {}): ReturnType<typeof run> {
          return run(step(workflow(file).jobs["validate"], "source").run, {
            EVENT_NAME: "workflow_dispatch",
            EVENT_REF: "refs/heads/main",
            CAPTURED_SHA: capturedSha,
            COMMIT_INPUT: "",
            TARGET_INPUT: file.includes("website") ? "production" : "",
            WORKFLOW_SHA: capturedSha,
            ...env,
          });
        }

        it("uses the captured SHA, not the branch tip after movement", () => {
          expect(git("rev-parse", "main")).toBe(movedSha);
          const result = validate();
          expect(result.status, result.text).toBe(0);
          expect(result.output).toContain(`source_sha=${capturedSha}\n`);
          expect(result.output).not.toContain(movedSha);
        });

        it("accepts and normalizes an older full commit in captured history", () => {
          const result = validate({COMMIT_INPUT: oldSha.toUpperCase()});
          expect(result.status, result.text).toBe(0);
          expect(result.output).toContain(`source_sha=${oldSha}\n`);
        });

        it.each(["123abc", "main", "HEAD~1", "https://example.invalid/fork", "image:latest", "$(exit 0)", "a".repeat(39)])(
          "rejects malformed revision %s",
          (input) => {
            const result = validate({COMMIT_INPUT: input});
            expect(result.status, result.text).not.toBe(0);
            expect(result.output).toBe("");
            expect(result.text).toContain("40");
          },
        );

        it("rejects unknown, unrelated, tag-object and post-capture commits", () => {
          for (const sha of ["0".repeat(40), unrelatedSha, tagSha, movedSha]) {
            const result = validate({COMMIT_INPUT: sha});
            expect(result.status, result.text).not.toBe(0);
            expect(result.output).toBe("");
          }
        });

        it("rejects production from a non-main branch and a tag ref", () => {
          for (const ref of ["refs/heads/preview", "refs/heads/feature/release", "refs/tags/main"]) {
            const result = validate({EVENT_REF: ref});
            expect(result.status, result.text).not.toBe(0);
            expect(result.output).toBe("");
          }
        });

        it("rejects missing captured history and unsupported events without outputs", () => {
          for (const env of [{CAPTURED_SHA: "0".repeat(40)}, {EVENT_NAME: "pull_request"}]) {
            const result = validate(env);
            expect(result.status, result.text).not.toBe(0);
            expect(result.output).toBe("");
          }
          const shallow = join(directory, ".git", "shallow");
          try {
            writeFileSync(shallow, `${oldSha}\n`);
            const result = validate();
            expect(result.status, result.text).not.toBe(0);
            expect(result.text).toContain("Full captured history");
            expect(result.output).toBe("");
          } finally {
            rmSync(shallow, {force: true});
          }
        });

        it("preserves automatic branches, path filters, event SHA and exact target", () => {
          const website = file.includes("website");
          const definition = workflow(file);
          expect(definition.on["push"]).toEqual({
            branches: [website ? "preview" : "main"],
            paths: [website ? "sites/arolariu.ro/**" : file.includes("api") ? "sites/api.arolariu.ro/**" : "sites/exp.arolariu.ro/**"],
          });
          const result = validate({EVENT_NAME: "push", EVENT_REF: website ? "refs/heads/preview" : "refs/heads/main", TARGET_INPUT: ""});
          expect(result.status, result.text).toBe(0);
          expect(result.output).toContain(`source_sha=${capturedSha}\n`);
          expect(result.output).toContain(`environment=${website ? "development" : "production"}\n`);
          expect(result.output).toContain(
            `image_repository=${website ? "frontend/dev.arolariu" : file.includes("api") ? "backend/api.arolariu" : "exp/exp.arolariu"}\n`,
          );
          expect(result.output).toContain(
            `app_name=${website ? "dev-arolariu-ro" : file.includes("api") ? "api-arolariu-ro" : "exp-arolariu-ro"}\n`,
          );
          expect(Object.keys(definition.on["workflow_dispatch"]?.inputs ?? {}).sort()).toEqual(
            website ? ["commit_sha", "environment"] : ["commit_sha"],
          );
        });

        it("keeps source validation read-only and ahead of all test/build checkouts", () => {
          const jobs = workflow(file).jobs;
          expect(jobs["validate"]?.permissions).toEqual({contents: "read"});
          const checkout = jobs["validate"]?.steps?.find((candidate) => candidate.uses?.startsWith("actions/checkout@"));
          expect(checkout?.with).toMatchObject({"fetch-depth": "0", ref: "${{ github.sha }}", "persist-credentials": "false"});
          expect(jobs["validate"]?.steps?.some((candidate) => candidate.uses?.toLowerCase().includes("azure"))).toBe(false);
          for (const jobName of ["test", "build"]) {
            const job = jobs[jobName];
            expect(job?.needs).toContain("validate");
            expect(job?.env?.["COMMIT_SHA"]).toBe("${{ needs.validate.outputs.source_sha }}");
            expect(job?.steps?.find((candidate) => candidate.uses?.startsWith("actions/checkout@"))?.with?.["ref"]).toBe(
              "${{ needs.validate.outputs.source_sha }}",
            );
          }
        });

        it("requires successful tests and build; failure, cancellation and skips cannot deploy", () => {
          const jobs = workflow(file).jobs;
          for (const [jobName, dependency] of [
            ["build", "test"],
            [file.includes("website") ? "release" : "deploy", "build"],
          ] as const) {
            const job = jobs[jobName];
            expect(job?.needs).toContain(dependency);
            expect(job?.if).toContain(`needs.${dependency}.result == 'success'`);
            expect(job?.if).not.toMatch(/always\(\)|skipped|!= 'failure'/);
            // These workflow conditions use the JS-compatible GitHub equality/
            // conjunction subset. Execute the actual expression, not a second
            // policy table, with every dependency's possible result.
            for (const testResult of ["success", "failure", "skipped", "cancelled"]) {
              for (const buildResult of ["success", "failure", "skipped", "cancelled"]) {
                const allowed: unknown = runInNewContext(
                  job?.if ?? "false",
                  {
                    github: {repository: "arolariu/arolariu.ro"},
                    needs: {validate: {result: "success"}, test: {result: testResult}, build: {result: buildResult}},
                  },
                  {timeout: 1000},
                );
                expect(allowed).toBe(testResult === "success" && (jobName === "build" || buildResult === "success"));
              }
            }
          }
          expect(workflow(file).on["workflow_dispatch"]?.inputs).not.toHaveProperty("skip_tests");
        });

        it("constructs a per-build image once and publishes that exact output", () => {
          const build = workflow(file).jobs["build"];
          const result = run(step(build, "image").run, {
            COMMIT_SHA: oldSha,
            IMAGE_REPOSITORY: file.includes("website")
              ? "frontend/arolariu"
              : file.includes("api")
                ? "backend/api.arolariu"
                : "exp/exp.arolariu",
            BUILD_RUN_ID: "123",
            BUILD_RUN_ATTEMPT: "2",
          });
          expect(result.status, result.text).toBe(0);
          expect(result.output).toContain(`:${oldSha}-123-2\n`);
          expect(build?.outputs?.["image"]).toBe("${{ steps.publish.outputs.image }}");
          expect(step(build, "publish").run).toContain('docker push "$BUILT_IMAGE"');
          expect(step(build, "publish").run).toContain("printf 'image=%s\\n' \"$IMAGE\"");
        });

        it("builds and publishes the resolved identity through stubbed command boundaries", () => {
          const build = workflow(file).jobs["build"];
          const repository = file.includes("website")
            ? "frontend/arolariu"
            : file.includes("api")
              ? "backend/api.arolariu"
              : "exp/exp.arolariu";
          const image = `${repository}:${oldSha}-123-2`;
          const env = {
            IMAGE: image,
            COMMIT_SHA: oldSha,
            ACR_LOGIN_SERVER: "fixture.azurecr.io",
            INFRA: "azure",
            API_NAME: "api.arolariu.ro",
            API_URL: "https://api.arolariu.ro",
            AZURE_TENANT_ID: "fixture-tenant",
            AZURE_SUBSCRIPTION_ID: "fixture-subscription",
            AZURE_CLIENT_ID: "fixture-client",
            SITE_ENV: "PRODUCTION",
            SITE_NAME: "arolariu.ro",
            SITE_URL: "https://arolariu.ro",
            NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "fixture-public-key",
            TIMESTAMP: "fixture-timestamp",
          };
          const dockerStub = 'docker() { printf "<docker>"; printf "<%s>" "$@"; printf "\\n"; }\n';
          const buildStep = build?.steps?.find((candidate) => candidate.run?.includes("docker build"));
          expect(buildStep?.env?.["IMAGE"]).toBe("${{ steps.image.outputs.image }}");
          const built = run(dockerStub + buildStep?.run, env);
          expect(built.status, built.text).toBe(0);
          expect(built.text).toContain(`<-t><fixture.azurecr.io/${image}>`);
          expect(built.text).toContain(oldSha);
          const published = run(dockerStub + step(build, "publish").run, env);
          expect(published.status, published.text).toBe(0);
          expect(published.text).toContain(`<push><fixture.azurecr.io/${image}>`);
          expect(published.output).toBe(`image=${image}\n`);
          const failed = run("docker() { return 1; }\n" + step(build, "publish").run, env);
          expect(failed.status).not.toBe(0);
          expect(failed.output).toBe("");
        });

        it("has valid job/step output references and no interpolated shell expressions", () => {
          const definition = workflow(file);
          for (const job of Object.values(definition.jobs)) {
            const needs = typeof job.needs === "string" ? [job.needs] : (job.needs ?? []);
            for (const match of JSON.stringify(job).matchAll(/needs\.([\w-]+)\.outputs\.([\w-]+)/g)) {
              const [, dependency = "", output = ""] = match;
              expect(needs).toContain(dependency);
              expect(definition.jobs[dependency]?.outputs).toHaveProperty(output);
            }
            for (const match of JSON.stringify(job).matchAll(/steps\.([\w-]+)\.outputs\./g)) {
              expect(job.steps?.some((candidate) => candidate.id === match[1])).toBe(true);
            }
            for (const candidate of job.steps ?? []) {
              if (candidate.run) expect(candidate.run).not.toContain("${{");
              expect(candidate).not.toHaveProperty("continue-on-error");
            }
          }
        });
      });
    }

    it("supports website development branches but strictly rejects unknown targets", () => {
      const source = step(workflow(deploymentFiles[0]).jobs["validate"], "source").run;
      for (const target of ["development", "production", "invalid", ""]) {
        const result = run(source, {
          EVENT_NAME: "workflow_dispatch",
          EVENT_REF: "refs/heads/feature/site",
          CAPTURED_SHA: capturedSha,
          COMMIT_INPUT: oldSha,
          TARGET_INPUT: target,
          WORKFLOW_SHA: capturedSha,
        });
        expect(result.status === 0, result.text).toBe(target === "development");
        if (target === "development") {
          expect(result.output).toContain("image_repository=frontend/dev.arolariu\n");
          expect(result.output).toContain("app_name=dev-arolariu-ro\n");
        }
      }
    });

    it("uses an explicit same-run website call with matching named inputs, secrets and permissions", () => {
      const build = workflow("official-website-build.yml");
      const release = workflow("official-website-release.yml");
      expect(Object.keys(release.on)).toEqual(["workflow_call"]);
      const caller = build.jobs["release"];
      expect(caller?.uses).toBe("./.github/workflows/official-website-release.yml");
      expect(caller?.with).toEqual({
        environment: "${{ needs.validate.outputs.environment }}",
        source_sha: "${{ needs.validate.outputs.source_sha }}",
        image: "${{ needs.build.outputs.image }}",
      });
      expect(Object.keys(caller?.with ?? {}).sort()).toEqual(Object.keys(release.on["workflow_call"]?.inputs ?? {}).sort());
      expect(caller?.secrets).not.toBe("inherit");
      expect(Object.keys(caller?.secrets ?? {}).sort()).toEqual(Object.keys(release.on["workflow_call"]?.secrets ?? {}).sort());
      for (const [name, value] of Object.entries(caller?.secrets ?? {})) expect(value).toBe(`\${{ secrets.${name} }}`);
      expect(caller?.permissions).toEqual(release.jobs["release"]?.permissions);
      expect(release.jobs["release"]?.environment).toMatchObject({name: "${{ inputs.environment }}"});
      expect(caller).not.toHaveProperty("environment");
      for (const name of ["AZURE_CLIENT_ID", "AZURE_TENANT_ID", "AZURE_SUBSCRIPTION_ID"]) {
        expect(release.jobs["release"]?.env?.[name]).toBe(`\${{ secrets.${name} }}`);
      }
      expect(release.jobs["release"]?.env?.["ACR_LOGIN_SERVER"]).toBe("${{ secrets.AZURE_CONTAINER_REGISTRY_ADDRESS }}");
      for (const input of Object.values(release.on["workflow_call"]?.inputs ?? {})) {
        expect(input).toMatchObject({required: "true", type: "string"});
      }
    });

    it("accepts only both known website handoffs and keeps the built attempt on a release retry", () => {
      const release = workflow("official-website-release.yml").jobs["release"];
      for (const [target, repository, app] of [
        ["development", "frontend/dev.arolariu", "dev-arolariu-ro"],
        ["production", "frontend/arolariu", "www-arolariu-ro"],
      ] as const) {
        const result = run(step(release, "handoff").run, {
          TARGET_ENV: target,
          IMAGE: `${repository}:${oldSha}-123-2`,
          COMMIT_SHA: oldSha,
          EVENT_REF: "refs/heads/main",
          BUILD_RUN_ID: "123",
          BUILD_RUN_ATTEMPT: "9",
          AZURE_CLIENT_ID: "fixture-client",
          AZURE_TENANT_ID: "fixture-tenant",
          AZURE_SUBSCRIPTION_ID: "fixture-subscription",
          ACR_LOGIN_SERVER: "fixture.azurecr.io",
        });
        expect(result.status, result.text).toBe(0);
        expect(result.output).toBe(`app_name=${app}\n`);
      }
      const deploy = release?.steps?.find((candidate) => candidate.uses === "azure/webapps-deploy@v3");
      expect(deploy?.with).toEqual({
        "app-name": "${{ steps.handoff.outputs.app_name }}",
        images: "${{ secrets.AZURE_CONTAINER_REGISTRY_ADDRESS }}/${{ inputs.image }}",
      });
      expect(JSON.stringify(release)).not.toContain("github.run_attempt");
    });

    it("rejects arbitrary website targets/images and empty environment-selected bindings before Azure login", () => {
      const release = workflow("official-website-release.yml").jobs["release"];
      const env = {
        TARGET_ENV: "production",
        IMAGE: `frontend/arolariu:${oldSha}-123-2`,
        COMMIT_SHA: oldSha,
        EVENT_REF: "refs/heads/main",
        BUILD_RUN_ID: "123",
        AZURE_CLIENT_ID: "fixture-client",
        AZURE_TENANT_ID: "fixture-tenant",
        AZURE_SUBSCRIPTION_ID: "fixture-subscription",
        ACR_LOGIN_SERVER: "fixture.azurecr.io",
      };
      for (const patch of [
        {TARGET_ENV: "unsupported"},
        {TARGET_ENV: ""},
        {EVENT_REF: "refs/heads/preview"},
        {COMMIT_SHA: "main"},
        {IMAGE: ""},
        {IMAGE: "frontend/arolariu:latest"},
        {IMAGE: `frontend/dev.arolariu:${oldSha}-123-2`},
        {IMAGE: `backend/api.arolariu:${oldSha}-123-2`},
        {IMAGE: `frontend/arolariu:${capturedSha}-123-2`},
        {IMAGE: `frontend/arolariu:${oldSha}-999-2`},
        {IMAGE: `frontend/arolariu:${oldSha}-123-2; exit 0`},
        {IMAGE: `other.azurecr.io/frontend/arolariu:${oldSha}-123-2`},
        {IMAGE: `frontend/arolariu@sha256:${oldSha}`},
        ...["AZURE_CLIENT_ID", "AZURE_TENANT_ID", "AZURE_SUBSCRIPTION_ID", "ACR_LOGIN_SERVER"].map((key) => ({[key]: ""})),
      ]) {
        const result = run(step(release, "handoff").run, {...env, ...patch});
        expect(result.status, result.text).not.toBe(0);
        expect(result.output).toBe("");
        expect(result.text).not.toContain("fixture-client");
        expect(result.text).not.toContain("fixture-tenant");
      }
      expect(release?.steps?.[0]?.id).toBe("handoff");
      expect(release?.steps?.[1]?.uses?.toLowerCase()).toBe("azure/login@v3");
      for (const secret of Object.values(workflow("official-website-release.yml").on["workflow_call"]?.secrets ?? {})) {
        expect(secret.required).toBe("true");
      }
    });

    it("validates fixed API/experimental image handoffs and resolved experimental app metadata", () => {
      for (const [file, repository] of [
        ["official-api-trigger.yml", "backend/api.arolariu"],
        ["official-exp-trigger.yml", "exp/exp.arolariu"],
      ] as const) {
        const deploy = workflow(file).jobs["deploy"];
        const env = {
          COMMIT_SHA: oldSha,
          IMAGE: `${repository}:${oldSha}-123-2`,
          BUILD_RUN_ID: "123",
          ACR_LOGIN_SERVER: "fixture.azurecr.io",
          BUILD_RUN_ATTEMPT: "9",
        };
        const valid = run(step(deploy, "handoff").run, env);
        expect(valid.status, valid.text).toBe(0);
        for (const image of ["", "other/target:latest", `${repository}:${capturedSha}-123-2`, `${repository}:${oldSha}-123-0`]) {
          const result = run(step(deploy, "handoff").run, {...env, IMAGE: image});
          expect(result.status, result.text).not.toBe(0);
        }
        const deployAction = deploy?.steps?.find((candidate) => candidate.uses === "azure/webapps-deploy@v3");
        expect(deployAction?.with?.["images"]).toBe("${{ secrets.AZURE_CONTAINER_REGISTRY_ADDRESS }}/${{ needs.build.outputs.image }}");
        expect(deploy?.env?.["COMMIT_SHA"]).toBe("${{ needs.validate.outputs.source_sha }}");
        expect(JSON.stringify(deploy)).not.toContain("github.run_attempt");
        const availability = deploy?.steps?.find((candidate) => candidate.run?.includes("az acr repository show"));
        expect(availability?.run).toContain('--image "$IMAGE"');
        const unavailable = run("az() { return 1; }\n" + availability?.run, env);
        expect(unavailable.status).not.toBe(0);
        if (file.includes("exp")) {
          const settings = deploy?.steps?.find((candidate) => candidate.run?.includes("az webapp config appsettings set"));
          const result = run('az() { printf "<%s>" "$@"; }\n' + settings?.run, env);
          expect(result.status, result.text).toBe(0);
          expect(result.text).toContain(`<--settings><COMMIT_SHA=${oldSha}>`);
          expect(result.text).toContain("<--name><exp-arolariu-ro><--resource-group><arolariu-rg>");
        }
      }
    });

    it("retains mandatory website runtime smoke checks before publication", () => {
      const steps = workflow("official-website-build.yml").jobs["build"]?.steps ?? [];
      const smokeIndex = steps.findIndex((candidate) => candidate.run?.includes("runtime-configuration.smoke.mjs"));
      expect(smokeIndex).toBeGreaterThan(-1);
      expect(smokeIndex).toBeLessThan(steps.findIndex((candidate) => candidate.id === "publish"));
      expect(steps[smokeIndex]?.run).toContain('"${ACR_LOGIN_SERVER}/${IMAGE}" "$SITE_ENV"');
      const result = run("node() { return 1; }\n" + steps[smokeIndex]?.run, {
        ACR_LOGIN_SERVER: "fixture.azurecr.io",
        IMAGE: `frontend/arolariu:${oldSha}-123-2`,
        SITE_ENV: "PRODUCTION",
      });
      expect(result.status).not.toBe(0);
      expect(steps.find((candidate) => candidate.id === "publish")).not.toHaveProperty("if");
    });

    it("parses the full workflow/composite graph and syntax-checks every Bash step without execution", () => {
      for (const file of [...deploymentFiles, "official-website-release.yml"]) {
        for (const job of Object.values(workflow(file).jobs)) {
          for (const candidate of job.steps ?? []) {
            if (candidate.run) {
              const result = spawnSync(bash, ["--noprofile", "--norc", "-n"], {input: candidate.run, encoding: "utf8"});
              expect(result.status, `${file}: ${candidate.name}: ${result.stderr}`).toBe(0);
            }
            if (candidate.uses === "./.github/actions/setup-workspace") {
              const actionPath = join(workflowDirectory, "..", "actions", "setup-workspace", "action.yml");
              const parseYaml = parsers.yaml.parse as (source: string) => YamlNode;
              const action = yamlValue(parseYaml(readFileSync(actionPath, "utf8"))) as {inputs: Record<string, unknown>};
              for (const input of Object.keys(candidate.with ?? {})) expect(action.inputs).toHaveProperty(input);
            }
          }
        }
      }
      for (const name of ["setup-workspace", "setup-tooling"]) {
        const actionPath = join(workflowDirectory, "..", "actions", name, "action.yml");
        const parseYaml = parsers.yaml.parse as (source: string) => YamlNode;
        const action = yamlValue(parseYaml(readFileSync(actionPath, "utf8"))) as {runs: {steps: WorkflowStep[]}};
        for (const candidate of action.runs.steps) {
          if (candidate.run) {
            const result = spawnSync(bash, ["--noprofile", "--norc", "-n"], {input: candidate.run, encoding: "utf8"});
            expect(result.status, `${name}: ${candidate.name}: ${result.stderr}`).toBe(0);
          }
        }
      }
    });
  });
});

describe("GitHelper", () => {
  let gitHelper: ReturnType<typeof createGitHelper>;

  beforeEach(() => {
    vi.clearAllMocks();
    gitHelper = createGitHelper();
  });

  describe("fetchBranch", () => {
    it("should fetch branch with default depth", async () => {
      vi.mocked(exec.exec).mockResolvedValue(0);

      await gitHelper.fetchBranch("main");

      expect(exec.exec).toHaveBeenCalledWith("git", ["fetch", "origin", "main:refs/remotes/origin/main"], {
        ignoreReturnCode: true,
        silent: true,
      });
    });

    it("should fetch branch with custom depth", async () => {
      vi.mocked(exec.exec).mockResolvedValue(0);

      await gitHelper.fetchBranch("develop", undefined, 10);

      expect(exec.exec).toHaveBeenCalledWith("git", ["fetch", "origin", "develop:refs/remotes/origin/develop", "--depth=10"], {
        ignoreReturnCode: true,
        silent: true,
      });
    });

    it("should throw error on fetch failure", async () => {
      vi.mocked(exec.exec).mockRejectedValue(new Error("Fetch failed"));

      await expect(gitHelper.fetchBranch("main")).rejects.toThrow("Fetch failed");
    });
  });

  describe("getDiffStats", () => {
    it("should return diff statistics", async () => {
      const mockFilesOutput = `file1.ts
file2.ts
file3.ts`;
      const mockStatsOutput = "3 files changed, 15 insertions(+), 13 deletions(-)";

      vi.mocked(exec.getExecOutput)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: mockFilesOutput,
          stderr: "",
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: mockStatsOutput,
          stderr: "",
        });

      const stats = await gitHelper.getDiffStats("base", "head");

      expect(stats.filesChanged).toBe(3);
      expect(stats.linesAdded).toBe(15);
      expect(stats.linesDeleted).toBe(13);
      expect(exec.getExecOutput).toHaveBeenNthCalledWith(1, "git", ["diff", "--name-only", "base", "head"], expect.any(Object));
      expect(exec.getExecOutput).toHaveBeenNthCalledWith(2, "git", ["diff", "--shortstat", "base", "head"], expect.any(Object));
    });

    it("should return zero stats for no changes", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: "",
        stderr: "",
      });

      const stats = await gitHelper.getDiffStats("base", "head");

      expect(stats.filesChanged).toBe(0);
      expect(stats.linesAdded).toBe(0);
      expect(stats.linesDeleted).toBe(0);
    });
  });

  describe("getChangedFiles", () => {
    it("should return list of changed files", async () => {
      const mockOutput = `src/file1.ts
src/file2.ts
package.json`;

      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      const files = await gitHelper.getChangedFiles("base", "head");

      expect(files).toEqual(["src/file1.ts", "src/file2.ts", "package.json"]);
    });

    it("should return empty array when no files changed", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: "",
        stderr: "",
      });

      const files = await gitHelper.getChangedFiles("base", "head");

      expect(files).toEqual([]);
    });

    it("should filter out empty lines", async () => {
      const mockOutput = `src/file1.ts

src/file2.ts

`;

      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      const files = await gitHelper.getChangedFiles("base", "head");

      expect(files).toEqual(["src/file1.ts", "src/file2.ts"]);
    });
  });

  describe("getFileSizes", () => {
    it("should return file sizes from git tree", async () => {
      const mockOutput = `100644 blob abc123 1024	src/file1.ts
100644 blob def456 2048	src/file2.ts`;

      vi.mocked(exec.getExecOutput)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: mockOutput,
          stderr: "",
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: mockOutput,
          stderr: "",
        });

      const sizes = await gitHelper.getFileSizes("HEAD", ["src/file1.ts", "src/file2.ts"]);

      expect(sizes["src/file1.ts"]).toBe(1024);
      expect(sizes["src/file2.ts"]).toBe(2048);
    });

    it("should handle files not in tree", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: "",
        stderr: "",
      });

      const sizes = await gitHelper.getFileSizes("HEAD", ["nonexistent.ts"]);

      expect(sizes["nonexistent.ts"]).toBeUndefined();
    });

    it("should handle empty file list", async () => {
      const sizes = await gitHelper.getFileSizes("HEAD", []);

      expect(Object.keys(sizes).length).toBe(0);
    });
  });

  describe("getCommit", () => {
    it("should return commit information", async () => {
      const mockOutput = `abc123def456
abc123d
Test commit
John Doe
john@example.com
2024-01-01T00:00:00Z`;
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      const result = await gitHelper.getCommit("HEAD");

      expect(result.sha).toBe("abc123def456");
      expect(result.shortSha).toBe("abc123d");
      expect(result.message).toBe("Test commit");
    });
  });

  describe("getCurrentBranch", () => {
    it("should return current branch name", async () => {
      const branchName = "feature/test-branch";
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: branchName + "\n",
        stderr: "",
      });

      const result = await gitHelper.getCurrentBranch();

      expect(result).toBe(branchName);
      expect(exec.getExecOutput).toHaveBeenCalledWith("git", ["rev-parse", "--abbrev-ref", "HEAD"], expect.any(Object));
    });
  });

  describe("refExists", () => {
    it("should return true for existing ref", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: "abc123",
        stderr: "",
      });

      const result = await gitHelper.refExists("origin/main");

      expect(result).toBe(true);
    });

    it("should return false for non-existing ref", async () => {
      vi.mocked(exec.getExecOutput).mockRejectedValue(new Error("Not found"));

      const result = await gitHelper.refExists("origin/nonexistent");

      expect(result).toBe(false);
    });

    it("should return false for non-zero exit code", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 1,
        stdout: "",
        stderr: "fatal: Needed a single revision",
      });

      const result = await gitHelper.refExists("invalid-ref");

      expect(result).toBe(false);
    });
  });

  describe("getCommitCount", () => {
    it("should return commit count between refs", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: "42\n",
        stderr: "",
      });

      const count = await gitHelper.getCommitCount("origin/main", "HEAD");

      expect(count).toBe(42);
      expect(exec.getExecOutput).toHaveBeenCalledWith("git", ["rev-list", "--count", "origin/main..HEAD"], expect.any(Object));
    });

    it("should return 0 for invalid output", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: "not-a-number\n",
        stderr: "",
      });

      const count = await gitHelper.getCommitCount("base", "head");

      expect(count).toBe(0);
    });

    it("should return 0 for no commits", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: "0\n",
        stderr: "",
      });

      const count = await gitHelper.getCommitCount("base", "head");

      expect(count).toBe(0);
    });
  });

  describe("listBranches", () => {
    it("should list local branches", async () => {
      const mockOutput = `main|abc123|abc123d|*
feature/test|def456|def456e| `;
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      const branches = await gitHelper.listBranches();

      expect(branches).toHaveLength(2);
      expect(branches[0]?.name).toBe("main");
      expect(branches[0]?.isCurrent).toBe(true);
      expect(branches[1]?.name).toBe("feature/test");
      expect(branches[1]?.isCurrent).toBe(false);
    });

    it("should list remote branches", async () => {
      const mockOutput = `origin/main|abc123|abc123d|
origin/develop|def456|def456e| `;
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      const branches = await gitHelper.listBranches("origin");

      expect(branches).toHaveLength(2);
      expect(exec.getExecOutput).toHaveBeenCalledWith("git", expect.arrayContaining(["--remote", "origin/*"]), expect.any(Object));
    });

    it("should handle empty branch list", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: "\n",
        stderr: "",
      });

      const branches = await gitHelper.listBranches();

      expect(branches).toEqual([]);
    });

    it("should handle malformed branch output", async () => {
      const mockOutput = `main|abc123|abc123d|*
invalid-line
feature|def456|def456e| `;
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      const branches = await gitHelper.listBranches();

      expect(branches).toHaveLength(2); // Should skip invalid line
      expect(branches[0]?.name).toBe("main");
      expect(branches[1]?.name).toBe("feature");
    });
  });

  describe("createBranch", () => {
    it("should create branch without start point", async () => {
      vi.mocked(exec.exec).mockResolvedValue(0);

      await gitHelper.createBranch("new-branch");

      expect(exec.exec).toHaveBeenCalledWith("git", ["branch", "new-branch"]);
    });

    it("should create branch from start point", async () => {
      vi.mocked(exec.exec).mockResolvedValue(0);

      await gitHelper.createBranch("new-branch", "origin/main");

      expect(exec.exec).toHaveBeenCalledWith("git", ["branch", "new-branch", "origin/main"]);
    });

    it("should throw error on failure", async () => {
      vi.mocked(exec.exec).mockRejectedValue(new Error("Branch already exists"));

      await expect(gitHelper.createBranch("existing-branch")).rejects.toThrow("Branch already exists");
    });
  });

  describe("checkout", () => {
    it("should checkout existing ref", async () => {
      vi.mocked(exec.exec).mockResolvedValue(0);

      await gitHelper.checkout("main");

      expect(exec.exec).toHaveBeenCalledWith("git", ["checkout", "main"]);
    });

    it("should checkout and create new branch", async () => {
      vi.mocked(exec.exec).mockResolvedValue(0);

      await gitHelper.checkout("new-branch", true);

      expect(exec.exec).toHaveBeenCalledWith("git", ["checkout", "-b", "new-branch"]);
    });

    it("should throw error on failure", async () => {
      vi.mocked(exec.exec).mockRejectedValue(new Error("Branch not found"));

      await expect(gitHelper.checkout("nonexistent")).rejects.toThrow("Branch not found");
    });
  });

  describe("exec", () => {
    it("should execute git command", async () => {
      const mockOutput = {
        exitCode: 0,
        stdout: "command output",
        stderr: "",
      };
      vi.mocked(exec.getExecOutput).mockResolvedValue(mockOutput);

      const result = await gitHelper.exec(["status"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("command output");
      expect(exec.getExecOutput).toHaveBeenCalledWith(
        "git",
        ["status"],
        expect.objectContaining({
          ignoreReturnCode: false,
          silent: false,
        }),
      );
    });

    it("should execute with custom options", async () => {
      const mockOutput = {
        exitCode: 0,
        stdout: "output",
        stderr: "",
      };
      vi.mocked(exec.getExecOutput).mockResolvedValue(mockOutput);

      await gitHelper.exec(["log"], {cwd: "/custom/dir", silent: true, ignoreReturnCode: true});

      expect(exec.getExecOutput).toHaveBeenCalledWith(
        "git",
        ["log"],
        expect.objectContaining({
          cwd: "/custom/dir",
          silent: true,
          ignoreReturnCode: true,
        }),
      );
    });

    it("should return error output", async () => {
      const mockOutput = {
        exitCode: 1,
        stdout: "",
        stderr: "error message",
      };
      vi.mocked(exec.getExecOutput).mockResolvedValue(mockOutput);

      const result = await gitHelper.exec(["invalid"], {ignoreReturnCode: true});

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBe("error message");
    });
  });

  describe("getFileSizes error handling", () => {
    it("should handle invalid tree ref", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 128,
        stdout: "",
        stderr: "fatal: Not a valid object name invalid-ref",
      });

      const sizes = await gitHelper.getFileSizes("invalid-ref", ["some/path"]);

      expect(Object.keys(sizes).length).toBe(0);
    });

    it("should handle execution error", async () => {
      vi.mocked(exec.getExecOutput).mockRejectedValue(new Error("Command failed"));

      const sizes = await gitHelper.getFileSizes("HEAD", ["some/path"]);

      expect(Object.keys(sizes).length).toBe(0);
    });

    it("should handle trailing slash in paths", async () => {
      const mockOutput = `100644 blob abc123 1024	src/file.ts`;
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      const sizes = await gitHelper.getFileSizes("HEAD", ["src/"]);

      expect(Object.keys(sizes).length).toBeGreaterThan(0);
    });
  });

  describe("getCommit error handling", () => {
    it("should throw error for invalid format", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: "incomplete\noutput",
        stderr: "",
      });

      await expect(gitHelper.getCommit("invalid-ref")).rejects.toThrow("Failed to parse commit info");
    });
  });
});
