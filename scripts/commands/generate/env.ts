/**
 * @fileoverview Environment generator: writes the website `.env` as an Effect program.
 * @module scripts/commands/generate/env
 *
 * @remarks
 * Generates a `.env` file for website container builds. With `INFRA=azure` it fetches the
 * build-time configuration from the exp service (`/api/v1/build-time?for=website`); otherwise it
 * parses the existing `.env` and prompts the developer for every missing required key.
 *
 * Every ambient effect goes through a platform service: `Environment`, `FileSystem`, `HttpClient`,
 * `Prompts`, `Presenter`, the Effect logger, and the Effect clock. Secret values (the exp bearer
 * token and every `isSecretKey` value) are `Redacted` from the point they are read and unwrapped
 * only for the HTTP header and the file content.
 */

import {DateTime, Effect, FileSystem, Path, Redacted, References, type PlatformError, type Terminal} from "effect";
import {HttpClient, HttpClientRequest} from "effect/http";

import {APP_CONFIGURATION_MAPPING, AZURE_RUNTIME_IDENTITY_KEYS, isSecretKey} from "../../azure/index.ts";
import type {AppConfigurationEnvironmentKey, GeneratedEnvironmentKey} from "../../azure/index.ts";
import type {CommandInvoker} from "../../common/commander.ts";
import {legacyInvoker} from "../../platform/bridge.ts";
import {Environment} from "../../platform/Environment.ts";
import {writeTextAtomic, type Glob} from "../../platform/Files.ts";
import {debugLogsEnabled, Presenter, withLogContext} from "../../platform/Output.ts";
import type {Process} from "../../platform/Process.ts";
import {Prompts, type PromptUnavailable} from "../../platform/Prompts.ts";
import {ExpConfigurationUnavailable, MissingEnvironmentValues} from "./errors.ts";

/** Typed input of the legacy leaf invokers; removed with the shims in cohort 3 Task 3.3. */
export interface GenerateLeafInput {
  /** Enables diagnostic output. */
  readonly verbose: boolean;
}

/** Typed business result produced by every `generate` leaf generator. */
export interface GenerateLeafResult {
  /** Human-readable completion summary. */
  readonly summary: string;
  /** Paths of every file this generator created or modified. */
  readonly changedFiles: readonly string[];
}

/** Services the `generate` leaf generators may require. */
export type GenerateRequirements =
  FileSystem.FileSystem | Path.Path | HttpClient.HttpClient | Process | Presenter | Prompts | Environment | Glob;

/** Every failure {@link generateEnvironment} may report. */
export type GenerateEnvironmentError =
  ExpConfigurationUnavailable | MissingEnvironmentValues | PromptUnavailable | Terminal.QuitError | PlatformError.PlatformError;

/** Log prefix context of every environment generator line, kept from the legacy logger fork. */
const LOG_CONTEXT = "generate:env";

/** exp service URL — same deterministic logic as the runtime consumers. EXP_PROXY_URL overrides for bare-metal dev. */
const AZURE_EXP_URL = "https://exp.arolariu.ro";

/** Azure AD token scope for authenticating to the exp service. */
const EXP_TOKEN_SCOPE = "api://950ac239-5c2c-4759-bd83-911e68f6a8c9/.default";

/** Upper bound of the exp build-time request. */
const EXP_REQUEST_TIMEOUT = "30 seconds";

const SETUP_SECTION_START = "# arolariu.ro setup-managed values";
const SETUP_SECTION_END = "# End arolariu.ro setup-managed values";

const REEMITTABLE_ENVIRONMENT_KEYS: ReadonlySet<string> = new Set([
  ...Object.values(APP_CONFIGURATION_MAPPING),
  ...AZURE_RUNTIME_IDENTITY_KEYS,
]);

function isReemittableEnvironmentKey(key: string): key is GeneratedEnvironmentKey {
  return REEMITTABLE_ENVIRONMENT_KEYS.has(key);
}

/** One configuration value; secret values stay redacted until the file content is rendered. */
type EnvironmentValue = string | Redacted.Redacted<string>;

/** Fetched, parsed, or prompted configuration keyed by generated environment variable name. */
type EnvironmentValues = Partial<Record<GeneratedEnvironmentKey, EnvironmentValue>>;

/**
 * Wraps a value read for `key` in `Redacted` when the key is secret.
 *
 * @param key - The environment variable name.
 * @param value - The raw value.
 * @returns The value, redacted when `isSecretKey(key)`.
 */
function readValue(key: string, value: string): EnvironmentValue {
  return isSecretKey(key) ? Redacted.make(value) : value;
}

/**
 * Unwraps a configuration value for the generated file content.
 *
 * @param value - A plain or redacted value.
 * @returns The raw value.
 */
function reveal(value: EnvironmentValue): string {
  return typeof value === "string" ? value : Redacted.value(value);
}

/**
 * Renders the text of a value composed of styled segments, as the legacy `logger.line` did.
 *
 * @param texts - The segment texts.
 * @returns An effect writing one stdout line.
 */
function line(...texts: readonly string[]): Effect.Effect<void, never, Presenter> {
  return Effect.flatMap(Presenter, (presenter) => presenter.line("stdout", texts.join("")));
}

/**
 * Parses environment assignments without logging or evaluating their values.
 *
 * @param content - Raw environment file contents.
 * @returns Parsed assignments, with the final assignment winning.
 */
export function parseEnvironmentFile(content: string): ReadonlyMap<string, string> {
  const values = new Map<string, string>();

  for (const rawLine of content.split(/\r\n|\n|\r/u)) {
    const trimmed = rawLine.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    if (key === "") {
      continue;
    }

    let value = trimmed.slice(separator + 1).trim();
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }

  return values;
}

function environmentNewline(content: string): "\r\n" | "\n" | "\r" {
  return (content.match(/\r\n|\n|\r/u)?.[0] as "\r\n" | "\n" | "\r" | undefined) ?? "\n";
}

/**
 * Appends one setup-owned section containing only missing, nonempty values.
 *
 * @param original - Existing environment file contents.
 * @param additions - Candidate assignments in desired output order.
 * @returns The unchanged original or an additive environment payload.
 */
export function appendMissingEnvironmentValues(original: string, additions: ReadonlyMap<string, string>): string {
  const existing = parseEnvironmentFile(original);
  const missing: string[] = [];

  for (const [key, value] of additions) {
    const trimmedValue = value.trim();
    if (!existing.has(key) && trimmedValue !== "") {
      missing.push(`${key}=${quoteIfNeeded(trimmedValue)}`);
    }
  }

  if (missing.length === 0) {
    return original;
  }

  const newline = environmentNewline(original);
  const separator = original === "" || original.endsWith("\n") || original.endsWith("\r") ? "" : newline;
  return `${original}${separator}${[SETUP_SECTION_START, ...missing, SETUP_SECTION_END, ""].join(newline)}`;
}

/**
 * Helper function to determine if a value needs to be quoted in .env format.
 * Values containing special characters must be quoted to prevent:
 * - Shell expansion (backticks, dollar signs)
 * - Comment interpretation (hash symbols)
 * - Variable substitution
 * - Newlines/tabs breaking the .env format
 * - Shell metacharacters causing execution issues
 *
 * @param value The string value to check and potentially quote
 * @returns The value, quoted and escaped if necessary
 */
export function quoteIfNeeded(value: string): string {
  // Empty values should be represented as empty strings
  if (!value) {
    return '""';
  }

  // Whitespace, shell expansion (` $), comments (#), delimiters (= ;), shell metacharacters
  // (| & * ? < >), quotes, and backslashes all require quoting.
  const needsQuoting = /[\s`$#=;|&*?<>'"\\]/.test(value);

  if (!needsQuoting) {
    return value;
  }

  // Escape backslashes first (must be done before escaping quotes), then quotes and control characters.
  let escaped = value.replace(/\\/g, "\\\\");
  escaped = escaped.replace(/"/g, '\\"');
  escaped = escaped.replace(/\n/g, "\\n");
  escaped = escaped.replace(/\r/g, "\\r");
  escaped = escaped.replace(/\t/g, "\\t");

  return `"${escaped}"`;
}

/**
 * Acquires an exp bearer token through `@azure/identity`, loaded lazily.
 *
 * @remarks
 * In CI (GitHub Actions) `azure/login` sets up `AzureCliCredential` through OIDC; elsewhere
 * `DefaultAzureCredential` is used. A failure or an empty token is a warning, not a failure: the
 * request is then sent without an `Authorization` header, as before.
 *
 * @param isCI - Whether the command runs in CI.
 * @returns The redacted token, or `undefined` when none was acquired.
 */
function acquireBearerToken(isCI: boolean): Effect.Effect<Redacted.Redacted<string> | undefined, never, Presenter> {
  const describe = (error: unknown): string => (error instanceof Error ? error.message : String(error));
  return Effect.gen(function* () {
    const identity = yield* Effect.tryPromise({try: () => import("@azure/identity"), catch: describe});
    const credential = isCI ? new identity.AzureCliCredential() : new identity.DefaultAzureCredential();
    yield* Effect.logInfo(`Acquiring token for scope ${EXP_TOKEN_SCOPE} via ${isCI ? "AzureCliCredential" : "DefaultAzureCredential"}.`);
    const token = yield* Effect.tryPromise({try: () => credential.getToken(EXP_TOKEN_SCOPE), catch: describe});
    if (!token?.token) {
      yield* Effect.logWarning("Token acquisition returned an empty token.");
      return undefined;
    }
    const redacted = Redacted.make(token.token);
    yield* (yield* Presenter).success("Bearer token acquired successfully.");
    return redacted;
  }).pipe(Effect.catch((message) => Effect.as(Effect.logWarning(`Failed to acquire bearer token: ${message}`), undefined)));
}

/**
 * Fetches build-time configuration from the exp service.
 *
 * @remarks
 * Calls `GET /api/v1/build-time?for=website&label=<label>` and maps exp config keys to environment
 * variable names through {@link APP_CONFIGURATION_MAPPING}. A transport failure, a non-2xx status,
 * an unparseable body, or a missing `config` object fails with {@link ExpConfigurationUnavailable};
 * a key missing from `config` is only a warning.
 *
 * @returns The mapped configuration.
 */
const fetchConfigurationFromExp: Effect.Effect<EnvironmentValues, ExpConfigurationUnavailable, GenerateRequirements> = Effect.gen(
  function* () {
    const environment = yield* Environment;
    const presenter = yield* Presenter;
    const client = yield* HttpClient.HttpClient;
    const expBaseUrl =
      environment.variables["EXP_PROXY_URL"]?.trim() || (environment.variables["AZURE_CLIENT_ID"] ? AZURE_EXP_URL : "http://exp");
    const configLabel = (environment.variables["SITE_ENV"] ?? "").toUpperCase() === "PRODUCTION" ? "PRODUCTION" : "DEVELOPMENT";

    yield* Effect.logDebug(`Exp service URL: ${expBaseUrl}`);

    // Acquire a bearer token only when targeting the Azure-hosted exp service.
    let token: Redacted.Redacted<string> | undefined;
    if (expBaseUrl === AZURE_EXP_URL) {
      token = yield* acquireBearerToken(environment.isCI);
    } else {
      yield* Effect.logInfo("No AZURE_CLIENT_ID; skipping bearer token acquisition.");
    }

    const url = `${expBaseUrl}/api/v1/build-time?for=website&label=${configLabel}`;
    yield* Effect.logInfo(`Fetching ${url}.`);

    const request = HttpClientRequest.get(url, {headers: {"X-Exp-Target": "website"}});
    const unavailable = (error: {readonly message: string}): ExpConfigurationUnavailable =>
      new ExpConfigurationUnavailable({message: `exp request to ${url} failed: ${error.message}`});
    const response = yield* client
      .execute(token === undefined ? request : HttpClientRequest.bearerToken(request, token))
      // Keep the legacy request headers exactly: no trace propagation headers to the exp service.
      .pipe(
        Effect.provideService(HttpClient.TracerPropagationEnabled, false),
        Effect.timeout(EXP_REQUEST_TIMEOUT),
        Effect.mapError(unavailable),
      );
    const body = yield* Effect.mapError(response.text, unavailable);

    if (response.status < 200 || response.status >= 300) {
      yield* Effect.logError(`exp returned ${response.status} for ${url}.`);
      if (body !== "") {
        yield* Effect.logDebug(`exp response included a non-empty error body (${body.length} characters).`);
      }
      return yield* new ExpConfigurationUnavailable({
        message: `exp returned ${response.status} for /api/v1/build-time?for=website`,
        status: response.status,
      });
    }

    const payload = yield* Effect.try({
      try: (): unknown => JSON.parse(body),
      catch: (error) =>
        new ExpConfigurationUnavailable({message: error instanceof Error ? error.message : String(error), status: response.status}),
    });
    const config = typeof payload === "object" && payload !== null && "config" in payload ? payload.config : undefined;
    if (typeof config !== "object" || config === null) {
      return yield* new ExpConfigurationUnavailable({message: "exp build-time response missing 'config' object", status: response.status});
    }
    const received = config as Readonly<Record<string, unknown>>;

    yield* Effect.logDebug(`Received ${Object.keys(received).length} config keys from exp.`);

    const values: EnvironmentValues = {};
    for (const [expKey, envVar] of Object.entries(APP_CONFIGURATION_MAPPING)) {
      const value = received[expKey];
      if (value !== undefined && value !== null) {
        values[envVar] = readValue(envVar, String(value));
        yield* Effect.logInfo(`Mapped ${expKey} to ${envVar}.`);
      } else {
        yield* Effect.logWarning(`Key ${expKey} was not found in the exp build-time response.`);
      }
    }

    yield* presenter.success(`Fetched ${Object.keys(values).length} configuration values from exp.`);
    return values;
  },
);

/**
 * Parses an existing `.env` file and keeps only the re-emittable keys.
 *
 * @remarks
 * Best-effort: a missing file yields no values, and a read failure is only a warning.
 *
 * @param envPath - Path to the `.env` file, relative to the environment working directory.
 * @returns The parsed values.
 */
function fetchConfigurationFromLocalEnvFile(envPath: string): Effect.Effect<EnvironmentValues, never, GenerateRequirements> {
  return Effect.gen(function* () {
    const environment = yield* Environment;
    const presenter = yield* Presenter;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const resolved = path.resolve(environment.cwd, envPath);
    const values: EnvironmentValues = {};

    if (!(yield* Effect.orElseSucceed(fs.exists(resolved), () => false))) {
      yield* Effect.logInfo("No existing .env file found in the supplied path.");
      yield* Effect.logInfo(`Supplied path (raw): ${envPath}`);
      yield* Effect.logInfo(`Supplied path (built): ${resolved}`);
      return values;
    }

    yield* Effect.logInfo(`Path found: ${resolved}`);
    yield* Effect.logInfo("Parsing existing .env file.");

    const content = yield* Effect.result(fs.readFileString(resolved));
    if (content._tag === "Failure") {
      yield* Effect.logWarning("Encountered an error while parsing the .env file.");
      if (yield* debugLogsEnabled) {
        yield* Effect.logError(`Error: ${content.failure.message}`);
      }
      return values;
    }
    for (const [key, value] of parseEnvironmentFile(content.success)) {
      if (isReemittableEnvironmentKey(key)) {
        values[key] = readValue(key, value);
      }
    }

    yield* presenter.success(`Parsed ${Object.keys(values).length} existing environment variables.`);
    return values;
  });
}

/**
 * Prompts for the value of every missing key; secret keys use a non-echoing secret prompt.
 *
 * @param missingKeys - The required keys absent from the existing configuration.
 * @returns The nonempty prompted values.
 */
function promptForMissingKeys(
  missingKeys: readonly AppConfigurationEnvironmentKey[],
): Effect.Effect<EnvironmentValues, PromptUnavailable | Terminal.QuitError, GenerateRequirements> {
  return Effect.gen(function* () {
    const presenter = yield* Presenter;
    const prompts = yield* Prompts;
    yield* presenter.section("Prompting for missing environment variables", "🔍");

    if (missingKeys.length === 0) {
      yield* presenter.success("All required keys are present.");
      return {};
    }

    yield* Effect.logWarning(`Found ${missingKeys.length} missing key(s) that need to be provided.`);

    const values: EnvironmentValues = {};
    let count = 1;
    for (const key of missingKeys) {
      const isSecret = isSecretKey(key);
      const prefix = isSecret ? "🔐" : "🔑";
      const secretHint = isSecret ? " (hidden)" : "";
      yield* Effect.logInfo(`${prefix} [${count}/${missingKeys.length}] Requesting ${key}${secretHint}.`);

      const value: EnvironmentValue = isSecret
        ? Redacted.make(Redacted.value(yield* prompts.secret(key)).trim())
        : (yield* prompts.text(key)).trim();
      if (reveal(value) === "") {
        yield* Effect.logWarning(`Empty value provided for ${key}. Please ensure this is intentional.`);
      } else {
        values[key] = value;
      }
      count++;
    }

    yield* Effect.logDebug(`Collected ${Object.keys(values).length} prompted environment value(s).`);
    yield* presenter.success("All missing keys have been provided.");
    return values;
  });
}

/**
 * Ensures every required environment variable is present for local usage.
 *
 * @remarks
 * Parses the existing `.env`, then asks whether to provide the missing required keys. Without a
 * TTY the confirmation takes its default (`true`) and the first prompt fails with
 * `PromptUnavailable`; a declined confirmation fails with {@link MissingEnvironmentValues}.
 *
 * @returns The completed configuration.
 */
const ensureLocalEnvIsComplete: Effect.Effect<
  EnvironmentValues,
  MissingEnvironmentValues | PromptUnavailable | Terminal.QuitError,
  GenerateRequirements
> = Effect.gen(function* () {
  const presenter = yield* Presenter;
  const prompts = yield* Prompts;
  yield* presenter.section("Ensuring local environment configuration is complete", "🔧");

  const existing = yield* fetchConfigurationFromLocalEnvFile(".env");
  const existingKeys = Object.keys(existing);
  yield* Effect.logDebug(`Existing configuration keys: ${JSON.stringify(existingKeys, null, 2)}`);

  const missingKeys = Object.values(APP_CONFIGURATION_MAPPING).filter((key) => !existingKeys.includes(key));
  if (missingKeys.length === 0) {
    yield* presenter.success("All required environment variables are present.");
    return existing;
  }

  yield* Effect.logWarning(`Missing ${missingKeys.length} required environment variable(s):`);
  for (const missingKey of missingKeys) {
    yield* line(`      • ${missingKey}`);
  }

  if (!(yield* prompts.confirm("Do you want to provide the missing values now?", true))) {
    return yield* new MissingEnvironmentValues({message: "Aborting: Missing environment variables were not provided.", keys: missingKeys});
  }

  const prompted = yield* promptForMissingKeys(missingKeys);
  yield* presenter.success("Configuration merged successfully.");
  return {...existing, ...prompted};
});

/**
 * Renders one named configuration section of the `.env` output.
 *
 * @param sectionName - Human-friendly section name.
 * @param keys - Keys to include in this section, in order.
 * @param config - Completed configuration.
 * @returns The section lines, preceded by a blank line.
 */
function configSectionLines(sectionName: string, keys: readonly string[], config: EnvironmentValues): readonly string[] {
  const assignments = keys.flatMap((key) => {
    const value = config[key as GeneratedEnvironmentKey];
    return value === undefined ? [] : [`${key}=${quoteIfNeeded(reveal(value))}`];
  });
  return ["", `# ${sectionName} Configuration Start`, ...assignments, `# ${sectionName} Configuration End`];
}

/**
 * Generates the `.env` file content from a configuration; the only place secret values are unwrapped.
 *
 * @param config - Completed configuration.
 * @returns A newline-separated `.env` payload.
 */
function generateEnvFileContent(config: EnvironmentValues): Effect.Effect<string, never, Environment | Presenter> {
  return Effect.gen(function* () {
    const environment = yield* Environment;
    const presenter = yield* Presenter;
    yield* presenter.section("Generating .env file content", "📝");

    const timestamp = DateTime.formatIso(yield* DateTime.now);
    const commitSha = environment.variables["COMMIT_SHA"] ?? environment.variables["GITHUB_SHA"] ?? "N/A";
    const lines: string[] = [
      "# Generated environment configuration file",
      `# Site Environment: ${environment.variables["NODE_ENV"] || "development"}`,
      `# CI/CD: ${environment.isCI ? "true" : "false"}`,
      `# Commit SHA: ${commitSha}`,
      `# Generated at: ${timestamp}`,
      "# !!!! DO NOT EDIT MANUALLY !!!",
      "",
    ];

    const sections: readonly (readonly [string, string, readonly string[]])[] = [
      ["Site", "📦", ["SITE_ENV", "SITE_NAME", "SITE_URL"]],
      ["Accepted Authentication", "🔐", ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"]],
      ["Accepted Azure Runtime Identity", "☁️", AZURE_RUNTIME_IDENTITY_KEYS],
    ];
    for (const [sectionName, emoji, keys] of sections) {
      yield* Effect.logInfo(`${emoji} Adding ${sectionName} Configuration.`);
      lines.push(...configSectionLines(sectionName, keys, config));
    }

    yield* Effect.logInfo("📊 Adding Metadata Configuration.");
    const useCdn = config["USE_CDN"] === undefined ? "false" : reveal(config["USE_CDN"]);
    lines.push(
      "",
      "# Metadata Configuration Start",
      `TIMESTAMP=${quoteIfNeeded(timestamp)}`,
      `COMMIT_SHA=${quoteIfNeeded(commitSha)}`,
      `USE_CDN=${quoteIfNeeded(useCdn)}`,
      "# Metadata Configuration End",
    );

    yield* presenter.success("File content generated successfully.");
    return lines.join("\n");
  });
}

/**
 * Copies the generated `.env` file into the configured sub-repositories.
 *
 * @param sourcePath - Absolute source `.env` path.
 * @param targetPaths - Repository-relative target paths (each starting with `/`).
 * @returns Absolute destination paths that were successfully written; a failed copy is logged and skipped.
 */
function copyEnvFileToSubRepos(
  sourcePath: string,
  targetPaths: readonly string[],
): Effect.Effect<readonly string[], never, GenerateRequirements> {
  return Effect.gen(function* () {
    const environment = yield* Environment;
    const presenter = yield* Presenter;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    yield* presenter.section("Copying .env file to sub-repositories", "📂");

    const copied: string[] = [];
    for (const targetPath of targetPaths) {
      yield* Effect.logInfo(`Raw target path: ${targetPath}`);
      const builtTargetPath = path.resolve(environment.cwd, `.${targetPath}`);
      yield* Effect.logInfo(`Built target path: ${builtTargetPath}`);
      const outcome = yield* Effect.result(fs.copy(sourcePath, builtTargetPath, {overwrite: true}));
      if (outcome._tag === "Success") {
        copied.push(builtTargetPath);
      } else {
        yield* Effect.logError(`Error copying to ${builtTargetPath}.`);
        if (yield* debugLogsEnabled) {
          yield* Effect.logError(`Error: ${outcome.failure.message}`);
        }
      }
    }
    return copied;
  });
}

/**
 * Generates the website `.env` and copies it to `sites/arolariu.ro/.env`.
 *
 * @remarks
 * Effective verbosity is `--verbose` or `VERBOSE=true`; the latter lowers the minimum log level to
 * `Debug` for this program only. Every line uses the `generate:env` log context.
 */
export const generateEnvironment: Effect.Effect<GenerateLeafResult, GenerateEnvironmentError, GenerateRequirements> = Effect.gen(
  function* () {
    const environment = yield* Environment;
    const presenter = yield* Presenter;
    const path = yield* Path.Path;
    const effectiveVerbose = (yield* debugLogsEnabled) || environment.variables["VERBOSE"] === "true";
    const isAzure = environment.variables["INFRA"] === "azure";
    const isProduction = environment.variables["PRODUCTION"] === "true";

    const body = Effect.gen(function* () {
      yield* line("🔧 Configuration:");
      yield* line();
      yield* line("   Infrastructure: ", isAzure ? "Azure" : "Local");
      yield* line("   Environment: ", isProduction ? "production" : "development");
      yield* line("   Verbose: ", effectiveVerbose ? "✅ Enabled" : "❌ Disabled");
      yield* line("   Agent: ", environment.isCI ? "CI/CD" : "Local");
      yield* line("   Working Directory: ", environment.cwd);
      yield* line("   Output File: ", ".env");
      yield* line();
      yield* Effect.logDebug("SITE_ENV was evaluated without logging its value.");

      const config = isAzure ? yield* fetchConfigurationFromExp : yield* ensureLocalEnvIsComplete;
      const content = yield* generateEnvFileContent(config);

      const envFile = path.resolve(environment.cwd, ".env");
      yield* Effect.logInfo("Writing .env file.");
      yield* writeTextAtomic(envFile, content, {mode: 0o600});

      yield* presenter.success(`Generated ${Object.keys(config).length} environment variables.`);
      yield* line("   File: ", envFile);
      yield* line();

      const copied = yield* copyEnvFileToSubRepos(envFile, ["/sites/arolariu.ro/.env"]);
      return {
        summary: `Generated ${Object.keys(config).length} environment variable(s).`,
        changedFiles: [".env", ...copied],
      };
    }).pipe(withLogContext(LOG_CONTEXT));

    return yield* effectiveVerbose ? Effect.provideService(body, References.MinimumLogLevel, "Debug") : body;
  },
).pipe(Effect.withSpan("generate.env"));

/**
 * Temporary legacy invoker over {@link generateEnvironment} for the unmigrated orchestrator.
 *
 * @remarks Deleted in cohort 3 Task 3.3, when the orchestrator calls the Effect directly.
 */
export const generateEnvironmentCommand: CommandInvoker<GenerateLeafInput, GenerateLeafResult> = legacyInvoker<
  GenerateLeafInput,
  GenerateLeafResult,
  GenerateEnvironmentError
>(
  LOG_CONTEXT,
  () => generateEnvironment,
  () => 0,
);
