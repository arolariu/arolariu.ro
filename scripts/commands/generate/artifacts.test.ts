// @vitest-environment node
import {join} from "node:path";
import {Effect, FileSystem, type PlatformError} from "effect";
import {describe, expect} from "vitest";
import {effectTest, makeTestLayer, repositoryFixtureRoot, type TestHarness} from "../../platform/testing.ts";
import {BackendLicenseGenerator, FrontendLicenseGenerator, generateArtifacts, type FrontendLicenseRequirements} from "./artifacts.ts";
import type {GenerateRequirements} from "./env.ts";
import {ArtifactGenerationFailed} from "./errors.ts";

const WORKSPACE_FILES: Readonly<Record<string, string>> = {
  "package.json": JSON.stringify({name: "@arolariu/monorepo"}),
  "sites/arolariu.ro/package.json": JSON.stringify({}),
};

function artifactTest(
  name: string,
  options: {readonly files?: Readonly<Record<string, string>>},
  body: (fixture: {readonly harness: TestHarness}) => Effect.Effect<void, unknown, GenerateRequirements | FrontendLicenseRequirements>,
): void {
  const harness = makeTestLayer({context: "test::artifacts", files: options.files ?? {}});
  effectTest(name, () => body({harness}), harness.layer);
}

function semanticLines(harness: TestHarness, stream?: "stdout" | "stderr"): readonly string[] {
  return harness
    .output()
    .filter((record) => record.text.startsWith("[arolariu::") && (stream === undefined || record.stream === stream))
    .map((record) => record.text.replace(/\n$/u, ""));
}

function readText(path: string): Effect.Effect<string, PlatformError.PlatformError, FileSystem.FileSystem> {
  return Effect.flatMap(Effect.service(FileSystem.FileSystem), (fs) => fs.readFileString(path));
}

function readObjectArray(contents: string, key: string): readonly unknown[] {
  const parsed: unknown = JSON.parse(contents);
  const value: unknown = typeof parsed === "object" && parsed !== null ? Reflect.get(parsed, key) : undefined;
  if (!Array.isArray(value)) {
    throw new TypeError(`Generated document '${key}' field must be an array.`);
  }
  return value;
}

describe("FrontendLicenseGenerator", () => {
  const workspace = join(repositoryFixtureRoot, "license-workspace");
  const manifest = (relativePath: string, value: unknown): Record<string, string> => ({
    [join(workspace, relativePath)]: JSON.stringify(value),
  });
  const licensesPath = join(workspace, "sites", "arolariu.ro", "licenses.json");

  artifactTest(
    "reports the website registry copy instead of a same-name root workspace package",
    {
      files: {
        ...manifest("sites/arolariu.ro/package.json", {
          dependencies: {"@arolariu/components": "https://registry.npmjs.org/@arolariu/components/-/components-2.3.0.tgz"},
        }),
        ...manifest("node_modules/@arolariu/components/package.json", {name: "@arolariu/components", version: "2.4.0", license: "MIT"}),
        ...manifest("sites/arolariu.ro/node_modules/@arolariu/components/package.json", {
          name: "@arolariu/components",
          version: "2.3.0",
          license: "MIT",
        }),
      },
    },
    () =>
      Effect.gen(function* () {
        yield* new FrontendLicenseGenerator(workspace).generate();

        expect(readObjectArray(yield* readText(licensesPath), "production")).toMatchObject([
          {name: "@arolariu/components", version: "2.3.0"},
        ]);
      }),
  );

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
  artifactTest("prepares website attribution without other checkout artifacts", {files: WORKSPACE_FILES}, ({harness}) =>
    Effect.gen(function* () {
      const result = yield* generateArtifacts({verbose: false});
      expect(result.generatedFiles).toEqual([join(repositoryFixtureRoot, "sites", "arolariu.ro", "licenses.json")]);
      expect(harness.httpCalls()).toEqual([]);
    }),
  );
});
