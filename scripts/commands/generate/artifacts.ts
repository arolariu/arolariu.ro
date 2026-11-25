/** Prepares license attribution from installed workspace packages. */
import {basename, dirname, join} from "node:path";
import {Effect, FileSystem, type Path, type PlatformError} from "effect";
import {Environment} from "../../platform/Environment.ts";
import {writeTextAtomic} from "../../platform/Files.ts";
import {Presenter} from "../../platform/Output.ts";
import type {NodePackageDependencyType, NodePackageInformation} from "../../types";
import type {GenerateRequirements} from "./env.ts";
import {ArtifactGenerationFailed} from "./errors.ts";

/** Typed input accepted by the artifact preparation command. */
export interface GenerateArtifactsInput {
  readonly verbose: boolean;
  readonly root?: string;
}

/** License preparation result. */
export interface ArtifactGenerationResult {
  readonly summary: string;
  readonly generatedFiles: readonly string[];
}

/** Failure reported by the artifact preparation command. */
export type ArtifactGenerationError = ArtifactGenerationFailed;

/** Capabilities consumed by frontend attribution generation. */
export type FrontendLicenseRequirements = FileSystem.FileSystem | Path.Path | Environment | Presenter;

/**
 * Reads the human-readable message of a thrown value.
 *
 * @param cause - The thrown value.
 * @returns `cause.message` for an `Error`, otherwise `String(cause)`.
 */
function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Builds the failure of one artifact generator.
 *
 * @param artifact - Generator label.
 * @param message - Human-readable failure.
 * @returns The typed failure.
 */
function artifactFailure(artifact: string, message: string): ArtifactGenerationFailed {
  return new ArtifactGenerationFailed({message, artifact});
}

/**
 * Runs a synchronous validator at the Effect boundary.
 *
 * @param artifact - Generator label attached to a failure.
 * @param evaluate - Pure computation that may throw.
 * @returns Its value, or an {@link ArtifactGenerationFailed} carrying the thrown message.
 */
function validateSync<A>(artifact: string, evaluate: () => A): Effect.Effect<A, ArtifactGenerationFailed> {
  return Effect.try({try: evaluate, catch: (cause) => artifactFailure(artifact, errorMessage(cause))});
}

/**
 * Normalizes a filesystem or generator failure into an {@link ArtifactGenerationFailed}.
 *
 * @param artifact - Generator label attached to a converted failure.
 * @returns A mapper keeping generator failures and converting every other failure by message.
 */
function toArtifactFailure(artifact: string): (error: ArtifactGenerationFailed | PlatformError.PlatformError) => ArtifactGenerationFailed {
  return (error) => (error._tag === "ArtifactGenerationFailed" ? error : artifactFailure(artifact, error.message));
}

export abstract class LicenseGenerator {
  /** Generator label used in log lines and as the failed `artifact`. */
  protected abstract readonly sourceName: string;

  /** Creates a license generator. */
  protected constructor() {}

  /**
   * Generates one license document family.
   *
   * @returns Every license artifact path written by the generator.
   */
  public abstract generate(): Effect.Effect<readonly string[], ArtifactGenerationFailed, GenerateRequirements>;

  /**
   * Runs a synchronous validator and attributes its failure to this generator.
   *
   * @param evaluate - Pure computation that may throw.
   * @returns Its value, or an {@link ArtifactGenerationFailed}.
   */
  protected validate<A>(evaluate: () => A): Effect.Effect<A, ArtifactGenerationFailed> {
    return validateSync(this.sourceName, evaluate);
  }

  /**
   * Determines whether an unknown value is a plain record.
   *
   * @param value - Value to inspect.
   * @returns `true` when the value is a non-array object.
   */
  protected isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  /**
   * Parses manifest JSON and requires a record root.
   *
   * @param contents - Manifest JSON text.
   * @param manifestPath - File path used in validation errors.
   * @returns Parsed manifest record.
   * @throws {SyntaxError} When JSON parsing fails.
   * @throws {TypeError} When the parsed root is not a record.
   */
  protected readJsonRecord(contents: string, manifestPath: string): Readonly<Record<string, unknown>> {
    const parsed: unknown = JSON.parse(contents);
    if (!this.isRecord(parsed)) {
      throw new TypeError(`Package manifest '${manifestPath}' must be an object.`);
    }
    return parsed;
  }

  /**
   * Reads an optional string manifest field.
   *
   * @param manifest - Parsed manifest record.
   * @param key - Field name.
   * @param manifestPath - File path used in validation errors.
   * @returns Field value or `undefined` when absent.
   * @throws {TypeError} When a present value is not a string.
   */
  protected readOptionalString(manifest: Readonly<Record<string, unknown>>, key: string, manifestPath: string): string | undefined {
    const value = manifest[key];
    if (value === undefined) return undefined;
    if (typeof value !== "string") {
      throw new TypeError(`Package manifest '${manifestPath}' field '${key}' must be a string.`);
    }
    return value;
  }

  /**
   * Reads and validates a dependency-map field.
   *
   * @param manifest - Parsed manifest record.
   * @param key - Dependency field name.
   * @param manifestPath - File path used in validation errors.
   * @returns Validated package-to-version map.
   * @throws {TypeError} When the field or a version has an invalid type.
   */
  protected readDependencyMap(
    manifest: Readonly<Record<string, unknown>>,
    key: string,
    manifestPath: string,
  ): Readonly<Record<string, string>> {
    const value = manifest[key];
    if (value === undefined) return {};
    if (!this.isRecord(value)) {
      throw new TypeError(`Package manifest '${manifestPath}' field '${key}' must be an object.`);
    }

    const dependencies: Record<string, string> = {};
    for (const [name, version] of Object.entries(value)) {
      if (typeof version !== "string") {
        throw new TypeError(`Package manifest '${manifestPath}' dependency '${name}' must have a string version.`);
      }
      dependencies[name] = version;
    }
    return dependencies;
  }
}

/** One installed package classified by its declared dependency group. */
interface ResolvedPackage {
  /** Declared dependency group. */
  readonly dependencyType: NodePackageDependencyType;
  /** Normalized package metadata. */
  readonly packageInformation: NodePackageInformation;
}

/**
 * Generates the frontend third-party license document.
 *
 * @remarks
 * Discovers direct installed packages declared by the frontend manifest,
 * normalizes their metadata, groups them by dependency type, sorts them
 * deterministically, and writes `licenses.json`.
 *
 * @example
 * ```typescript
 * yield* new FrontendLicenseGenerator().generate();
 * ```
 */
export class FrontendLicenseGenerator extends LicenseGenerator {
  /** Generator label used in log lines and failures. */
  protected override readonly sourceName = "Frontend licenses";

  /** Repository root containing the frontend manifest and installed packages, when explicit. */
  readonly #workspaceRoot: string | undefined;

  /**
   * Creates the frontend license generator.
   *
   * @param workspaceRoot - Repository root containing the frontend and node_modules; defaults to
   * the environment working directory.
   */
  public constructor(workspaceRoot?: string) {
    super();
    this.#workspaceRoot = workspaceRoot;
  }

  /**
   * Reads direct frontend dependencies and writes `licenses.json`.
   *
   * @returns The generated frontend license-document path.
   */
  public override generate(): Effect.Effect<readonly string[], ArtifactGenerationFailed, FrontendLicenseRequirements> {
    return Effect.gen({self: this}, function* () {
      yield* Effect.logInfo("[Frontend licenses] Starting generation.");
      return yield* this.generateDocument().pipe(
        Effect.mapError(toArtifactFailure(this.sourceName)),
        Effect.tapError((error) => Effect.logError(`[Frontend licenses] ${error.message}`)),
      );
    });
  }

  /**
   * Discovers, groups, and writes the frontend license document.
   *
   * @returns The generated frontend license-document path.
   */
  private generateDocument(): Effect.Effect<
    readonly string[],
    ArtifactGenerationFailed | PlatformError.PlatformError,
    FrontendLicenseRequirements
  > {
    return Effect.gen({self: this}, function* () {
      const presenter = yield* Presenter;
      const workspaceRoot = this.#workspaceRoot ?? (yield* Environment).cwd;
      yield* Effect.logInfo("[Frontend licenses] Reading the frontend dependency manifest.");
      const declaredDependencies = yield* this.readDeclaredDependencies(workspaceRoot);
      const manifestPaths = yield* this.findInstalledManifestPaths(workspaceRoot, declaredDependencies);
      yield* Effect.logDebug(`[Frontend licenses] Discovered ${manifestPaths.length} direct installed package manifest(s).`);
      const resolvedPackages = yield* Effect.forEach(
        manifestPaths,
        (manifestPath) => this.readInstalledPackage(manifestPath, declaredDependencies),
        {concurrency: "unbounded"},
      );
      const groupedPackages = new Map<NodePackageDependencyType, NodePackageInformation[]>();

      for (const resolvedPackage of resolvedPackages) {
        if (resolvedPackage === null) continue;
        const packages = groupedPackages.get(resolvedPackage.dependencyType) ?? [];
        packages.push(resolvedPackage.packageInformation);
        groupedPackages.set(resolvedPackage.dependencyType, packages);
      }

      const packageCount = [...groupedPackages.values()].reduce((total, packages) => total + packages.length, 0);
      yield* Effect.logDebug(`[Frontend licenses] Grouped ${packageCount} declared package(s).`);
      const outputPath = join(workspaceRoot, "sites", "arolariu.ro", "licenses.json");
      const sortedPackages = new Map<NodePackageDependencyType, readonly NodePackageInformation[]>();
      for (const dependencyType of ["production", "development", "peer"] as const) {
        const packageInformation = groupedPackages.get(dependencyType) ?? [];
        sortedPackages.set(
          dependencyType,
          packageInformation.toSorted((left, right) => left.name.localeCompare(right.name)),
        );
      }

      yield* Effect.logInfo("[Frontend licenses] Writing licenses.json.");
      yield* writeTextAtomic(outputPath, `${JSON.stringify(Object.fromEntries(sortedPackages))}\n`);
      yield* presenter.success("[Frontend licenses] Generated 1 artifact file(s).");
      return [outputPath];
    });
  }

  /**
   * Reads declared frontend dependency names by dependency type.
   *
   * @param workspaceRoot - Repository root containing the frontend manifest.
   * @returns Map of production, development, and peer dependency names.
   */
  private readDeclaredDependencies(
    workspaceRoot: string,
  ): Effect.Effect<
    ReadonlyMap<NodePackageDependencyType, readonly string[]>,
    ArtifactGenerationFailed | PlatformError.PlatformError,
    FileSystem.FileSystem
  > {
    return Effect.gen({self: this}, function* () {
      const fs = yield* FileSystem.FileSystem;
      const manifestPath = join(workspaceRoot, "sites", "arolariu.ro", "package.json");
      const contents = yield* fs.readFileString(manifestPath);
      return yield* this.validate(() => {
        const manifest = this.readJsonRecord(contents, manifestPath);
        return new Map<NodePackageDependencyType, readonly string[]>([
          ["production", Object.keys(this.readDependencyMap(manifest, "dependencies", manifestPath))],
          ["development", Object.keys(this.readDependencyMap(manifest, "devDependencies", manifestPath))],
          ["peer", Object.keys(this.readDependencyMap(manifest, "peerDependencies", manifestPath))],
        ]);
      });
    });
  }

  /**
   * Finds direct installed package manifests, including scoped packages.
   *
   * @param workspaceRoot - Repository root containing the installed packages.
   * @param declaredDependencies - Frontend dependency names grouped by type.
   * @returns Absolute direct package-manifest paths in declared dependency order.
   */
  private findInstalledManifestPaths(
    workspaceRoot: string,
    declaredDependencies: ReadonlyMap<NodePackageDependencyType, readonly string[]>,
  ): Effect.Effect<readonly string[], ArtifactGenerationFailed | PlatformError.PlatformError, FileSystem.FileSystem> {
    return Effect.gen({self: this}, function* () {
      const fs = yield* FileSystem.FileSystem;
      const packageNames = [
        ...new Set(
          (["production", "development", "peer"] as const).flatMap((dependencyType) => declaredDependencies.get(dependencyType) ?? []),
        ),
      ];
      const paths: string[] = [];
      const unresolvedPackageNames: string[] = [];

      for (const packageName of packageNames) {
        const relativeManifestPath = join(...packageName.split("/"), "package.json");
        const candidates = [
          join(workspaceRoot, "sites", "arolariu.ro", "node_modules", relativeManifestPath),
          join(workspaceRoot, "node_modules", relativeManifestPath),
        ];
        let resolvedPath: string | undefined;

        for (const candidate of candidates) {
          // Sequential by design: the first existing candidate wins, so later candidates are not probed.
          if (yield* fs.exists(candidate)) {
            resolvedPath = candidate;
            break;
          }
        }

        if (resolvedPath === undefined) unresolvedPackageNames.push(packageName);
        else paths.push(resolvedPath);
      }

      if (unresolvedPackageNames.length > 0) {
        return yield* artifactFailure(
          this.sourceName,
          `Unable to resolve declared frontend package manifest(s): ${unresolvedPackageNames.toSorted().join(", ")}.`,
        );
      }

      return paths;
    });
  }

  /**
   * Reads and normalizes one installed package manifest.
   *
   * @param manifestPath - Absolute installed package-manifest path.
   * @param declaredDependencies - Frontend dependency names grouped by type.
   * @returns Classified package information, or `null` for undeclared packages.
   */
  private readInstalledPackage(
    manifestPath: string,
    declaredDependencies: ReadonlyMap<NodePackageDependencyType, readonly string[]>,
  ): Effect.Effect<ResolvedPackage | null, ArtifactGenerationFailed | PlatformError.PlatformError, FileSystem.FileSystem> {
    return Effect.gen({self: this}, function* () {
      const fs = yield* FileSystem.FileSystem;
      const contents = yield* fs.readFileString(manifestPath);
      return yield* this.validate(() => this.normalizeInstalledPackage(contents, manifestPath, declaredDependencies));
    });
  }

  /**
   * Normalizes one installed package manifest.
   *
   * @param contents - Manifest JSON text.
   * @param manifestPath - Absolute installed package-manifest path.
   * @param declaredDependencies - Frontend dependency names grouped by type.
   * @returns Classified package information, or `null` for undeclared packages.
   * @throws {Error} When package metadata has an invalid shape.
   */
  private normalizeInstalledPackage(
    contents: string,
    manifestPath: string,
    declaredDependencies: ReadonlyMap<NodePackageDependencyType, readonly string[]>,
  ): ResolvedPackage | null {
    const manifest = this.readJsonRecord(contents, manifestPath);
    const packageName = this.readOptionalString(manifest, "name", manifestPath) ?? basename(dirname(manifestPath));
    const dependencyType = this.resolveDependencyType(packageName, declaredDependencies);
    if (dependencyType === null) return null;

    const authorValue = manifest["author"];
    let author = "unknown";
    if (typeof authorValue === "string") {
      author = authorValue;
    } else if (this.isRecord(authorValue) && typeof authorValue["name"] === "string") {
      author = authorValue["name"];
    } else if (authorValue !== undefined) {
      throw new TypeError(`Package manifest '${manifestPath}' field 'author' must be a string or named object.`);
    }

    const repositoryValue = manifest["repository"];
    let repositoryUrl: string | undefined;
    if (typeof repositoryValue === "string") {
      repositoryUrl = repositoryValue;
    } else if (this.isRecord(repositoryValue) && typeof repositoryValue["url"] === "string") {
      repositoryUrl = repositoryValue["url"];
    } else if (repositoryValue !== undefined) {
      throw new TypeError(`Package manifest '${manifestPath}' field 'repository' must be a string or URL object.`);
    }

    const dependencyMaps = [
      this.readDependencyMap(manifest, "dependencies", manifestPath),
      this.readDependencyMap(manifest, "devDependencies", manifestPath),
      this.readDependencyMap(manifest, "peerDependencies", manifestPath),
    ];
    const dependentsByName = new Map<string, string>();
    for (const dependencies of dependencyMaps) {
      for (const [name, version] of Object.entries(dependencies)) {
        dependentsByName.set(name, version);
      }
    }
    const dependents = [...dependentsByName].map(([name, version]) => ({name, version}));

    return {
      dependencyType,
      packageInformation: {
        name: packageName,
        author,
        description: this.readOptionalString(manifest, "description", manifestPath) ?? "This package has not provided a valid description.",
        homepage: this.readOptionalString(manifest, "homepage", manifestPath) ?? repositoryUrl ?? "unknown",
        license: this.readOptionalString(manifest, "license", manifestPath) ?? "unknown",
        version: this.readOptionalString(manifest, "version", manifestPath) ?? "unknown",
        dependents,
      },
    };
  }

  /**
   * Resolves the declared dependency group for one package.
   *
   * @param packageName - Installed package name.
   * @param declaredDependencies - Frontend dependency names grouped by type.
   * @returns Dependency type, or `null` when the package is not directly declared.
   */
  private resolveDependencyType(
    packageName: string,
    declaredDependencies: ReadonlyMap<NodePackageDependencyType, readonly string[]>,
  ): NodePackageDependencyType | null {
    for (const dependencyType of ["production", "development", "peer"] as const) {
      if (declaredDependencies.get(dependencyType)?.includes(packageName) === true) {
        return dependencyType;
      }
    }
    return null;
  }
}

/**
 * Represents the reserved backend license-generation surface.
 *
 * @remarks
 * Backend dependency discovery is intentionally deferred. The class emits a
 * warning and returns no outputs so the unified generator contract remains
 * stable.
 *
 * @example
 * ```typescript
 * yield* new BackendLicenseGenerator().generate(); // []
 * ```
 */
export class BackendLicenseGenerator extends LicenseGenerator {
  /** Generator label used in log lines and failures. */
  protected override readonly sourceName = "Backend licenses";

  /** Creates the deferred backend license generator. */
  public constructor() {
    super();
  }

  /**
   * Reports deferred behavior and returns no outputs.
   *
   * @returns An empty output-path collection.
   */
  public override generate(): Effect.Effect<readonly string[], ArtifactGenerationFailed, GenerateRequirements> {
    return Effect.as(Effect.logWarning("[Backend licenses] Generation is intentionally deferred; no artifact was written."), []);
  }
}

/** Writes the attribution document without fetching or generating category data. */
export const generateArtifacts: (
  input: Readonly<GenerateArtifactsInput>,
) => Effect.Effect<ArtifactGenerationResult, ArtifactGenerationFailed, FrontendLicenseRequirements> = Effect.fn("generate.artifacts")(
  function* (input: Readonly<GenerateArtifactsInput>) {
    const environment = yield* Environment;
    const presenter = yield* Presenter;
    const root = input.root ?? environment.cwd;
    if (input.verbose) yield* Effect.logDebug(`Preparing artifacts for repository: ${root}`);
    const generatedFiles = yield* new FrontendLicenseGenerator(root).generate();
    const summary = `Generated ${generatedFiles.length} Website license file(s).`;
    yield* presenter.success(summary);
    return {summary, generatedFiles};
  },
);
