// @vitest-environment node
import {readFile} from "node:fs/promises";
import {join} from "node:path";

import {Effect, FileSystem} from "effect";
import {parse} from "yaml";
import {expect, it} from "vitest";

import {Environment} from "../../platform/Environment.ts";
import {makeTestLayer, repositoryFixtureRoot, runScoped} from "../../platform/testing.ts";
import {generateEnvironment} from "./env.ts";

it("generates release runtime configuration from Azure mode without local prompts", async () => {
  const workflow: unknown = parse(
    await readFile(new URL("../../../.github/workflows/official-website-release.yml", import.meta.url), "utf8"),
  );
  const hasEnv = typeof workflow === "object" && workflow !== null && "env" in workflow;
  const rawEnv = hasEnv ? workflow.env : undefined;
  const infra = typeof rawEnv === "object" && rawEnv !== null && "INFRA" in rawEnv ? rawEnv.INFRA : undefined;
  const harness = makeTestLayer({
    files: {"package.json": JSON.stringify({name: "@arolariu/monorepo"}), "sites/arolariu.ro/package.json": "{}"},
    environment: {
      isCI: true,
      variables: {
        AZURE_CLIENT_ID: "fixture-identity",
        SITE_ENV: "PRODUCTION",
        PRODUCTION: "true",
        EXP_PROXY_URL: "https://fixture-exp.invalid",
      },
    },
    http: [
      {
        match: (request) => request.url === "https://fixture-exp.invalid/api/v1/build-time?for=website&label=PRODUCTION",
        respond: {
          status: 200,
          body: JSON.stringify({
            config: {
              "Site:Name": "arolariu.ro",
              "Site:Environment": "PRODUCTION",
              "Site:Url": "https://arolariu.ro",
              "Site:UseCdn": "false",
              "Auth:Clerk:PublishableKey": "pk_test_padded==",
              "Auth:Clerk:SecretKey": "sk_test_private=literal",
            },
          }),
        },
      },
    ],
  });
  await runScoped(
    Effect.gen(function* () {
      const snapshot = yield* Environment;
      const exit = yield* Effect.exit(
        generateEnvironment.pipe(
          Effect.provideService(Environment, {
            ...snapshot,
            variables: {...snapshot.variables, ...(typeof infra === "string" ? {INFRA: infra} : {})},
          }),
        ),
      );
      expect(harness.httpCalls()).toHaveLength(1);
      expect(exit._tag).toBe("Success");
      const fs = yield* FileSystem.FileSystem;
      expect(yield* fs.readFileString(join(repositoryFixtureRoot, "sites", "arolariu.ro", ".env"))).toContain(
        'CLERK_SECRET_KEY="sk_test_private=literal"',
      );
    }),
    harness.layer,
  );
});
