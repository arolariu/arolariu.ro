/**
 * @fileoverview Test support shared by the selfhost program and `dev selfhost` CLI tests.
 * @module scripts/container-runtime/selfhost.testing
 *
 * @remarks
 * Builds one `makeTestLayer` harness for a selfhost run and records every side effect of that run,
 * in order, on one timeline: each process call (the SQL password replaced by `<sql-password>` in its
 * arguments and environment), the Traefik and certificate filesystem mutations, each Cosmos
 * request, each blob step, and each completed `Effect.sleep` (as `{delay: <ms>}`). The taxonomy
 * artifact generation runs for real over
 * scripted GS1/ECOICOP/NACE responses and a scripted `unzip`; its HTTP requests stay on the harness
 * client (`harness.httpCalls()`), while Cosmos requests are answered by the fixture. The Azure Blob SDK
 * is replaced by a recording `LocalBlobStorage` layer. Nothing reaches a real external boundary.
 */

import {dirname, join} from "node:path";

import {Clock, Duration, Effect, Exit, Fiber, FileSystem, Layer, Redacted} from "effect";
import {HttpClient, HttpClientResponse, type HttpClientError, type HttpClientRequest} from "effect/http";
import {TestClock} from "effect/testing";

import {makeRootCommand, runCli} from "../cli.ts";
import {makeDevCommand} from "../commands/dev/cli.ts";
import type {ProbeOutcome} from "../inspection/probes.ts";
import type {ProcessOptions} from "../platform/Process.ts";
import {makeTestLayer, processOutcomeEffect, runScoped, type ScriptedHttp, type TestHarness} from "../platform/testing.ts";
import {LocalBlobStorage, localCosmosEndpoint} from "./selfhost.bootstrap.ts";
import {selfhostTraefikConfigPath} from "./traefik.ts";
import {ContainerRuntimeError} from "./types.ts";

/** SQL password every selfhost fixture configures unless a test overrides the environment. */
export const SELFHOST_SQL_PASSWORD = "local-strong-password";

/** One ordered side effect observed while a selfhost run executed. */
export type TimelineEvent = Readonly<Record<string, unknown>>;

/** Workspace manifests the engine selection and the artifact generation read. */
const WORKSPACE_FILES: Readonly<Record<string, string>> = {
  "package.json": JSON.stringify({name: "@arolariu/monorepo"}),
  "sites/arolariu.ro/package.json": JSON.stringify({}),
};

/** Localhost certificates that make the start action skip `mkcert`. */
export const SELFHOST_CERTIFICATES: Readonly<Record<string, string>> = {
  "infra/Local/Management/certs/local-cert.pem": "local-cert",
  "infra/Local/Management/certs/local-key.pem": "local-key",
};

/** Pinned GS1 archive URL. */
const GPC_URL = "https://ref.gs1.org/standards/gpc/2026-05/";

/** Exact archive entry the GPC generator extracts. */
const GPC_ENTRY = "GPC as of May 2026 (2026-05-20) EN.json";

/** Valid English GPC source document. */
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
      Childs: [{Level: 4, Code: 10000266, Title: "Bread", Definition: null, DefinitionExcludes: null, Active: true, Childs: []}],
    },
  ],
} as const;

/**
 * Builds a SPARQL JSON response body.
 *
 * @param bindings - Raw SPARQL bindings.
 * @returns The response status and body.
 */
function sparql(bindings: readonly unknown[]): ScriptedHttp["respond"] {
  return {status: 200, body: JSON.stringify({results: {bindings}})};
}

/**
 * Reads the SPARQL query text of a request.
 *
 * @param request - The HTTP request.
 * @returns The `query` URL parameter, or `""`.
 */
function sparqlQuery(request: HttpClientRequest.HttpClientRequest): string {
  return new URL(request.url).searchParams.get("query") ?? "";
}

/** Successful GPC, ECOICOP, and NACE responses. */
const TAXONOMY_SOURCES: readonly ScriptedHttp[] = [
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

/** A Cosmos emulator answer, or `"never"` for a request that never completes. */
export type CosmosAnswer = {readonly status: number; readonly body: string} | "never";

/** A process answer, or `"never"` for a process that never exits. */
export type ProcessAnswer = ProbeOutcome | "never";

/** Failure a recording blob step fails with. */
export interface BlobFailure {
  /** The failing operation. */
  readonly operation: "ensureContainer" | "applyCorsPolicy";
  /** The failure. */
  readonly error: ContainerRuntimeError;
}

/** Configures {@link selfhostFixture}. */
export interface SelfhostFixtureOptions {
  /** Environment variables; defaults to `{MSSQL_SA_PASSWORD: SELFHOST_SQL_PASSWORD}`. */
  readonly variables?: Readonly<Record<string, string>>;
  /** Seeded files merged over the workspace manifests; defaults to {@link SELFHOST_CERTIFICATES}. */
  readonly files?: Readonly<Record<string, string>>;
  /** Answers every non-`unzip` process request; defaults to success with empty output. */
  readonly process?: (command: string, args: readonly string[]) => ProcessAnswer;
  /** Answers every Cosmos request by path; defaults to `201 {}`. */
  readonly cosmos?: (path: string) => CosmosAnswer;
  /** Makes one blob step fail. */
  readonly blobFailure?: BlobFailure;
  /** Whether the taxonomy sources answer (default) or every one answers `503`. */
  readonly taxonomy?: "available" | "unavailable";
}

/** One selfhost harness and the recorders around it. */
export interface SelfhostFixture {
  /** The underlying harness. */
  readonly harness: TestHarness;
  /** Every recorded side effect, in order. */
  readonly timeline: () => readonly TimelineEvent[];
  /** Every Cosmos request path, in order. */
  readonly cosmosCalls: () => readonly string[];
  /** The recording blob storage layer. */
  readonly blobStorage: Layer.Layer<LocalBlobStorage>;
  /**
   * Provides the recording overrides (Cosmos HTTP, filesystem, blob storage, sleeps) and binds the
   * scripted `unzip` to the harness filesystem.
   */
  readonly instrument: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
  ) => Effect.Effect<
    A,
    E,
    Exclude<R, LocalBlobStorage | FileSystem.FileSystem | HttpClient.HttpClient> | FileSystem.FileSystem | HttpClient.HttpClient
  >;
  /** Runs `node scripts/cli.ts <argv>` through the `dev` command under an advancing test clock. */
  readonly runCli: (argv: readonly string[]) => Promise<Exit.Exit<void, unknown>>;
  /** The generated Traefik file content, or `null` when it does not exist. */
  readonly traefik: () => string | null;
}

/**
 * Replaces the generated Traefik paths with portable placeholders and normalizes separators.
 *
 * @param path - A filesystem path.
 * @returns `<traefik-config>`, `<traefik-tmp>`, `<traefik-dir>`, or the `/`-normalized path.
 */
function portableSelfhostPath(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  const config = selfhostTraefikConfigPath.replaceAll("\\", "/");
  const directory = dirname(selfhostTraefikConfigPath).replaceAll("\\", "/");
  if (normalized === config) {
    return "<traefik-config>";
  }
  if (normalized === directory) {
    return "<traefik-dir>";
  }
  if (normalized.startsWith(`${directory}/.selfhost-services.yml.`) && normalized.endsWith(".tmp")) {
    return "<traefik-tmp>";
  }
  return normalized;
}

/**
 * Decides whether a filesystem mutation belongs on the selfhost timeline.
 *
 * @param path - The portable path.
 * @returns `true` for the Traefik config and the localhost certificate directory.
 */
function isSelfhostPath(path: string): boolean {
  return path.startsWith("<traefik") || path.endsWith("infra/Local/Management/certs");
}

/**
 * Wraps a clock so every completed sleep is appended to the timeline.
 *
 * @param inner - The clock that actually sleeps (the harness test clock).
 * @param record - Appends one event.
 * @returns The recording clock.
 */
function recordingClock(inner: Clock.Clock, record: (event: TimelineEvent) => void): Clock.Clock {
  return {
    currentTimeMillisUnsafe: () => inner.currentTimeMillisUnsafe(),
    currentTimeMillis: inner.currentTimeMillis,
    currentTimeNanosUnsafe: () => inner.currentTimeNanosUnsafe(),
    currentTimeNanos: inner.currentTimeNanos,
    monotonicTimeNanosUnsafe: () => inner.monotonicTimeNanosUnsafe(),
    monotonicTimeNanos: inner.monotonicTimeNanos,
    sleep: (duration) => Effect.tap(inner.sleep(duration), () => Effect.sync(() => record({delay: Duration.toMillis(duration)}))),
  };
}

/**
 * Reads the text of a request body.
 *
 * @param request - The HTTP request.
 * @returns The body text and content type.
 */
function requestBody(request: HttpClientRequest.HttpClientRequest): {
  readonly text: string | undefined;
  readonly contentType: string | undefined;
} {
  const body = request.body;
  if (body._tag === "Uint8Array") {
    return {text: body.text ?? new TextDecoder().decode(body.body), contentType: body.contentType};
  }
  return {text: undefined, contentType: undefined};
}

/**
 * Runs an effect while advancing the test clock until it completes, so every sleep elapses.
 *
 * @param effect - The effect to run.
 * @returns The effect, completed under an advancing test clock.
 */
export function advancingClock<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R | TestClock.TestClock> {
  return Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(effect);
    while (fiber.pollUnsafe() === undefined) {
      yield* TestClock.adjust(Duration.millis(500));
      // Lets promise-based response body reads settle between clock steps.
      yield* TestClock.withLive(Effect.sleep(Duration.millis(1)));
    }
    return yield* Fiber.join(fiber);
  });
}

/**
 * Builds a recording harness for one selfhost run.
 *
 * @param options - Environment, seeded files, and process, Cosmos, and blob behavior.
 * @returns The harness and its recorders.
 */
export function selfhostFixture(options: SelfhostFixtureOptions = {}): SelfhostFixture {
  const timeline: TimelineEvent[] = [];
  const cosmosCalls: string[] = [];
  const record = (event: TimelineEvent): void => {
    timeline.push(event);
  };
  const variables = options.variables ?? {MSSQL_SA_PASSWORD: SELFHOST_SQL_PASSWORD};
  const secret = variables["MSSQL_SA_PASSWORD"];
  const projectArg = (arg: string): string =>
    secret === undefined || secret.trim() === "" ? arg : arg.replaceAll(secret, "<sql-password>");
  const projectOptions = (runOptions: ProcessOptions | undefined): ProcessOptions | undefined =>
    runOptions?.env === undefined
      ? runOptions
      : {
          ...runOptions,
          env: Object.fromEntries(
            Object.entries(runOptions.env).map(([key, value]) => [key, value === undefined ? value : projectArg(value)]),
          ),
        };
  let boundFileSystem: FileSystem.FileSystem | undefined;

  const harness = makeTestLayer({
    context: "selfhost",
    environment: {platform: "linux", variables},
    files: {...WORKSPACE_FILES, ...(options.files ?? SELFHOST_CERTIFICATES)},
    http: options.taxonomy === "unavailable" ? [{match: () => true, respond: {status: 503, body: "Unavailable"}}] : TAXONOMY_SOURCES,
    processes: [
      {
        match: (request) => request.command === "unzip",
        respond: (request, runOptions) => {
          record({process: "unzip", args: ["-qq", "<archive>", "-d", "<directory>"], options: runOptions});
          const outputDirectory = request.args[request.args.indexOf("-d") + 1];
          const fs = boundFileSystem;
          if (outputDirectory === undefined || fs === undefined) {
            return Effect.die(new Error("The archive extraction fixture is not bound."));
          }
          return Effect.orDie(fs.writeFileString(join(outputDirectory, GPC_ENTRY), JSON.stringify(GPC_DOCUMENT))).pipe(
            Effect.as({stdout: "", stderr: "", durationMs: 0}),
          );
        },
      },
      {
        match: () => true,
        respond: (request, runOptions) => {
          record({process: request.command, args: request.args.map(projectArg), options: projectOptions(runOptions)});
          const answer = options.process?.(request.command, request.args) ?? {
            kind: "succeeded",
            exitCode: 0,
            stdout: "",
            stderr: "",
            durationMs: 0,
          };
          return answer === "never" ? Effect.never : processOutcomeEffect(request, answer);
        },
      },
    ],
  });

  const cosmosHttp = Layer.effect(
    HttpClient.HttpClient,
    Effect.map(Effect.service(HttpClient.HttpClient), (inner) =>
      HttpClient.make((request, url): Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError> => {
        if (url.origin !== localCosmosEndpoint) {
          return inner.execute(request);
        }
        const body = requestBody(request);
        cosmosCalls.push(url.pathname);
        record({http: request.method, url: url.href, headers: {"Content-Type": body.contentType}, body: body.text});
        const answer = options.cosmos?.(url.pathname) ?? {status: 201, body: "{}"};
        return answer === "never"
          ? Effect.never
          : Effect.succeed(HttpClientResponse.fromWeb(request, new Response(answer.body, {status: answer.status})));
      }),
    ),
  );

  const recordingFileSystem = Layer.effect(
    FileSystem.FileSystem,
    Effect.map(Effect.service(FileSystem.FileSystem), (inner) => {
      const track = (event: TimelineEvent, path: string): void => {
        if (isSelfhostPath(path)) {
          record(event);
        }
      };
      return FileSystem.FileSystem.of({
        ...inner,
        makeDirectory: (path, makeOptions) => {
          const portable = portableSelfhostPath(path);
          track({fs: "makeDirectory", path: portable, options: makeOptions}, portable);
          return inner.makeDirectory(path, makeOptions);
        },
        writeFileString: (path, data, writeOptions) => {
          const portable = portableSelfhostPath(path);
          track({fs: "writeFileString", path: portable, length: data.length}, portable);
          return inner.writeFileString(path, data, writeOptions);
        },
        rename: (from, to) => {
          const portable = portableSelfhostPath(to);
          track({fs: "rename", from: portableSelfhostPath(from), to: portable}, portable);
          return inner.rename(from, to);
        },
        remove: (path, removeOptions) => {
          const portable = portableSelfhostPath(path);
          track({fs: "remove", path: portable, options: removeOptions}, portable);
          return inner.remove(path, removeOptions);
        },
      });
    }),
  );

  const connected = new Set<string>();
  const blobStep = (
    event: TimelineEvent,
    connectionString: Redacted.Redacted<string>,
    operation: BlobFailure["operation"],
  ): Effect.Effect<void, ContainerRuntimeError> =>
    Effect.suspend((): Effect.Effect<void, ContainerRuntimeError> => {
      const raw = Redacted.value(connectionString);
      if (!connected.has(raw)) {
        connected.add(raw);
        record({blob: "connect", connectionString: raw});
      }
      record(event);
      return options.blobFailure?.operation === operation ? Effect.fail(options.blobFailure.error) : Effect.void;
    });
  const blobStorage = Layer.succeed(
    LocalBlobStorage,
    LocalBlobStorage.of({
      ensureContainer: (connectionString, name) => blobStep({blob: "ensureContainer", name}, connectionString, "ensureContainer"),
      applyCorsPolicy: (connectionString) => blobStep({blob: "applyCorsPolicy"}, connectionString, "applyCorsPolicy"),
    }),
  );

  const overrides = Layer.mergeAll(cosmosHttp, recordingFileSystem, blobStorage);
  const instrument = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
  ): Effect.Effect<
    A,
    E,
    Exclude<R, LocalBlobStorage | FileSystem.FileSystem | HttpClient.HttpClient> | FileSystem.FileSystem | HttpClient.HttpClient
  > =>
    Effect.gen(function* () {
      boundFileSystem = yield* FileSystem.FileSystem;
      return yield* Clock.clockWith((inner) =>
        effect.pipe(Effect.provideService(Clock.Clock, recordingClock(inner, record)), Effect.provide(overrides)),
      );
    });

  return {
    harness,
    timeline: () => [...timeline],
    cosmosCalls: () => [...cosmosCalls],
    blobStorage,
    instrument,
    runCli: (argv) =>
      runScoped(
        Effect.exit(advancingClock(instrument(runCli(argv, makeRootCommand([makeDevCommand({localBlobStorage: blobStorage})]))))),
        harness.layer,
      ),
    traefik: () => {
      const suffix = "infra/Local/Management/traefik/dynamic/selfhost-services.yml";
      const entry = [...harness.files().entries()].find(([path]) => path.endsWith(suffix));
      if (entry === undefined) {
        return null;
      }
      return typeof entry[1] === "string" ? entry[1] : new TextDecoder().decode(entry[1]);
    },
  };
}
