// @vitest-environment node
/**
 * @fileoverview Characterization coverage for every public script command contract.
 * @module scripts/testing/compatibility/public-command-contracts.test
 */

import {spawnSync} from "node:child_process";
import {existsSync} from "node:fs";
import {describe, expect, it} from "vitest";

import {scriptEntrypointDefinitions} from "../architecture/script-entrypoint-definitions.ts";
import {publicCommandBehaviorEvidenceDefinitions} from "./public-command-contracts.ts";

interface DirectInvocationOutcome {
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;
}

function normalizeProcessText(text: string): string {
  return text.replaceAll("\r\n", "\n");
}

function invokeNodeCommand(sourcePath: string, args: readonly string[]): Readonly<DirectInvocationOutcome> {
  const result = spawnSync(process.execPath, [sourcePath, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {...process.env, FORCE_COLOR: "0"},
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error !== undefined) {
    throw result.error;
  }

  return {
    exitCode: result.status,
    signal: result.signal,
    stdout: normalizeProcessText(result.stdout),
    stderr: normalizeProcessText(result.stderr),
  };
}

const publicEntrypoints = scriptEntrypointDefinitions.filter(({role}) => role === "public-command");
const publicCommanderEntrypoints = publicEntrypoints.filter(({hostKind}) => hostKind === "commander");

describe("public command behavior evidence", () => {
  it("maps every public command to existing behavior tests or an explicit cohort gap", () => {
    expect(publicCommandBehaviorEvidenceDefinitions.map(({sourcePath}) => sourcePath).toSorted()).toEqual(
      publicEntrypoints.map(({sourcePath}) => sourcePath).toSorted(),
    );

    for (const definition of publicCommandBehaviorEvidenceDefinitions) {
      expect(definition.behaviorTestPaths.filter((path) => !existsSync(path))).toEqual([]);
      expect(
        definition.behaviorTestPaths.length > 0 || definition.characterizationGaps.length > 0,
        `${definition.sourcePath} needs behavior evidence or an explicit gap`,
      ).toBe(true);
    }
  });

  it("limits known host characterization gaps to format and lint Cohort 7 work", () => {
    expect(
      publicCommandBehaviorEvidenceDefinitions
        .filter(({characterizationGaps}) => characterizationGaps.length > 0)
        .map(({sourcePath, characterizationGaps}) => ({sourcePath, characterizationGaps})),
    ).toEqual([
      {
        sourcePath: "scripts/format.ts",
        characterizationGaps: [
          {
            missingBehavior:
              "Format Piscina host target decoding, task planning, worker aggregation, presentation, and direct-entry exit behavior",
            scheduledCohort: 7,
          },
        ],
      },
      {
        sourcePath: "scripts/lint.ts",
        characterizationGaps: [
          {
            missingBehavior:
              "Lint Piscina host target decoding, task planning, worker aggregation, presentation, and direct-entry exit behavior",
            scheduledCohort: 7,
          },
        ],
      },
    ]);
  });
});

describe("public Commander CLI compatibility", () => {
  it("preserves help text, option declarations, defaults, order, and stream placement", () => {
    const transcripts = publicCommanderEntrypoints.map(({sourcePath}) => {
      const outcome = invokeNodeCommand(sourcePath, ["--help"]);
      expect(outcome.signal, sourcePath).toBeNull();
      expect(outcome.exitCode, sourcePath).toBe(0);
      return {sourcePath, outcome};
    });

    expect(JSON.stringify(transcripts)).toMatchInlineSnapshot(
      `"[{"sourcePath":"scripts/container-runtime/aspire.ts","outcome":{"exitCode":0,"signal":null,"stdout":"Usage: aspire [--engine <rancher|podman>]\\n\\nStarts the Aspire AppHost with the selected local container engine.\\n\\nOptions:\\n  --engine <engine>  Container engine to use (rancher or podman).\\n  -h, --help         display help for command\\n\\nExamples:\\n  npm run dev -- --engine rancher\\n  npm run dev -- --engine podman\\n","stderr":""}},{"sourcePath":"scripts/container-runtime/compose.ts","outcome":{"exitCode":0,"signal":null,"stdout":"Usage: compose --file <compose-file> [--engine <rancher|podman>] -- <compose arguments>\\n\\nRuns an arbitrary Compose file through the selected local container engine.\\n\\nArguments:\\n  passthrough        Arguments forwarded to Compose unchanged after --.\\n\\nOptions:\\n  --file <path>      Compose file to invoke.\\n  --engine <engine>  Container engine to use (rancher or podman).\\n  -h, --help         display help for command\\n\\nExamples:\\n  npm run containers:compose -- --file infra/Local/Storage/docker-compose.yml -- up -d\\n","stderr":""}},{"sourcePath":"scripts/container-runtime/image.ts","outcome":{"exitCode":0,"signal":null,"stdout":"Usage: image <build|run> --target <frontend|backend|cv|exp> [--engine <rancher|podman>]\\n\\nBuilds or runs a local container image with the selected engine.\\n\\nArguments:\\n  action             Image action to run: build or run.\\n\\nOptions:\\n  --target <target>  Image target: frontend, backend, cv, or exp.\\n  --engine <engine>  Container engine to use (rancher or podman).\\n  -h, --help         display help for command\\n\\nExamples:\\n  npm run containers:build -- --target frontend --engine rancher\\n  npm run containers:run -- --target backend --engine podman\\n","stderr":""}},{"sourcePath":"scripts/container-runtime/selfhost.ts","outcome":{"exitCode":0,"signal":null,"stdout":"Usage: selfhost [start|stop|logs] [--engine <rancher|podman>]\\n\\nRuns selfhost container orchestration for the selected local engine.\\n\\nArguments:\\n  action             Selfhost action to run: start, stop, or logs (default:\\n                     start).\\n\\nOptions:\\n  --engine <engine>  Container engine to use (rancher or podman).\\n  -h, --help         display help for command\\n\\nExamples:\\n  npm run dev:selfhost -- --engine rancher\\n  npm run dev:selfhost:stop -- --engine podman\\n","stderr":""}},{"sourcePath":"scripts/features/documentation/command.ts","outcome":{"exitCode":0,"signal":null,"stdout":"Usage: docs-assemble [options]\\n\\nRuns TypeDoc, pydoc-markdown, and DefaultDocumentation in parallel, normalizes\\nfrontmatter, writes landing pages, and mirrors prose into the Docusaurus source\\ntree.\\n\\nOptions:\\n  -h, --help  display help for command\\n\\nExamples:\\n  npm run docs:assemble\\n  node --experimental-strip-types scripts/features/documentation/command.ts\\n","stderr":""}},{"sourcePath":"scripts/doctor.ts","outcome":{"exitCode":0,"signal":null,"stdout":"Usage: doctor [options]\\n\\nRuns read-only workspace health diagnostics across every bounded context.\\n\\nOptions:\\n  -v, --verbose  Show diagnostic evidence for every check. (default: false)\\n  --quick        Skip slower and network-dependent checks. (default: false)\\n  -h, --help     display help for command\\n\\nExamples:\\n  npm run doctor\\n  npm run doctor -- --verbose\\n  npm run doctor -- --quick\\n","stderr":""}},{"sourcePath":"scripts/generate.artifacts.ts","outcome":{"exitCode":0,"signal":null,"stdout":"Usage: generate:artifacts [options]\\n\\nGenerates taxonomy and license artifacts (GPC, ECOICOP, NACE, frontend\\nlicenses).\\n\\nOptions:\\n  -v, --verbose  Enable verbose logging.\\n  -h, --help     display help for command\\n\\nExamples:\\n  npm run generate:artifacts\\n  npm run generate /a -- --verbose\\n","stderr":""}},{"sourcePath":"scripts/generate.env.ts","outcome":{"exitCode":0,"signal":null,"stdout":"Usage: generate:env [options]\\n\\nGenerate the website environment file.\\n\\nOptions:\\n  -v, --verbose  Enable diagnostic output.\\n  -h, --help     display help for command\\n\\nExamples:\\n  npm run generate:env\\n  npm run generate:env -- --verbose\\n","stderr":""}},{"sourcePath":"scripts/generate.gql.ts","outcome":{"exitCode":0,"signal":null,"stdout":"Usage: generate:gql [options]\\n\\nGenerates GraphQL type artifacts (placeholder implementation).\\n\\nOptions:\\n  -v, --verbose  Enable verbose logging.\\n  -h, --help     display help for command\\n\\nExamples:\\n  npm run generate:gql\\n  npm run generate:gql -- --verbose\\n","stderr":""}},{"sourcePath":"scripts/generate.i18n.ts","outcome":{"exitCode":0,"signal":null,"stdout":"Usage: generate:i18n [options]\\n\\nValidates and synchronizes translation files against English (en.json).\\n\\nOptions:\\n  -v, --verbose  Enable verbose logging.\\n  -h, --help     display help for command\\n\\nExamples:\\n  npm run generate:i18n\\n  npm run generate:i18n -- --verbose\\n","stderr":""}},{"sourcePath":"scripts/generate.ts","outcome":{"exitCode":0,"signal":null,"stdout":"Usage: generate [options]\\n\\nGeneration orchestrator for monorepo build artifacts.\\n\\nOptions:\\n  -v, --verbose    Enable verbose logging. 🔊\\n  -e, --env        Generate environment configuration file (.env). ☁️\\n  -i, --i18n       Synchronize translation keys (messages). 🌍\\n  -g, --gql        Generate GraphQL type artifacts. 🧬\\n  -a, --artifacts  Generate taxonomy and license artifacts. 🏷️\\n  -h, --help       display help for command\\n\\nExamples:\\n  npm run generate /env /artifacts\\n  npm run generate --env --i18n --artifacts --verbose\\n  npm run generate -e -g -a -v\\n","stderr":""}},{"sourcePath":"scripts/setup.ts","outcome":{"exitCode":0,"signal":null,"stdout":"Usage: setup [options]\\n\\nPrepares a fresh checkout end to end: workspace dependencies, generated\\nartifacts, and the .NET, React, Svelte, Python, and local infrastructure\\ntoolchains.\\n\\nOptions:\\n  --verbose          Show diagnostic detail for each phase. (default: false)\\n  --dry-run          Plan every phase mutation without executing it. (default:\\n                     false)\\n  --yes              Approve system-scoped mutations without prompting.\\n                     (default: false)\\n  --engine <engine>  Select rancher or podman for infrastructure phases.\\n  -h, --help         display help for command\\n\\nExamples:\\n  npm run setup\\n  npm run setup -- --dry-run\\n  npm run setup -- --engine podman\\n","stderr":""}},{"sourcePath":"scripts/status.ts","outcome":{"exitCode":0,"signal":null,"stdout":"Usage: status [options]\\n\\nCollects and renders monorepo health, workspace, git, security, and disk data.\\n\\nOptions:\\n  --json      Output all collected data as a single JSON document. (default:\\n              false)\\n  -h, --help  display help for command\\n\\nExamples:\\n  npm run status\\n  npm run status -- --json\\n","stderr":""}},{"sourcePath":"scripts/features/end-to-end/command.ts","outcome":{"exitCode":0,"signal":null,"stdout":"Usage: test:e2e <target>\\n\\nRuns Postman/Newman E2E tests for arolariu.ro targets.\\n\\nArguments:\\n  target      Target to test: all, backend, frontend, or cv.\\n\\nOptions:\\n  -h, --help  display help for command\\n\\nExamples:\\n  npm run test:e2e -- backend\\n  npm run test:e2e -- frontend\\n  npm run test:e2e -- cv\\n  npm run test:e2e -- all\\n","stderr":""}},{"sourcePath":"scripts/features/exchange-rates/command.ts","outcome":{"exitCode":0,"signal":null,"stdout":"Usage: update-exchange-rates [options]\\n\\nFetches yearly exchange rate averages from the Frankfurter API and writes them\\nto CSV.\\n\\nOptions:\\n  --year <year>  Fetch a single year (2018-current).\\n  --from <year>  Starting year (default: 2018).\\n  --to <year>    Ending year (default: current year).\\n  -h, --help     display help for command\\n\\nExamples:\\n  npm run update-exchange-rates\\n  npm run update-exchange-rates -- --year 2025\\n  npm run update-exchange-rates -- --from 2020 --to 2025\\n","stderr":""}}]"`,
    );
  }, 120_000);

  it("preserves unknown-option usage output and exit classification", () => {
    const transcripts = publicCommanderEntrypoints.map(({sourcePath}) => {
      const outcome = invokeNodeCommand(sourcePath, ["--definitely-not-a-real-option"]);
      expect(outcome.signal, sourcePath).toBeNull();
      expect(outcome.exitCode, sourcePath).toBe(2);
      return {sourcePath, outcome};
    });

    expect(JSON.stringify(transcripts)).toMatchInlineSnapshot(
      `"[{"sourcePath":"scripts/container-runtime/aspire.ts","outcome":{"exitCode":2,"signal":null,"stdout":"","stderr":"error: unknown option '--definitely-not-a-real-option'\\n\\nUsage: aspire [--engine <rancher|podman>]\\n\\nStarts the Aspire AppHost with the selected local container engine.\\n\\nOptions:\\n  --engine <engine>  Container engine to use (rancher or podman).\\n  -h, --help         display help for command\\n\\nExamples:\\n  npm run dev -- --engine rancher\\n  npm run dev -- --engine podman\\n"}},{"sourcePath":"scripts/container-runtime/compose.ts","outcome":{"exitCode":2,"signal":null,"stdout":"","stderr":"error: unknown option '--definitely-not-a-real-option'\\n\\nUsage: compose --file <compose-file> [--engine <rancher|podman>] -- <compose arguments>\\n\\nRuns an arbitrary Compose file through the selected local container engine.\\n\\nArguments:\\n  passthrough        Arguments forwarded to Compose unchanged after --.\\n\\nOptions:\\n  --file <path>      Compose file to invoke.\\n  --engine <engine>  Container engine to use (rancher or podman).\\n  -h, --help         display help for command\\n\\nExamples:\\n  npm run containers:compose -- --file infra/Local/Storage/docker-compose.yml -- up -d\\n"}},{"sourcePath":"scripts/container-runtime/image.ts","outcome":{"exitCode":2,"signal":null,"stdout":"","stderr":"error: unknown option '--definitely-not-a-real-option'\\n\\nUsage: image <build|run> --target <frontend|backend|cv|exp> [--engine <rancher|podman>]\\n\\nBuilds or runs a local container image with the selected engine.\\n\\nArguments:\\n  action             Image action to run: build or run.\\n\\nOptions:\\n  --target <target>  Image target: frontend, backend, cv, or exp.\\n  --engine <engine>  Container engine to use (rancher or podman).\\n  -h, --help         display help for command\\n\\nExamples:\\n  npm run containers:build -- --target frontend --engine rancher\\n  npm run containers:run -- --target backend --engine podman\\n"}},{"sourcePath":"scripts/container-runtime/selfhost.ts","outcome":{"exitCode":2,"signal":null,"stdout":"","stderr":"error: unknown option '--definitely-not-a-real-option'\\n\\nUsage: selfhost [start|stop|logs] [--engine <rancher|podman>]\\n\\nRuns selfhost container orchestration for the selected local engine.\\n\\nArguments:\\n  action             Selfhost action to run: start, stop, or logs (default:\\n                     start).\\n\\nOptions:\\n  --engine <engine>  Container engine to use (rancher or podman).\\n  -h, --help         display help for command\\n\\nExamples:\\n  npm run dev:selfhost -- --engine rancher\\n  npm run dev:selfhost:stop -- --engine podman\\n"}},{"sourcePath":"scripts/features/documentation/command.ts","outcome":{"exitCode":2,"signal":null,"stdout":"","stderr":"error: unknown option '--definitely-not-a-real-option'\\n\\nUsage: docs-assemble [options]\\n\\nRuns TypeDoc, pydoc-markdown, and DefaultDocumentation in parallel, normalizes\\nfrontmatter, writes landing pages, and mirrors prose into the Docusaurus source\\ntree.\\n\\nOptions:\\n  -h, --help  display help for command\\n\\nExamples:\\n  npm run docs:assemble\\n  node --experimental-strip-types scripts/features/documentation/command.ts\\n"}},{"sourcePath":"scripts/doctor.ts","outcome":{"exitCode":2,"signal":null,"stdout":"","stderr":"error: unknown option '--definitely-not-a-real-option'\\n\\nUsage: doctor [options]\\n\\nRuns read-only workspace health diagnostics across every bounded context.\\n\\nOptions:\\n  -v, --verbose  Show diagnostic evidence for every check. (default: false)\\n  --quick        Skip slower and network-dependent checks. (default: false)\\n  -h, --help     display help for command\\n\\nExamples:\\n  npm run doctor\\n  npm run doctor -- --verbose\\n  npm run doctor -- --quick\\n"}},{"sourcePath":"scripts/generate.artifacts.ts","outcome":{"exitCode":2,"signal":null,"stdout":"","stderr":"error: unknown option '--definitely-not-a-real-option'\\n\\nUsage: generate:artifacts [options]\\n\\nGenerates taxonomy and license artifacts (GPC, ECOICOP, NACE, frontend\\nlicenses).\\n\\nOptions:\\n  -v, --verbose  Enable verbose logging.\\n  -h, --help     display help for command\\n\\nExamples:\\n  npm run generate:artifacts\\n  npm run generate /a -- --verbose\\n"}},{"sourcePath":"scripts/generate.env.ts","outcome":{"exitCode":2,"signal":null,"stdout":"","stderr":"error: unknown option '--definitely-not-a-real-option'\\n\\nUsage: generate:env [options]\\n\\nGenerate the website environment file.\\n\\nOptions:\\n  -v, --verbose  Enable diagnostic output.\\n  -h, --help     display help for command\\n\\nExamples:\\n  npm run generate:env\\n  npm run generate:env -- --verbose\\n"}},{"sourcePath":"scripts/generate.gql.ts","outcome":{"exitCode":2,"signal":null,"stdout":"","stderr":"error: unknown option '--definitely-not-a-real-option'\\n\\nUsage: generate:gql [options]\\n\\nGenerates GraphQL type artifacts (placeholder implementation).\\n\\nOptions:\\n  -v, --verbose  Enable verbose logging.\\n  -h, --help     display help for command\\n\\nExamples:\\n  npm run generate:gql\\n  npm run generate:gql -- --verbose\\n"}},{"sourcePath":"scripts/generate.i18n.ts","outcome":{"exitCode":2,"signal":null,"stdout":"","stderr":"error: unknown option '--definitely-not-a-real-option'\\n\\nUsage: generate:i18n [options]\\n\\nValidates and synchronizes translation files against English (en.json).\\n\\nOptions:\\n  -v, --verbose  Enable verbose logging.\\n  -h, --help     display help for command\\n\\nExamples:\\n  npm run generate:i18n\\n  npm run generate:i18n -- --verbose\\n"}},{"sourcePath":"scripts/generate.ts","outcome":{"exitCode":2,"signal":null,"stdout":"","stderr":"error: unknown option '--definitely-not-a-real-option'\\n\\nUsage: generate [options]\\n\\nGeneration orchestrator for monorepo build artifacts.\\n\\nOptions:\\n  -v, --verbose    Enable verbose logging. 🔊\\n  -e, --env        Generate environment configuration file (.env). ☁️\\n  -i, --i18n       Synchronize translation keys (messages). 🌍\\n  -g, --gql        Generate GraphQL type artifacts. 🧬\\n  -a, --artifacts  Generate taxonomy and license artifacts. 🏷️\\n  -h, --help       display help for command\\n\\nExamples:\\n  npm run generate /env /artifacts\\n  npm run generate --env --i18n --artifacts --verbose\\n  npm run generate -e -g -a -v\\n"}},{"sourcePath":"scripts/setup.ts","outcome":{"exitCode":2,"signal":null,"stdout":"","stderr":"error: unknown option '--definitely-not-a-real-option'\\n\\nUsage: setup [options]\\n\\nPrepares a fresh checkout end to end: workspace dependencies, generated\\nartifacts, and the .NET, React, Svelte, Python, and local infrastructure\\ntoolchains.\\n\\nOptions:\\n  --verbose          Show diagnostic detail for each phase. (default: false)\\n  --dry-run          Plan every phase mutation without executing it. (default:\\n                     false)\\n  --yes              Approve system-scoped mutations without prompting.\\n                     (default: false)\\n  --engine <engine>  Select rancher or podman for infrastructure phases.\\n  -h, --help         display help for command\\n\\nExamples:\\n  npm run setup\\n  npm run setup -- --dry-run\\n  npm run setup -- --engine podman\\n"}},{"sourcePath":"scripts/status.ts","outcome":{"exitCode":2,"signal":null,"stdout":"","stderr":"error: unknown option '--definitely-not-a-real-option'\\n\\nUsage: status [options]\\n\\nCollects and renders monorepo health, workspace, git, security, and disk data.\\n\\nOptions:\\n  --json      Output all collected data as a single JSON document. (default:\\n              false)\\n  -h, --help  display help for command\\n\\nExamples:\\n  npm run status\\n  npm run status -- --json\\n"}},{"sourcePath":"scripts/features/end-to-end/command.ts","outcome":{"exitCode":2,"signal":null,"stdout":"","stderr":"error: unknown option '--definitely-not-a-real-option'\\n\\nUsage: test:e2e <target>\\n\\nRuns Postman/Newman E2E tests for arolariu.ro targets.\\n\\nArguments:\\n  target      Target to test: all, backend, frontend, or cv.\\n\\nOptions:\\n  -h, --help  display help for command\\n\\nExamples:\\n  npm run test:e2e -- backend\\n  npm run test:e2e -- frontend\\n  npm run test:e2e -- cv\\n  npm run test:e2e -- all\\n"}},{"sourcePath":"scripts/features/exchange-rates/command.ts","outcome":{"exitCode":2,"signal":null,"stdout":"","stderr":"error: unknown option '--definitely-not-a-real-option'\\n\\nUsage: update-exchange-rates [options]\\n\\nFetches yearly exchange rate averages from the Frankfurter API and writes them\\nto CSV.\\n\\nOptions:\\n  --year <year>  Fetch a single year (2018-current).\\n  --from <year>  Starting year (default: 2018).\\n  --to <year>    Ending year (default: current year).\\n  -h, --help     display help for command\\n\\nExamples:\\n  npm run update-exchange-rates\\n  npm run update-exchange-rates -- --year 2025\\n  npm run update-exchange-rates -- --from 2020 --to 2025\\n"}}]"`,
    );
  }, 120_000);
});
