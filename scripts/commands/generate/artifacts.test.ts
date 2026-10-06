// @vitest-environment node
/**
 * @fileoverview Tests for unified taxonomy and license artifact generation.
 * @module scripts/commands/generate/artifacts.test
 *
 * @remarks
 * Every case runs on `makeTestLayer`: an in-memory filesystem, scripted taxonomy HTTP responses
 * (GS1 archive and Publications Office SPARQL pages), a scripted `tar`/`unzip` process that
 * materializes the archive entries, and the test clock. Cases whose source responses depend on the
 * attempt ordinal or need a transport failure replace only the `HttpClient` boundary. No module
 * is mocked; nothing reads the live taxonomy cache or the network.
 */

import {join, relative} from "node:path";

import {Effect, Fiber, FileSystem, type Duration, type PlatformError, type Scope} from "effect";
import {HttpClient, HttpClientError, HttpClientResponse, type HttpClientRequest} from "effect/http";
import {TestClock} from "effect/testing";
import {describe, expect, vi} from "vitest";

import {ProcessExited, ProcessSpawnFailed, type ProcessError} from "../../platform/Process.ts";
import {
  effectTest,
  makeTestLayer,
  repositoryFixtureRoot,
  type ScriptedHttp,
  type ScriptedProcess,
  type TestHarness,
} from "../../platform/testing.ts";
import type {TaxonomyArtifact} from "../../types";
import {
  BackendLicenseGenerator,
  EcoicopTaxonomyClassificationGenerator,
  FrontendLicenseGenerator,
  generateArtifacts,
  getExpectedTaxonomyArtifactPaths,
  Gs1GpcTaxonomyClassificationGenerator,
  NaceTaxonomyClassificationGenerator,
  taxonomyArtifactFileNames,
  TaxonomyClassificationGenerator,
  type ArtifactGenerationError,
} from "./artifacts.ts";
import type {GenerateRequirements} from "./env.ts";
import {ArtifactGenerationFailed, TaxonomySourceUnavailable} from "./errors.ts";

/** Pinned GS1 archive URL. */
const GPC_URL = "https://ref.gs1.org/standards/gpc/2026-05/";

/** Timestamp every generated artifact records. */
const FIXED_NOW = Date.parse("2026-08-19T00:00:00.000Z");

/** Exact archive entry the GPC generator extracts. */
const GPC_ENTRY = "GPC as of May 2026 (2026-05-20) EN.json";

/** Valid English GPC source document used by successful generation tests. */
const GPC_DOCUMENT = {
  LanguageCode: "EN",
  DateUtc: "2026-05-01",
  Schema: [
    {
      Level: 1,
      Code: 50000000,
      Title: "Food",
      Definition: null,
      DefinitionExcludes: null,
      Active: true,
      Childs: [
        {
          Level: 4,
          Code: 10000266,
          Title: "Bread",
          Definition: "Ready-to-eat; chilled!",
          DefinitionExcludes: null,
          Active: true,
          Childs: [],
        },
      ],
    },
  ],
} as const;

/** Explicit mirrored output roots used by the class-level taxonomy tests. */
const TEST_ROOTS = [join(repositoryFixtureRoot, "mirror", "api"), join(repositoryFixtureRoot, "mirror", "web")] as const;

/** Repository-relative artifact text the unified generation writes for the fixtures, in reported order. */
const EXPECTED_ARTIFACT_BYTES: Readonly<Record<string, string>> = (() => {
  const gpc = JSON.stringify({
    system: "GS1_GPC",
    version: "2026-05",
    sourceUrl: "https://ref.gs1.org/standards/gpc/2026-05/",
    generatedAt: "2026-08-19T00:00:00.000Z",
    attribution: "GS1 Global Product Classification (GPC), May 2026 release.",
    nodes: [
      {
        code: "50000000",
        officialLabel: "Food",
        level: "segment",
        parentCode: null,
        hierarchyCodes: ["50000000"],
        hierarchyLabels: ["Food"],
        definition: null,
        searchText: "50000000 food",
      },
      {
        code: "10000266",
        officialLabel: "Bread",
        level: "brick",
        parentCode: "50000000",
        hierarchyCodes: ["50000000", "10000266"],
        hierarchyLabels: ["Food", "Bread"],
        definition: "Ready-to-eat; chilled!",
        searchText: "10000266 bread ready to eat chilled food",
      },
    ],
  });
  const ecoicop = JSON.stringify({
    system: "ECOICOP_V2",
    version: "2",
    sourceUrl: "https://publications.europa.eu/webapi/rdf/sparql#http://data.europa.eu/ed1/ecoicop2/ecoicop2",
    generatedAt: "2026-08-19T00:00:00.000Z",
    attribution: "European Union, Publications Office of the European Union, reused under the European Commission reuse policy.",
    nodes: [
      {
        code: "01",
        officialLabel: "Food",
        level: "division",
        parentCode: null,
        hierarchyCodes: ["01"],
        hierarchyLabels: ["Food"],
        definition: null,
        searchText: "01 food food",
      },
    ],
  });
  const nace = JSON.stringify({
    system: "NACE_2_1",
    version: "2.1",
    sourceUrl: "https://publications.europa.eu/webapi/rdf/sparql#http://data.europa.eu/ux2/nace2.1/nace2.1",
    generatedAt: "2026-08-19T00:00:00.000Z",
    attribution: "European Union, Publications Office of the European Union, reused under the European Commission reuse policy.",
    nodes: [
      {
        code: "A",
        officialLabel: "Agriculture",
        level: "section",
        parentCode: null,
        hierarchyCodes: ["A"],
        hierarchyLabels: ["Agriculture"],
        definition: null,
        searchText: "a agriculture agriculture",
      },
    ],
  });
  const api = "sites/api.arolariu.ro/src/Invoices/Resources/Taxonomies";
  const web = "sites/arolariu.ro/src/data/taxonomies";
  return {
    [`${api}/gpc-2026-05.min.json`]: gpc,
    [`${web}/gpc-2026-05.min.json`]: gpc,
    [`${api}/ecoicop-v2.min.json`]: ecoicop,
    [`${web}/ecoicop-v2.min.json`]: ecoicop,
    [`${api}/nace-2.1.min.json`]: nace,
    [`${web}/nace-2.1.min.json`]: nace,
    "sites/arolariu.ro/licenses.json": '{"production":[],"development":[],"peer":[]}\n',
  };
})();

/** Workspace manifests the unified generation reads. */
const WORKSPACE_FILES: Readonly<Record<string, string>> = {
  "package.json": JSON.stringify({name: "@arolariu/monorepo"}),
  "sites/arolariu.ro/package.json": JSON.stringify({}),
};

/**
 * Reads the SPARQL query text of a request.
 *
 * @param request - The HTTP request.
 * @returns The `query` URL parameter, or `""`.
 */
function sparqlQuery(request: HttpClientRequest.HttpClientRequest): string {
  return new URL(request.url).searchParams.get("query") ?? "";
}

/**
 * Builds a SPARQL JSON response body.
 *
 * @param bindings - Raw SPARQL bindings.
 * @returns The response status and body.
 */
function sparql(bindings: readonly unknown[]): ScriptedHttp["respond"] {
  return {status: 200, body: JSON.stringify({results: {bindings}})};
}

/** Successful GPC, ECOICOP, and NACE responses. */
const UNIFIED_SOURCES: readonly ScriptedHttp[] = [
  {match: (request) => request.url === GPC_URL, respond: {status: 200, body: "zip-archive"}},
  {
    match: (request) => sparqlQuery(request).includes("ecoicop2"),
    respond: sparql([{concept: {value: "eco:01"}, notation: {value: "01"}, label: {value: "01 Food"}}]),
  },
  {
    match: (request) => sparqlQuery(request).includes("nace2.1"),
    respond: sparql([{concept: {value: "nace:A"}, notation: {value: "A"}, label: {value: "A Agriculture"}}]),
  },
];

/**
 * Answers every request with one unavailable status.
 *
 * @param status - Response status returned by every request.
 * @returns The HTTP scripts.
 */
function unavailableSources(status = 503): readonly ScriptedHttp[] {
  return [{match: () => true, respond: {status, body: "Unavailable"}}];
}

/** Mutable state shared between a test body and its scripted archive extractor. */
interface ExtractionState {
  /** GPC document written into the extraction directory. */
  document: unknown;
  /** Harness filesystem the extractor writes into; bound when the test body starts. */
  fs?: FileSystem.FileSystem;
}

/**
 * Scripts `tar`/`unzip`: writes the GPC entry and its delta sibling into the requested directory.
 *
 * @param state - The document to write and the bound harness filesystem.
 * @returns The scripted process.
 */
function archiveExtraction(state: ExtractionState): ScriptedProcess {
  return {
    match: (request) => request.command === "unzip" || request.command === "tar.exe",
    respond: (request) => {
      const flag = request.args.findIndex((value) => value === "-C" || value === "-d");
      const outputDirectory = request.args[flag + 1];
      const fs = state.fs;
      if (outputDirectory === undefined || fs === undefined) {
        return Effect.die(new Error("The archive extraction fixture is not bound."));
      }
      const contents = JSON.stringify(state.document);
      return Effect.orDie(
        Effect.andThen(
          fs.writeFileString(join(outputDirectory, GPC_ENTRY), contents),
          fs.writeFileString(join(outputDirectory, "Delta - GPC as of May 2026 (20260520 v 20251127) EN.json"), contents),
        ),
      ).pipe(Effect.as({stdout: "", stderr: "", durationMs: 0}));
    },
  };
}

/** Options of one artifact test fixture. */
interface FixtureOptions {
  /** Scripted HTTP responses. */
  readonly http?: readonly ScriptedHttp[];
  /** Seeded files. */
  readonly files?: Readonly<Record<string, string>>;
  /** Host platform the extractor targets; defaults to `linux`. */
  readonly platform?: NodeJS.Platform;
  /** Process failure the extractor responds with instead of extracting. */
  readonly extractionFailure?: ProcessError;
  /** GPC document the extractor writes. */
  readonly document?: unknown;
}

/** One harness plus the extraction state it scripts. */
interface ArtifactFixture {
  /** The in-memory platform. */
  readonly harness: TestHarness;
  /** Extraction state bound to the harness filesystem. */
  readonly extraction: ExtractionState;
}

/**
 * Registers one artifact test on a fresh fixture.
 *
 * @param name - The test name.
 * @param options - Fixture options.
 * @param body - The test body; the clock is set to {@link FIXED_NOW} and the extractor bound first.
 */
function artifactTest(
  name: string,
  options: FixtureOptions,
  body: (fixture: ArtifactFixture) => Effect.Effect<void, unknown, GenerateRequirements | TestClock.TestClock | Scope.Scope>,
): void {
  const extraction: ExtractionState = {document: options.document ?? GPC_DOCUMENT};
  const failure = options.extractionFailure;
  const harness = makeTestLayer({
    context: "test::artifacts",
    environment: {platform: options.platform ?? "linux"},
    files: options.files ?? {},
    http: options.http ?? [],
    processes: [
      failure === undefined
        ? archiveExtraction(extraction)
        : {match: (request) => request.command === "unzip" || request.command === "tar.exe", respond: failure},
    ],
  });
  const fixture = {harness, extraction};
  effectTest(
    name,
    () =>
      Effect.gen(function* () {
        extraction.fs = yield* FileSystem.FileSystem;
        yield* TestClock.setTime(FIXED_NOW);
        yield* body(fixture);
      }),
    harness.layer,
  );
}

/**
 * Runs an effect while advancing the test clock until it completes, so retry backoff elapses.
 *
 * @param effect - The effect to run.
 * @param step - Simulated time added per step.
 * @returns The effect, completed under an advancing test clock.
 */
function advancingClock<A, E, R>(
  effect: Effect.Effect<A, E, R>,
  step: Duration.Input = "500 millis",
): Effect.Effect<A, E, R | TestClock.TestClock> {
  return Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(effect);
    while (fiber.pollUnsafe() === undefined) {
      yield* TestClock.adjust(step);
      // Lets promise-based response body reads settle between clock steps.
      yield* Effect.promise(() => new Promise<void>((settle) => setTimeout(settle, 0)));
    }
    return yield* Fiber.join(fiber);
  });
}

/** One scripted outcome of a {@link routedClient} send. */
type RoutedOutcome = {readonly status: number; readonly body: string} | {readonly transport: string} | "hang";

/**
 * Builds an `HttpClient` whose answer depends on the 1-based send ordinal.
 *
 * @param route - Decides each send's outcome.
 * @returns The client and an accessor over the number of sends.
 */
function routedClient(route: (request: HttpClientRequest.HttpClientRequest, send: number) => RoutedOutcome): {
  readonly client: HttpClient.HttpClient;
  readonly sends: () => number;
} {
  let sends = 0;
  const client = HttpClient.make((request) => {
    sends += 1;
    const outcome = route(request, sends);
    if (outcome === "hang") {
      return Effect.never;
    }
    if ("transport" in outcome) {
      return Effect.fail(
        new HttpClientError.HttpClientError({reason: new HttpClientError.TransportError({request, description: outcome.transport})}),
      );
    }
    return Effect.succeed(HttpClientResponse.fromWeb(request, new Response(outcome.body, {status: outcome.status})));
  });
  return {client, sends: () => sends};
}

/**
 * Runs an effect with a replaced `HttpClient` under an advancing test clock.
 *
 * @param effect - The generator effect.
 * @param client - The replacement client.
 * @returns The effect result.
 */
function withClient<A, E, R>(
  effect: Effect.Effect<A, E, R>,
  client: HttpClient.HttpClient,
): Effect.Effect<A, E, Exclude<R, HttpClient.HttpClient> | TestClock.TestClock> {
  return advancingClock(Effect.provideService(effect, HttpClient.HttpClient, client));
}

/**
 * Returns the semantic `[arolariu::…]` lines without their trailing newline.
 *
 * @param harness - The harness that captured the run.
 * @param stream - Optional stream filter.
 * @returns The semantic line texts in order.
 */
function semanticLines(harness: TestHarness, stream?: "stdout" | "stderr"): readonly string[] {
  return harness
    .output()
    .filter((record) => record.text.startsWith("[arolariu::") && (stream === undefined || record.stream === stream))
    .map((record) => record.text.replace(/\n$/u, ""));
}

/**
 * Reads one harness file.
 *
 * @param path - Absolute or working-directory-relative path.
 * @returns The file text.
 */
function readText(path: string): Effect.Effect<string, PlatformError.PlatformError, FileSystem.FileSystem> {
  return Effect.flatMap(Effect.service(FileSystem.FileSystem), (fs) => fs.readFileString(path));
}

/**
 * Reads every generated artifact as text, keyed by its repository-relative POSIX path.
 *
 * @param paths - Absolute artifact paths reported by the generator.
 * @returns The artifact text keyed by repository-relative path, in reported order.
 */
function readArtifactBytes(
  paths: readonly string[],
): Effect.Effect<Record<string, string>, PlatformError.PlatformError, FileSystem.FileSystem> {
  return Effect.map(
    Effect.forEach(paths, (path) =>
      Effect.map(readText(path), (text) => [relative(repositoryFixtureRoot, path).replaceAll("\\", "/"), text] as const),
    ),
    (entries) => Object.fromEntries(entries),
  );
}

/**
 * Reads an array property from a generated JSON document.
 *
 * @param contents - Generated JSON text.
 * @param key - Array property name.
 * @returns The array value.
 */
function readObjectArray(contents: string, key: string): readonly unknown[] {
  const parsed: unknown = JSON.parse(contents);
  const value: unknown = typeof parsed === "object" && parsed !== null ? Reflect.get(parsed, key) : undefined;
  if (!Array.isArray(value)) {
    throw new TypeError(`Generated document '${key}' field must be an array.`);
  }
  return value;
}

/** Test probe exposing the protected mirrored writer. */
class TaxonomyGeneratorProbe extends TaxonomyClassificationGenerator {
  protected override readonly sourceName = "Probe";

  public constructor(outputRoots: readonly string[]) {
    super(outputRoots);
  }

  public override generate(): Effect.Effect<readonly string[], ArtifactGenerationError, GenerateRequirements> {
    return Effect.succeed([]);
  }

  public write(artifact: Readonly<TaxonomyArtifact>): Effect.Effect<readonly string[], ArtifactGenerationFailed, GenerateRequirements> {
    return this.writeArtifact("probe.json", artifact);
  }
}

/** One valid single-node NACE artifact. */
const PROBE_ARTIFACT: TaxonomyArtifact = {
  system: "NACE_2_1",
  version: "2.1",
  sourceUrl: "https://example.test",
  generatedAt: "2026-08-19T00:00:00.000Z",
  attribution: "Test",
  nodes: [
    {
      code: "A",
      officialLabel: "Root",
      level: "section",
      parentCode: null,
      hierarchyCodes: ["A"],
      hierarchyLabels: ["Root"],
      definition: null,
      searchText: "a root",
    },
  ],
};

describe("Gs1GpcTaxonomyClassificationGenerator", () => {
  artifactTest("generates the mirrored GPC artifact", {http: UNIFIED_SOURCES}, () =>
    Effect.gen(function* () {
      // Act
      const outputs = yield* new Gs1GpcTaxonomyClassificationGenerator(TEST_ROOTS).generate();

      // Assert
      expect(outputs).toEqual(TEST_ROOTS.map((root) => join(root, "gpc-2026-05.min.json")));
      expect(yield* readText(outputs[0] ?? "")).toBe(yield* readText(outputs[1] ?? ""));
    }),
  );

  artifactTest("retries a transient HTTP failure before generating", {}, ({harness}) =>
    Effect.gen(function* () {
      // Arrange
      const routed = routedClient((_request, send) =>
        send === 1 ? {status: 503, body: "Unavailable"} : {status: 200, body: "zip-archive"},
      );

      // Act
      const outputs = yield* withClient(new Gs1GpcTaxonomyClassificationGenerator(TEST_ROOTS).generate(), routed.client);

      // Assert
      expect(outputs).toHaveLength(2);
      expect(routed.sends()).toBe(2);
      expect(semanticLines(harness, "stderr")).toEqual([
        "[arolariu::test::artifacts] ⚠️ [GPC] GPC download failed with HTTP 503. Retrying in 1000ms (attempt 2/3).",
      ]);
    }),
  );

  artifactTest("sends exactly the legacy request headers without trace propagation", {http: UNIFIED_SOURCES}, ({harness}) =>
    Effect.gen(function* () {
      // Act
      yield* new Gs1GpcTaxonomyClassificationGenerator(TEST_ROOTS).generate();

      // Assert
      expect(harness.httpCalls().map((request) => ({method: request.method, url: request.url, headers: request.headers}))).toEqual([
        {method: "GET", url: GPC_URL, headers: {accept: "application/zip"}},
      ]);
    }),
  );

  artifactTest("bounds every attempt by the per-attempt timeout and keeps one retry budget", {}, ({harness}) =>
    Effect.gen(function* () {
      // Arrange
      const routed = routedClient(() => "hang");

      // Act
      const error = yield* Effect.flip(
        advancingClock(
          Effect.provideService(new Gs1GpcTaxonomyClassificationGenerator([]).generate(), HttpClient.HttpClient, routed.client),
          "5 seconds",
        ),
      );

      // Assert
      expect(error).toBeInstanceOf(TaxonomySourceUnavailable);
      expect(error.message).toBe(
        "GPC download timed out after 30000ms. Cached taxonomy artifact 'gpc-2026-05.min.json' has no configured output roots.",
      );
      expect(routed.sends()).toBe(3);
      expect(semanticLines(harness, "stderr").slice(0, 2)).toEqual([
        "[arolariu::test::artifacts] ⚠️ [GPC] GPC download timed out after 30000ms. Retrying in 1000ms (attempt 2/3).",
        "[arolariu::test::artifacts] ⚠️ [GPC] GPC download timed out after 30000ms. Retrying in 4000ms (attempt 3/3).",
      ]);
    }),
  );

  artifactTest("surfaces HTTP failures after the bounded attempts", {http: unavailableSources()}, ({harness}) =>
    Effect.gen(function* () {
      // Act
      const error = yield* Effect.flip(advancingClock(new Gs1GpcTaxonomyClassificationGenerator([]).generate()));

      // Assert
      expect(error).toMatchObject({_tag: "TaxonomySourceUnavailable", taxonomy: "GPC"});
      expect(error.message).toContain("GPC download failed with HTTP 503.");
      expect(harness.httpCalls()).toHaveLength(3);
    }),
  );

  artifactTest("shares one bounded attempt budget between transport and transient status failures", {}, ({harness}) =>
    Effect.gen(function* () {
      // Arrange
      const routed = routedClient((_request, send) => (send === 1 ? {transport: "connection reset"} : {status: 503, body: "Unavailable"}));

      // Act
      const error = yield* Effect.flip(withClient(new Gs1GpcTaxonomyClassificationGenerator([]).generate(), routed.client));

      // Assert
      expect(error.message).toContain("GPC download failed with HTTP 503.");
      expect(routed.sends()).toBe(3);
      expect(semanticLines(harness, "stderr").slice(0, 2)).toEqual([
        "[arolariu::test::artifacts] ⚠️ [GPC] connection reset Retrying in 1000ms (attempt 2/3).",
        "[arolariu::test::artifacts] ⚠️ [GPC] GPC download failed with HTTP 503. Retrying in 4000ms (attempt 3/3).",
      ]);
    }),
  );

  artifactTest("logs a generator error and fails with the final failure", {}, ({harness}) =>
    Effect.gen(function* () {
      // Arrange
      const routed = routedClient(() => ({transport: "GPC unavailable"}));

      // Act
      const error = yield* Effect.flip(withClient(new Gs1GpcTaxonomyClassificationGenerator(TEST_ROOTS).generate(), routed.client));

      // Assert
      expect(error).toBeInstanceOf(TaxonomySourceUnavailable);
      expect(error.message).toContain("GPC unavailable Cached taxonomy artifact 'gpc-2026-05.min.json' could not be read:");
      expect(routed.sends()).toBe(3);
      expect(semanticLines(harness, "stderr").at(-1)).toContain("[arolariu::test::artifacts] ⛔ [GPC] GPC unavailable");
    }),
  );

  artifactTest(
    "rejects a source document outside the pinned release month",
    {http: UNIFIED_SOURCES, document: {...GPC_DOCUMENT, DateUtc: "2025-04-01"}},
    () =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(new Gs1GpcTaxonomyClassificationGenerator(TEST_ROOTS).generate());

        // Assert
        expect(error).toEqual(
          new ArtifactGenerationFailed({message: "GPC source DateUtc must belong to the pinned 2026-05 release.", artifact: "GPC"}),
        );
      }),
  );

  artifactTest("extracts through unzip with captured output on Linux and macOS", {http: UNIFIED_SOURCES}, ({harness}) =>
    Effect.gen(function* () {
      // Act
      yield* new Gs1GpcTaxonomyClassificationGenerator(TEST_ROOTS).generate();

      // Assert
      const [call] = harness.processCalls();
      expect(harness.processCalls()).toHaveLength(1);
      expect(call?.request.command).toBe("unzip");
      expect(call?.request.args).toEqual([
        "-qq",
        expect.stringMatching(/arolariu-taxonomy-.*source\.zip$/u),
        "-d",
        expect.stringMatching(/extracted$/u),
      ]);
      expect(call?.options).toEqual({output: "capture"});
    }),
  );

  artifactTest("extracts through tar.exe on Windows", {http: UNIFIED_SOURCES, platform: "win32"}, ({harness}) =>
    Effect.gen(function* () {
      // Act
      yield* new Gs1GpcTaxonomyClassificationGenerator(TEST_ROOTS).generate();

      // Assert
      const [call] = harness.processCalls();
      expect(call?.request.command).toBe("tar.exe");
      expect(call?.request.args).toEqual(["-xf", expect.stringMatching(/source\.zip$/u), "-C", expect.stringMatching(/extracted$/u)]);
    }),
  );

  artifactTest(
    "removes its temporary extraction workspace even when extraction fails",
    {
      http: UNIFIED_SOURCES,
      extractionFailure: new ProcessExited({
        command: "unzip",
        stdout: "",
        stderr: "extraction failed",
        durationMs: 0,
        exitCode: 9,
        message: "unzip exited with code 9",
      }),
    },
    ({harness}) =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(new Gs1GpcTaxonomyClassificationGenerator(TEST_ROOTS).generate());

        // Assert
        expect(error).toEqual(new ArtifactGenerationFailed({message: "unzip exited with code 9", artifact: "GPC"}));
        const archivePath = harness.processCalls()[0]?.request.args[1] ?? "";
        expect(archivePath).toContain("arolariu-taxonomy-");
        expect([...harness.files().keys()].filter((path) => path.includes("arolariu-taxonomy-"))).toEqual([]);
      }),
  );

  artifactTest(
    "reports a missing archive extractor with the legacy message",
    {
      http: UNIFIED_SOURCES,
      extractionFailure: new ProcessSpawnFailed({
        command: "unzip",
        stdout: "",
        stderr: "",
        durationMs: 0,
        reason: "ENOENT",
        message: "unzip failed to start: spawn unzip ENOENT",
      }),
    },
    () =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(new Gs1GpcTaxonomyClassificationGenerator(TEST_ROOTS).generate());

        // Assert
        expect(error).toEqual(
          new ArtifactGenerationFailed({message: "Required archive extractor 'unzip' was not found on 'linux'.", artifact: "GPC"}),
        );
      }),
  );
});

describe("TaxonomyClassificationGenerator", () => {
  artifactTest("rejects hierarchy arrays that disagree with the parent chain", {}, () =>
    Effect.gen(function* () {
      // Arrange
      const generator = new TaxonomyGeneratorProbe(TEST_ROOTS);
      const [root] = PROBE_ARTIFACT.nodes;

      // Act
      const error = yield* Effect.flip(
        generator.write({
          ...PROBE_ARTIFACT,
          nodes: [
            ...(root === undefined ? [] : [root]),
            {
              code: "01",
              officialLabel: "Child",
              level: "division",
              parentCode: "A",
              hierarchyCodes: ["01"],
              hierarchyLabels: ["Child"],
              definition: null,
              searchText: "01 child",
            },
          ],
        }),
      );

      // Assert
      expect(error).toEqual(
        new ArtifactGenerationFailed({message: "NACE_2_1 hierarchy for '01' does not match its parent chain.", artifact: "Probe"}),
      );
    }),
  );

  artifactTest("preserves existing bytes when only the generation timestamp changes", {}, () =>
    Effect.gen(function* () {
      // Arrange
      const generator = new TaxonomyGeneratorProbe(TEST_ROOTS);
      const outputs = yield* generator.write(PROBE_ARTIFACT);
      const originalContents = yield* readText(outputs[0] ?? "");

      // Act
      yield* generator.write({...PROBE_ARTIFACT, generatedAt: "2026-08-26T00:00:00.000Z"});

      // Assert
      expect(yield* readText(outputs[0] ?? "")).toBe(originalContents);
      expect(yield* readText(outputs[1] ?? "")).toBe(originalContents);
    }),
  );

  artifactTest(
    "replaces diverged existing mirrors with the generated bytes",
    {files: {[join(TEST_ROOTS[0], "probe.json")]: "{}", [join(TEST_ROOTS[1], "probe.json")]: "[]"}},
    ({harness}) =>
      Effect.gen(function* () {
        // Act
        const outputs = yield* new TaxonomyGeneratorProbe(TEST_ROOTS).write(PROBE_ARTIFACT);

        // Assert
        expect(yield* readText(outputs[0] ?? "")).toBe(JSON.stringify(PROBE_ARTIFACT));
        expect(yield* readText(outputs[1] ?? "")).toBe(JSON.stringify(PROBE_ARTIFACT));
        expect(semanticLines(harness, "stderr")).toEqual([
          "[arolariu::test::artifacts] ⚠️ Existing mirrored artifact 'probe.json' diverged and will be replaced.",
        ]);
      }),
  );

  artifactTest(
    "replaces identical but invalid existing mirrors",
    {files: {[join(TEST_ROOTS[0], "probe.json")]: "{}", [join(TEST_ROOTS[1], "probe.json")]: "{}"}},
    ({harness}) =>
      Effect.gen(function* () {
        // Act
        const outputs = yield* new TaxonomyGeneratorProbe(TEST_ROOTS).write(PROBE_ARTIFACT);

        // Assert
        expect(yield* readText(outputs[0] ?? "")).toBe(JSON.stringify(PROBE_ARTIFACT));
        expect(semanticLines(harness, "stderr")).toEqual([
          "[arolariu::test::artifacts] ⚠️ Existing artifact 'probe.json' is invalid and will be replaced: Taxonomy artifact system must be a string.",
        ]);
      }),
  );
});

describe("EcoicopTaxonomyClassificationGenerator", () => {
  artifactTest(
    "generates a mirrored ECOICOP v2 hierarchy",
    {
      http: [
        {
          match: () => true,
          respond: sparql([
            {concept: {value: "eco:01"}, notation: {value: "01"}, label: {value: "01 Food"}},
            {concept: {value: "eco:011"}, notation: {value: "01.1"}, label: {value: "01.1 Food products"}, broader: {value: "eco:01"}},
          ]),
        },
      ],
    },
    () =>
      Effect.gen(function* () {
        // Act
        const outputs = yield* new EcoicopTaxonomyClassificationGenerator(TEST_ROOTS).generate();

        // Assert
        expect(outputs).toEqual(TEST_ROOTS.map((root) => join(root, "ecoicop-v2.min.json")));
        expect(readObjectArray(yield* readText(outputs[0] ?? ""), "nodes")[1]).toMatchObject({
          code: "01.1",
          hierarchyCodes: ["01", "01.1"],
        });
      }),
  );

  artifactTest(
    "continues pagination until a short page",
    {
      http: [
        {
          match: (request) => sparqlQuery(request).includes("OFFSET 0"),
          respond: sparql(
            Array.from({length: 5_000}, (_, index) => ({
              concept: {value: `eco:${index}`},
              notation: {value: String(index).padStart(4, "0")},
              label: {value: `Label ${index}`},
            })),
          ),
        },
        {match: () => true, respond: sparql([{concept: {value: "eco:final"}, notation: {value: "9999.1"}, label: {value: "Final"}}])},
      ],
    },
    ({harness}) =>
      Effect.gen(function* () {
        // Act
        yield* new EcoicopTaxonomyClassificationGenerator(TEST_ROOTS).generate();

        // Assert
        expect(harness.httpCalls().map((request) => sparqlQuery(request).trim().split("\n").at(-1))).toEqual(["OFFSET 0", "OFFSET 5000"]);
      }),
  );

  artifactTest(
    "rejects malformed optional bindings",
    {
      http: [
        {
          match: () => true,
          respond: sparql([{concept: {value: "eco:01"}, notation: {value: "01"}, label: {value: "Food"}, broader: {type: "uri"}}]),
        },
      ],
    },
    ({harness}) =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(new EcoicopTaxonomyClassificationGenerator([]).generate());

        // Assert
        expect(error).toEqual(
          new ArtifactGenerationFailed({message: "SPARQL binding 'broader'.value must be a non-empty string.", artifact: "ECOICOP"}),
        );
        expect(semanticLines(harness, "stderr")).toEqual([
          "[arolariu::test::artifacts] ⛔ [ECOICOP] SPARQL binding 'broader'.value must be a non-empty string.",
        ]);
      }),
  );

  artifactTest(
    "rejects divergent cached mirrors",
    {
      http: unavailableSources(),
      files: {
        [join(TEST_ROOTS[0], "ecoicop-v2.min.json")]: "{}",
        [join(TEST_ROOTS[1], "ecoicop-v2.min.json")]: "[]",
      },
    },
    () =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(advancingClock(new EcoicopTaxonomyClassificationGenerator(TEST_ROOTS).generate()));

        // Assert
        expect(error._tag).toBe("ArtifactGenerationFailed");
        expect(error.message).toContain("is not byte-identical across output roots");
      }),
  );

  artifactTest(
    "rejects an identical cached mirror whose identity does not match",
    {
      http: unavailableSources(),
      files: {
        [join(TEST_ROOTS[0], "ecoicop-v2.min.json")]: JSON.stringify(PROBE_ARTIFACT),
        [join(TEST_ROOTS[1], "ecoicop-v2.min.json")]: JSON.stringify(PROBE_ARTIFACT),
      },
    },
    () =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(advancingClock(new EcoicopTaxonomyClassificationGenerator(TEST_ROOTS).generate()));

        // Assert
        expect(error).toEqual(
          new ArtifactGenerationFailed({
            message:
              "SPARQL request failed with HTTP 503. Cached taxonomy artifact 'ecoicop-v2.min.json' is invalid: Cached taxonomy artifact 'ecoicop-v2.min.json' does not match ECOICOP_V2 2.",
            artifact: "ECOICOP",
          }),
        );
      }),
  );

  artifactTest(
    "does not use cached artifacts for non-transient HTTP failures",
    {
      http: unavailableSources(404),
      files: {
        [join(TEST_ROOTS[0], "ecoicop-v2.min.json")]:
          EXPECTED_ARTIFACT_BYTES["sites/api.arolariu.ro/src/Invoices/Resources/Taxonomies/ecoicop-v2.min.json"] ?? "",
        [join(TEST_ROOTS[1], "ecoicop-v2.min.json")]:
          EXPECTED_ARTIFACT_BYTES["sites/api.arolariu.ro/src/Invoices/Resources/Taxonomies/ecoicop-v2.min.json"] ?? "",
      },
    },
    ({harness}) =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(new EcoicopTaxonomyClassificationGenerator(TEST_ROOTS).generate());

        // Assert
        expect(error).toEqual(new ArtifactGenerationFailed({message: "SPARQL request failed with HTTP 404.", artifact: "ECOICOP"}));
        expect(harness.httpCalls()).toHaveLength(1);
      }),
  );

  const validNode = PROBE_ARTIFACT.nodes[0];
  const invalidCaches: readonly (readonly [string, unknown, string])[] = [
    ["an unsupported system", {...PROBE_ARTIFACT, system: "OTHER"}, "Taxonomy artifact system 'OTHER' is unsupported."],
    ["an invalid source URL", {...PROBE_ARTIFACT, sourceUrl: "not a url"}, "Invalid URL"],
    ["a non-date timestamp", {...PROBE_ARTIFACT, generatedAt: "yesterday"}, "Taxonomy artifact generatedAt must be an ISO date."],
    ["non-array nodes", {...PROBE_ARTIFACT, nodes: {}}, "Taxonomy artifact nodes must be an array."],
    [
      "a blank parent code",
      {...PROBE_ARTIFACT, nodes: [{...validNode, parentCode: " "}]},
      "parentCode must be a non-empty string or null.",
    ],
    ["a numeric definition", {...PROBE_ARTIFACT, nodes: [{...validNode, definition: 1}]}, "definition must be a string or null."],
    ["non-array hierarchy codes", {...PROBE_ARTIFACT, nodes: [{...validNode, hierarchyCodes: "A"}]}, "hierarchyCodes must be an array."],
    [
      "a blank hierarchy label",
      {...PROBE_ARTIFACT, nodes: [{...validNode, hierarchyLabels: [""]}]},
      "hierarchyLabels[0] must be a non-empty string.",
    ],
    ["an empty node list", {...PROBE_ARTIFACT, nodes: []}, "NACE_2_1 artifact contains no taxonomy nodes."],
  ];
  for (const [description, cached, expected] of invalidCaches) {
    artifactTest(
      `rejects a cached mirror with ${description}`,
      {
        http: unavailableSources(),
        files: {
          [join(TEST_ROOTS[0], "ecoicop-v2.min.json")]: JSON.stringify(cached),
          [join(TEST_ROOTS[1], "ecoicop-v2.min.json")]: JSON.stringify(cached),
        },
      },
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(advancingClock(new EcoicopTaxonomyClassificationGenerator(TEST_ROOTS).generate()));

          // Assert
          expect(error._tag).toBe("ArtifactGenerationFailed");
          expect(error.message).toContain("Cached taxonomy artifact 'ecoicop-v2.min.json' is invalid:");
          expect(error.message).toContain(expected);
        }),
    );
  }
});

describe("Gs1GpcTaxonomyClassificationGenerator source validation", () => {
  artifactTest(
    "accepts a day/month/year release date and skips inactive and unsupported-level nodes",
    {
      http: UNIFIED_SOURCES,
      document: {
        LanguageCode: "EN",
        DateUtc: "20/5/2026",
        Schema: [
          {
            Level: 1,
            Code: 1,
            Title: "Root",
            Definition: "  ",
            Active: true,
            Childs: [
              {Level: 2, Code: 2, Title: "Inactive", Active: false, Childs: []},
              {Level: 9, Code: 3, Title: "Grouping", Active: true, Childs: [{Level: 4, Code: 4, Title: "Brick", Active: true, Childs: []}]},
            ],
          },
        ],
      },
    },
    () =>
      Effect.gen(function* () {
        // Act
        const outputs = yield* new Gs1GpcTaxonomyClassificationGenerator(TEST_ROOTS).generate();

        // Assert
        expect(readObjectArray(yield* readText(outputs[0] ?? ""), "nodes")).toMatchObject([
          {code: "1", level: "segment", definition: null},
          {code: "4", level: "brick", parentCode: "1", hierarchyCodes: ["1", "4"]},
        ]);
      }),
  );

  const invalidDocuments: readonly (readonly [string, unknown, string])[] = [
    ["a non-English document", {...GPC_DOCUMENT, LanguageCode: "RO"}, "Expected English GPC data but received 'RO'."],
    ["a non-array schema", {...GPC_DOCUMENT, Schema: {}}, "GPC document Schema must be an array."],
    [
      "a node without children",
      {...GPC_DOCUMENT, Schema: [{Level: 1, Code: 1, Title: "Root", Active: true}]},
      "GPC node Childs must be an array.",
    ],
    [
      "a non-boolean active flag",
      {...GPC_DOCUMENT, Schema: [{Level: 1, Code: 1, Title: "Root", Active: "yes", Childs: []}]},
      "GPC node Active must be a boolean.",
    ],
    [
      "a non-numeric code",
      {...GPC_DOCUMENT, Schema: [{Level: 1, Code: "1", Title: "Root", Active: true, Childs: []}]},
      "GPC node Code must be a number.",
    ],
    [
      "a blank title",
      {...GPC_DOCUMENT, Schema: [{Level: 1, Code: 1, Title: " ", Active: true, Childs: []}]},
      "GPC node Title must be a non-empty string.",
    ],
    [
      "a numeric definition",
      {...GPC_DOCUMENT, Schema: [{Level: 1, Code: 1, Title: "Root", Definition: 1, Active: true, Childs: []}]},
      "GPC node Definition must be a string or null.",
    ],
    ["a non-record document", [], "GPC document must be an object."],
  ];
  for (const [description, document, expected] of invalidDocuments) {
    artifactTest(`rejects ${description}`, {http: UNIFIED_SOURCES, document}, () =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(new Gs1GpcTaxonomyClassificationGenerator(TEST_ROOTS).generate());

        // Assert
        expect(error).toEqual(new ArtifactGenerationFailed({message: expected, artifact: "GPC"}));
      }),
    );
  }
});

describe("NaceTaxonomyClassificationGenerator", () => {
  artifactTest(
    "generates NACE 2.1 levels and hierarchy",
    {
      http: [
        {
          match: () => true,
          respond: sparql([
            {concept: {value: "nace:A"}, notation: {value: "A"}, label: {value: "A Agriculture"}},
            {concept: {value: "nace:01"}, notation: {value: "01"}, label: {value: "01 Crop production"}, broader: {value: "nace:A"}},
            {concept: {value: "nace:011"}, notation: {value: "01.1"}, label: {value: "01.1 Crops"}, broader: {value: "nace:01"}},
            {concept: {value: "nace:0111"}, notation: {value: "01.11"}, label: {value: "01.11 Cereals"}, broader: {value: "nace:011"}},
            {concept: {value: "nace:x"}, notation: {value: "01.11.1"}, label: {value: "Other"}, broader: {value: "nace:0111"}},
          ]),
        },
      ],
    },
    () =>
      Effect.gen(function* () {
        // Act
        const outputs = yield* new NaceTaxonomyClassificationGenerator(TEST_ROOTS).generate();

        // Assert
        expect(outputs).toEqual(TEST_ROOTS.map((root) => join(root, "nace-2.1.min.json")));
        expect(readObjectArray(yield* readText(outputs[0] ?? ""), "nodes")).toMatchObject([
          {code: "01", level: "division", hierarchyCodes: ["A", "01"]},
          {code: "01.1", level: "group"},
          {code: "01.11", level: "class"},
          {code: "01.11.1", level: "code"},
          {code: "A", level: "section", hierarchyCodes: ["A"]},
        ]);
      }),
  );

  artifactTest(
    "rejects an unresolved broader concept",
    {
      http: [
        {
          match: () => true,
          respond: sparql([
            {concept: {value: "nace:01"}, notation: {value: "01"}, label: {value: "Crops"}, broader: {value: "nace:missing"}},
          ]),
        },
      ],
    },
    () =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(new NaceTaxonomyClassificationGenerator(TEST_ROOTS).generate());

        // Assert
        expect(error).toEqual(
          new ArtifactGenerationFailed({message: "Unresolved parent 'nace:missing' for taxonomy code '01'.", artifact: "NACE"}),
        );
      }),
  );
});

describe("FrontendLicenseGenerator", () => {
  const workspace = join(repositoryFixtureRoot, "license-workspace");
  const manifest = (relativePath: string, value: unknown): Record<string, string> => ({
    [join(workspace, relativePath)]: JSON.stringify(value),
  });
  const licensesPath = join(workspace, "sites", "arolariu.ro", "licenses.json");

  artifactTest(
    "groups direct frontend dependencies",
    {
      files: {
        ...manifest("sites/arolariu.ro/package.json", {
          dependencies: {"production-package": "1.0.0"},
          devDependencies: {"development-package": "2.0.0"},
          peerDependencies: {"peer-package": "3.0.0"},
        }),
        ...manifest("node_modules/production-package/package.json", {name: "production-package", version: "1.0.0", license: "MIT"}),
        ...manifest("node_modules/development-package/package.json", {
          name: "development-package",
          version: "2.0.0",
          license: "Apache-2.0",
        }),
        ...manifest("sites/arolariu.ro/node_modules/peer-package/package.json", {
          name: "peer-package",
          version: "3.0.0",
          license: "BSD-3-Clause",
        }),
      },
    },
    () =>
      Effect.gen(function* () {
        // Act
        const outputs = yield* new FrontendLicenseGenerator(workspace).generate();

        // Assert
        expect(outputs).toEqual([licensesPath]);
        const contents = yield* readText(licensesPath);
        expect(readObjectArray(contents, "production")).toMatchObject([{name: "production-package"}]);
        expect(readObjectArray(contents, "development")).toMatchObject([{name: "development-package"}]);
        expect(readObjectArray(contents, "peer")).toMatchObject([{name: "peer-package"}]);
      }),
  );

  artifactTest(
    "sorts scoped packages and applies defaults",
    {
      files: {
        ...manifest("sites/arolariu.ro/package.json", {dependencies: {"zeta-package": "1.0.0", "@scope/alpha-package": "2.0.0"}}),
        ...manifest("node_modules/zeta-package/package.json", {name: "zeta-package", repository: {url: "https://example.test/zeta"}}),
        ...manifest("node_modules/@scope/alpha-package/package.json", {name: "@scope/alpha-package", author: {name: "Alpha Author"}}),
      },
    },
    () =>
      Effect.gen(function* () {
        // Act
        yield* new FrontendLicenseGenerator(workspace).generate();

        // Assert
        expect(readObjectArray(yield* readText(licensesPath), "production")).toEqual([
          expect.objectContaining({
            name: "@scope/alpha-package",
            author: "Alpha Author",
            description: "This package has not provided a valid description.",
            homepage: "unknown",
            license: "unknown",
            version: "unknown",
          }),
          expect.objectContaining({name: "zeta-package", homepage: "https://example.test/zeta"}),
        ]);
      }),
  );

  artifactTest(
    "names malformed installed manifests",
    {
      files: {
        ...manifest("sites/arolariu.ro/package.json", {dependencies: {"broken-package": "1.0.0"}}),
        ...manifest("node_modules/broken-package/package.json", {name: "broken-package", description: 42}),
      },
    },
    ({harness}) =>
      Effect.gen(function* () {
        // Arrange
        const manifestPath = join(workspace, "node_modules", "broken-package", "package.json");

        // Act
        const error = yield* Effect.flip(new FrontendLicenseGenerator(workspace).generate());

        // Assert
        expect(error).toEqual(
          new ArtifactGenerationFailed({
            message: `Package manifest '${manifestPath}' field 'description' must be a string.`,
            artifact: "Frontend licenses",
          }),
        );
        expect(semanticLines(harness, "stderr")).toEqual([
          `[arolariu::test::artifacts] ⛔ [Frontend licenses] Package manifest '${manifestPath}' field 'description' must be a string.`,
        ]);
      }),
  );

  artifactTest(
    "rejects malformed author and repository fields",
    {
      files: {
        ...manifest("sites/arolariu.ro/package.json", {dependencies: {"author-package": "1.0.0"}}),
        ...manifest("node_modules/author-package/package.json", {name: "author-package", author: 7}),
      },
    },
    () =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(new FrontendLicenseGenerator(workspace).generate());

        // Assert
        expect(error.message).toBe(
          `Package manifest '${join(workspace, "node_modules", "author-package", "package.json")}' field 'author' must be a string or named object.`,
        );
      }),
  );

  artifactTest(
    "fails when a declared frontend dependency cannot be resolved",
    {files: manifest("sites/arolariu.ro/package.json", {dependencies: {"missing-package": "1.0.0"}})},
    () =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(new FrontendLicenseGenerator(workspace).generate());

        // Assert
        expect(error).toEqual(
          new ArtifactGenerationFailed({
            message: "Unable to resolve declared frontend package manifest(s): missing-package.",
            artifact: "Frontend licenses",
          }),
        );
      }),
  );

  artifactTest("fails when the frontend manifest cannot be read", {}, () =>
    Effect.gen(function* () {
      // Act
      const error = yield* Effect.flip(new FrontendLicenseGenerator(workspace).generate());

      // Assert
      expect(error).toBeInstanceOf(ArtifactGenerationFailed);
      expect(error.artifact).toBe("Frontend licenses");
    }),
  );

  artifactTest(
    "writes fixed dependency-group order and a platform-independent newline",
    {
      files: {
        ...manifest("sites/arolariu.ro/package.json", {
          dependencies: {"z-production": "1.0.0"},
          devDependencies: {"m-development": "1.0.0"},
          peerDependencies: {"a-peer": "1.0.0"},
        }),
        ...manifest("node_modules/z-production/package.json", {name: "z-production", version: "1.0.0"}),
        ...manifest("node_modules/m-development/package.json", {name: "m-development", version: "1.0.0"}),
        ...manifest("node_modules/a-peer/package.json", {name: "a-peer", version: "1.0.0"}),
      },
    },
    () =>
      Effect.gen(function* () {
        // Act
        yield* new FrontendLicenseGenerator(workspace).generate();

        // Assert
        const contents = yield* readText(licensesPath);
        expect(contents.startsWith('{"production":')).toBe(true);
        expect(contents.indexOf('"development"')).toBeGreaterThan(contents.indexOf('"production"'));
        expect(contents.indexOf('"peer"')).toBeGreaterThan(contents.indexOf('"development"'));
        expect(contents.endsWith("\n")).toBe(true);
        expect(contents.endsWith("\r\n")).toBe(false);
      }),
  );

  artifactTest(
    "deduplicates dependent package names using the last declared version",
    {
      files: {
        ...manifest("sites/arolariu.ro/package.json", {dependencies: {"package-with-overlap": "1.0.0"}}),
        ...manifest("node_modules/package-with-overlap/package.json", {
          name: "package-with-overlap",
          version: "1.0.0",
          dependencies: {shared: "^1.0.0"},
          devDependencies: {shared: "^2.0.0"},
          peerDependencies: {shared: "^3.0.0"},
        }),
      },
    },
    () =>
      Effect.gen(function* () {
        // Act
        yield* new FrontendLicenseGenerator(workspace).generate();

        // Assert
        expect(readObjectArray(yield* readText(licensesPath), "production")[0]).toMatchObject({
          dependents: [{name: "shared", version: "^3.0.0"}],
        });
      }),
  );
});

describe("BackendLicenseGenerator", () => {
  artifactTest("returns no outputs and reports the deferral", {}, ({harness}) =>
    Effect.gen(function* () {
      // Act
      const outputs = yield* new BackendLicenseGenerator().generate();

      // Assert
      expect(outputs).toEqual([]);
      expect(semanticLines(harness, "stderr")).toEqual([
        "[arolariu::test::artifacts] ⚠️ [Backend licenses] Generation is intentionally deferred; no artifact was written.",
      ]);
    }),
  );
});

describe("generateArtifacts", () => {
  effectTest(
    "exports the generators, the effect, and the canonical taxonomy artifact manifest",
    () =>
      Effect.gen(function* () {
        // Act
        const artifactModule = yield* Effect.promise(() => import("./artifacts.ts"));

        // Assert
        expect(Object.keys(artifactModule).toSorted()).toEqual([
          "BackendLicenseGenerator",
          "EcoicopTaxonomyClassificationGenerator",
          "FrontendLicenseGenerator",
          "Gs1GpcTaxonomyClassificationGenerator",
          "LicenseGenerator",
          "NaceTaxonomyClassificationGenerator",
          "TaxonomyClassificationGenerator",
          "generateArtifacts",
          "getExpectedTaxonomyArtifactPaths",
          "taxonomyArtifactFileNames",
        ]);
      }),
    makeTestLayer().layer,
  );

  artifactTest(
    "routes every message through the platform output without writing to the console",
    {http: UNIFIED_SOURCES, files: WORKSPACE_FILES},
    ({harness}) =>
      Effect.gen(function* () {
        // Arrange
        const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
          vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
        );

        // Act
        const result = yield* generateArtifacts({verbose: false});

        // Assert
        expect(result.summary).toBe("Generated 7 artifact file(s).");
        expect(result.generatedFiles).toHaveLength(7);
        expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
        vi.restoreAllMocks();
        const lines = semanticLines(harness);
        expect(lines.every((line) => line.startsWith("[arolariu::test::artifacts]"))).toBe(true);
        expect(lines).toEqual(
          expect.arrayContaining([
            "[arolariu::test::artifacts] ℹ️ Starting 5 artifact generator(s).",
            "[arolariu::test::artifacts] ℹ️ [GPC] Fetching the GS1 GPC source.",
            "[arolariu::test::artifacts] ℹ️ [ECOICOP] Fetching Publications Office taxonomy data.",
            "[arolariu::test::artifacts] ℹ️ [NACE] Fetching Publications Office taxonomy data.",
            "[arolariu::test::artifacts] ℹ️ [Frontend licenses] Reading the frontend dependency manifest.",
            "[arolariu::test::artifacts] ⚠️ [Backend licenses] Generation is intentionally deferred; no artifact was written.",
            "[arolariu::test::artifacts] ✅ [GPC] Generated 2 artifact file(s).",
            "[arolariu::test::artifacts] ✅ [Frontend licenses] Generated 1 artifact file(s).",
          ]),
        );
        expect(lines.at(-1)).toBe("[arolariu::test::artifacts] ✅ Generated 7 artifact file(s).");
      }),
  );

  {
    let offline = false;
    artifactTest(
      "characterizes the written artifact bytes online and preserves them offline when a validated cache exists",
      {http: [{match: () => offline, respond: {status: 503, body: "Unavailable"}}, ...UNIFIED_SOURCES], files: WORKSPACE_FILES},
      ({harness}) =>
        Effect.gen(function* () {
          // Act — online
          const online = yield* generateArtifacts({verbose: false});
          const onlineBytes = yield* readArtifactBytes(online.generatedFiles);
          const sendsBeforeOutage = harness.httpCalls().length;

          // Act — offline with the validated cache written by the online run
          offline = true;
          const offlineResult = yield* advancingClock(generateArtifacts({verbose: false}));
          const offlineBytes = yield* readArtifactBytes(offlineResult.generatedFiles);

          // Assert
          expect(online.summary).toBe("Generated 7 artifact file(s).");
          expect(onlineBytes).toEqual(EXPECTED_ARTIFACT_BYTES);
          expect(Object.keys(onlineBytes)).toEqual(Object.keys(EXPECTED_ARTIFACT_BYTES));
          expect(offlineResult.summary).toBe("Generated 7 artifact file(s).");
          expect(offlineBytes).toEqual(EXPECTED_ARTIFACT_BYTES);
          expect(harness.httpCalls().length - sendsBeforeOutage).toBe(9);
        }),
    );
  }

  artifactTest(
    "reuses cached taxonomy when the source is unavailable",
    {
      http: unavailableSources(),
      files: {
        ...WORKSPACE_FILES,
        ...Object.fromEntries(
          Object.entries(EXPECTED_ARTIFACT_BYTES)
            .filter(([path]) => !path.endsWith("licenses.json"))
            .map(([path, contents]) => [join(repositoryFixtureRoot, path), contents]),
        ),
      },
    },
    ({harness}) =>
      Effect.gen(function* () {
        // Act
        const result = yield* advancingClock(generateArtifacts({verbose: true}));

        // Assert
        expect(result.generatedFiles.slice(0, 6)).toEqual(getExpectedTaxonomyArtifactPaths(repositoryFixtureRoot));
        expect(yield* readArtifactBytes(result.generatedFiles)).toEqual(EXPECTED_ARTIFACT_BYTES);
        expect(harness.httpCalls()).toHaveLength(9);
        expect(semanticLines(harness, "stderr")).toEqual(
          expect.arrayContaining([
            "[arolariu::test::artifacts] ⚠️ [GPC] Source unavailable after retries; using validated cached artifact 'gpc-2026-05.min.json'.",
            "[arolariu::test::artifacts] ⚠️ [ECOICOP] Source unavailable after retries; using validated cached artifact 'ecoicop-v2.min.json'.",
            "[arolariu::test::artifacts] ⚠️ [NACE] Source unavailable after retries; using validated cached artifact 'nace-2.1.min.json'.",
          ]),
        );
      }),
  );

  artifactTest("fails when the source and cache are both unavailable", {http: unavailableSources(), files: WORKSPACE_FILES}, () =>
    Effect.gen(function* () {
      // Act
      const error = yield* Effect.flip(advancingClock(generateArtifacts({verbose: false})));

      // Assert
      expect(error._tag).toBe("TaxonomySourceUnavailable");
      const fs = yield* FileSystem.FileSystem;
      const taxonomyWritten = yield* Effect.forEach(getExpectedTaxonomyArtifactPaths(repositoryFixtureRoot), (path) => fs.exists(path));
      expect(taxonomyWritten).toEqual([false, false, false, false, false, false]);
    }),
  );

  artifactTest("writes every taxonomy to the canonical manifest paths", {http: UNIFIED_SOURCES}, () =>
    Effect.gen(function* () {
      // Act
      const outputs = yield* Effect.all(
        [
          new Gs1GpcTaxonomyClassificationGenerator().generate(),
          new EcoicopTaxonomyClassificationGenerator().generate(),
          new NaceTaxonomyClassificationGenerator().generate(),
        ],
        {concurrency: "unbounded"},
      );

      // Assert
      expect(taxonomyArtifactFileNames).toEqual({gpc: "gpc-2026-05.min.json", ecoicop: "ecoicop-v2.min.json", nace: "nace-2.1.min.json"});
      expect(outputs.flat()).toEqual(getExpectedTaxonomyArtifactPaths(repositoryFixtureRoot));
    }),
  );
});
