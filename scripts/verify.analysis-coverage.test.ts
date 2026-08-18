/**
 * @fileoverview Unit tests for the analysis pipeline backend coverage verifier.
 * @module scripts/verify.analysis-coverage.test
 */

import {afterAll, afterEach, describe, expect, it, vi} from "vitest";
import {existsSync, readFileSync, readdirSync} from "node:fs";
import {mkdir, mkdtemp, rm, utimes, writeFile} from "node:fs/promises";
import {dirname, join, resolve} from "node:path";

import {
  DEFAULT_INCLUDED_PATH_FRAGMENTS,
  DEFAULT_RESULTS_DIRECTORY,
  DEFAULT_THRESHOLDS,
  main,
  measureOpenCover,
  parseCliOptions,
  selectOpenCoverReports,
  verifyOpenCover,
} from "./verify.analysis-coverage.ts";

const temporaryDirectories: string[] = [];

/**
 * Creates a scratch directory inside the repository (never the OS temp root) for filesystem-backed tests.
 *
 * @returns The absolute path to a freshly created scratch directory.
 */
async function makeScratchDirectory(): Promise<string> {
  const scratchRoot = resolve(import.meta.dirname, ".analysis-coverage-scratch");
  await mkdir(scratchRoot, {recursive: true});
  const directory = await mkdtemp(join(scratchRoot, "run-"));
  temporaryDirectories.push(directory);
  return directory;
}

/**
 * Reports whether the suite is running on CI, where the dedicated analysis coverage collection is mandatory and a
 * missing report must fail the build rather than silently skip the genuine-report assertions.
 *
 * @returns `true` when the standard `CI` environment variable is set to a truthy value.
 */
function isContinuousIntegration(): boolean {
  const flag = process.env["CI"];
  return flag !== undefined && flag !== "" && flag !== "0" && flag.toLowerCase() !== "false";
}

/**
 * Locates a genuine coverlet OpenCover report produced by the dedicated analysis coverage collection, if one
 * exists on this machine. Returns `undefined` on a clean checkout so the suite stays runnable without .NET.
 *
 * @returns The absolute path to a real OpenCover report, or `undefined` when none has been collected.
 */
function findRealReport(): string | undefined {
  const configuredResultsDirectory = process.env["ANALYSIS_COVERAGE_RESULTS_DIRECTORY"];
  const root = resolve(
    import.meta.dirname,
    "..",
    configuredResultsDirectory ?? join("sites", "api.arolariu.ro", "TestResults", "AnalysisCoverage"),
  );
  if (!existsSync(root)) {
    return undefined;
  }

  function findReports(directory: string): string[] {
    const reports: string[] = [];

    for (const entry of readdirSync(directory, {withFileTypes: true})) {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        reports.push(...findReports(entryPath));
      } else if (entry.isFile() && entry.name === "coverage.opencover.xml") {
        reports.push(entryPath);
      }
    }

    return reports;
  }

  return findReports(root).sort((left, right) => left.localeCompare(right))[0];
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, {recursive: true, force: true})));
});

afterAll(async () => {
  const scratchRoot = resolve(import.meta.dirname, ".analysis-coverage-scratch");
  await rm(scratchRoot, {recursive: true, force: true});
  expect(existsSync(scratchRoot)).toBe(false);
});

interface MethodFixture {
  readonly visited: boolean;
  readonly sequencePoints: readonly number[]; // visit counts, one per synthetic sequence point
  readonly branchPoints: readonly number[]; // visit counts, one per synthetic branch point
}

interface FileFixture {
  readonly uid: number;
  readonly fullPath: string;
  readonly methods: readonly MethodFixture[];
}

/** Builds a minimal, well-formed OpenCover XML document for the given synthetic files. */
function buildOpenCoverXml(files: readonly FileFixture[]): string {
  const fileElements = files.map((file) => `<File uid="${file.uid}" fullPath="${file.fullPath}" />`).join("");

  const classElements = files
    .map((file) => {
      const methodElements = file.methods
        .map((method, methodIndex) => {
          const sequencePointElements = method.sequencePoints
            .map(
              (vc, index) =>
                `<SequencePoint vc="${vc}" ordinal="${index}" sl="${index + 1}" sc="1" el="${index + 1}" ec="2" fileid="${file.uid}" />`,
            )
            .join("");
          const branchPointElements = method.branchPoints
            .map((vc, index) => `<BranchPoint vc="${vc}" ordinal="${index}" sl="${index + 1}" offset="0" path="0" fileid="${file.uid}" />`)
            .join("");

          return `
            <Method visited="${method.visited}" cyclomaticComplexity="1" isConstructor="false" isStatic="true">
              <FileRef uid="${file.uid}" />
              <SequencePoints>${sequencePointElements}</SequencePoints>
              <BranchPoints>${branchPointElements}</BranchPoints>
              <MethodPoint xsi:type="SequencePoint" vc="${methodIndex}" ordinal="0" sl="1" sc="1" el="1" ec="2" fileid="${file.uid}" />
            </Method>`;
        })
        .join("");

      return `
        <Class>
          <FullName>Synthetic.Class</FullName>
          <Methods>${methodElements}</Methods>
        </Class>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="utf-8"?>
<CoverageSession xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Modules>
    <Module hash="synthetic">
      <ModuleName>Synthetic</ModuleName>
      <Files>${fileElements}</Files>
      <Classes>${classElements}</Classes>
    </Module>
  </Modules>
</CoverageSession>`;
}

describe("verifyOpenCover", () => {
  it("passes when the matched file has full line, branch, and method coverage", () => {
    const xml = buildOpenCoverXml([
      {
        uid: 1,
        fullPath: "C:\\repo\\sites\\api.arolariu.ro\\src\\Invoices\\Modules\\InvoiceMetrics.cs",
        methods: [{visited: true, sequencePoints: [1, 1, 1], branchPoints: [1, 1]}],
      },
    ]);

    expect(() => verifyOpenCover([xml], ["Invoices/Modules/InvoiceMetrics.cs"], DEFAULT_THRESHOLDS)).not.toThrow();
  });

  it("fails when a fixture method is entirely uncovered, dropping method/line coverage below 99%", () => {
    const xml = buildOpenCoverXml([
      {
        uid: 1,
        fullPath: "C:\\repo\\sites\\api.arolariu.ro\\src\\Invoices\\Modules\\InvoiceMetrics.cs",
        methods: [
          {visited: true, sequencePoints: [1, 1, 1, 1, 1, 1, 1, 1, 1], branchPoints: [1]},
          {visited: false, sequencePoints: [0], branchPoints: []},
        ],
      },
    ]);

    expect(() => verifyOpenCover([xml], ["Invoices/Modules/InvoiceMetrics.cs"], DEFAULT_THRESHOLDS)).toThrow(/coverage gate failed/i);
  });

  it("matches files regardless of Windows or POSIX path separators", () => {
    const windowsXml = buildOpenCoverXml([
      {
        uid: 1,
        fullPath: "C:\\repo\\sites\\api.arolariu.ro\\src\\Invoices\\Modules\\InvoiceMetrics.cs",
        methods: [{visited: true, sequencePoints: [1], branchPoints: [1]}],
      },
    ]);
    const posixXml = buildOpenCoverXml([
      {
        uid: 1,
        fullPath: "/repo/sites/api.arolariu.ro/src/Invoices/Modules/InvoiceMetrics.cs",
        methods: [{visited: true, sequencePoints: [1], branchPoints: [1]}],
      },
    ]);

    expect(() => verifyOpenCover([windowsXml], ["Invoices/Modules/InvoiceMetrics.cs"], DEFAULT_THRESHOLDS)).not.toThrow();
    expect(() => verifyOpenCover([posixXml], ["Invoices\\Modules\\InvoiceMetrics.cs"], DEFAULT_THRESHOLDS)).not.toThrow();
  });

  it("refuses to invent a vacuous 100% when the matched files contain no branch points at all", () => {
    const xml = buildOpenCoverXml([
      {
        uid: 1,
        fullPath: "C:\\repo\\sites\\api.arolariu.ro\\src\\Invoices\\Modules\\InvoiceMetrics.cs",
        methods: [{visited: true, sequencePoints: [1], branchPoints: []}],
      },
    ]);

    expect(() => verifyOpenCover([xml], ["Invoices/Modules/InvoiceMetrics.cs"], DEFAULT_THRESHOLDS)).toThrow(
      /zero branch points.*zero denominator/is,
    );
  });

  it("throws rather than silently passing when no file matches the included path fragments", () => {
    const xml = buildOpenCoverXml([
      {
        uid: 1,
        fullPath: "C:\\repo\\sites\\api.arolariu.ro\\src\\Invoices\\Modules\\Log.cs",
        methods: [{visited: true, sequencePoints: [1], branchPoints: []}],
      },
    ]);

    expect(() => verifyOpenCover([xml], ["Invoices/Modules/InvoiceMetrics.cs"], DEFAULT_THRESHOLDS)).toThrow(
      /No files in the OpenCover report\(s\) matched/i,
    );
  });

  it("throws rather than silently passing when the matched file has a zero line denominator", () => {
    const xml = buildOpenCoverXml([
      {
        uid: 1,
        fullPath: "C:\\repo\\sites\\api.arolariu.ro\\src\\Invoices\\Modules\\InvoiceMetrics.cs",
        methods: [{visited: true, sequencePoints: [], branchPoints: []}],
      },
    ]);

    expect(() => verifyOpenCover([xml], ["Invoices/Modules/InvoiceMetrics.cs"], DEFAULT_THRESHOLDS)).toThrow(/zero denominator/i);
  });

  it("throws when the report contains no <Module> elements", () => {
    const xml = `<?xml version="1.0"?><CoverageSession></CoverageSession>`;

    expect(() => verifyOpenCover([xml], DEFAULT_INCLUDED_PATH_FRAGMENTS, DEFAULT_THRESHOLDS)).toThrow(/no <Module> elements/i);
  });

  it("throws when the XML cannot be parsed", () => {
    const malformedXml = "<CoverageSession><Modules>";

    expect(() => verifyOpenCover([malformedXml], DEFAULT_INCLUDED_PATH_FRAGMENTS, DEFAULT_THRESHOLDS)).toThrow(/Failed to parse OpenCover XML/i);
  });

  it("throws when called with no included path fragments", () => {
    const xml = buildOpenCoverXml([]);

    expect(() => verifyOpenCover([xml], [], DEFAULT_THRESHOLDS)).toThrow(/at least one included path fragment/i);
  });
});

describe("DEFAULT_INCLUDED_PATH_FRAGMENTS", () => {
  it("covers the full analysis feature surface from tasks 2-12, not a single token file", () => {
    expect(DEFAULT_INCLUDED_PATH_FRAGMENTS.length).toBeGreaterThanOrEqual(20);

    for (const fragment of [
      "/src/Invoices/Modules/InvoiceMetrics.cs",
      "/src/Invoices/DDD/Analysis/",
      "/src/Invoices/DDD/ValueObjects/Allergens/",
      "/src/Invoices/DDD/ValueObjects/Classifications/",
      "/src/Invoices/DDD/ValueObjects/Recipes/",
      "/src/Invoices/DDD/Entities/Merchants/MerchantNameNormalizer.cs",
      "/src/Invoices/Brokers/TaxonomyBroker/",
      "/src/Invoices/Brokers/AnalysisRunBroker/",
      "/src/Invoices/Brokers/DocumentIntelligenceBroker/",
      "/src/Invoices/Services/Foundation/AnalysisRuns/",
      "/src/Invoices/Services/Foundation/DocumentAnalysis/",
      "/src/Invoices/Services/Foundation/GenerativeAnalysis/",
      "/src/Invoices/Services/Orchestration/AnalysisService/",
      "/src/Invoices/Services/Processing/AnalysisService/",
      "/src/Invoices/Workers/AnalysisWorker.cs",
      "/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.Validations.cs",
      "/src/Invoices/Services/Foundation/MerchantStorage/MerchantStorageFoundationService.Validations.cs",
      "/src/Invoices/DTOs/Analysis/AnalysisOptionsResolver.cs",
      "/src/Invoices/DTOs/Analysis/AnalysisAcceptedResponseDto.cs",
      "/src/Invoices/DTOs/Analysis/ClassificationSelectionDto.cs",
      "/src/Invoices/Endpoints/InvoiceEndpoints.Analysis.cs",
    ]) {
      expect(DEFAULT_INCLUDED_PATH_FRAGMENTS).toContain(fragment);
    }
  });

  it("anchors every fragment to a production /src/ path so test files can never enter the denominator", () => {
    for (const fragment of DEFAULT_INCLUDED_PATH_FRAGMENTS) {
      expect(fragment.startsWith("/src/"), `Fragment "${fragment}" is not anchored to /src/.`).toBe(true);
    }
  });

  it("excludes a test-tree file whose tail matches an included production fragment", () => {
    // Before anchoring, an unanchored fragment such as "Invoices/DDD/Analysis/" also matched
    // ".../tests/.../Invoices/DDD/Analysis/...", quietly inflating the denominator with test code.
    const productionPath = "C:\\repo\\sites\\api.arolariu.ro\\src\\Invoices\\DDD\\Analysis\\Aggregates\\AnalysisRun.cs";
    const testPath = "C:\\repo\\sites\\api.arolariu.ro\\tests\\arolariu.Backend.Domain.Tests\\Invoices\\DDD\\Analysis\\AnalysisRunTests.cs";
    const xml = buildOpenCoverXml([
      {uid: 1, fullPath: productionPath, methods: [{visited: true, sequencePoints: [1, 1], branchPoints: [1, 1]}]},
      {uid: 2, fullPath: testPath, methods: [{visited: false, sequencePoints: [0, 0], branchPoints: [0, 0]}]},
    ]);

    const measurement = measureOpenCover([xml], DEFAULT_INCLUDED_PATH_FRAGMENTS);

    expect(measurement.files.map((file) => file.path)).toStrictEqual([productionPath.replaceAll("\\", "/")]);
  });

  it("excludes a POSIX test-tree file whose tail matches an included production fragment", () => {
    const productionPath = "/home/runner/repo/sites/api.arolariu.ro/src/Invoices/DDD/Analysis/Aggregates/AnalysisRun.cs";
    const testPath = "/home/runner/repo/sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/DDD/Analysis/AnalysisRunTests.cs";
    const xml = buildOpenCoverXml([
      {uid: 1, fullPath: productionPath, methods: [{visited: true, sequencePoints: [1, 1], branchPoints: [1, 1]}]},
      {uid: 2, fullPath: testPath, methods: [{visited: false, sequencePoints: [0, 0], branchPoints: [0, 0]}]},
    ]);

    const measurement = measureOpenCover([xml], DEFAULT_INCLUDED_PATH_FRAGMENTS);

    expect(measurement.files.map((file) => file.path)).toStrictEqual([productionPath]);
  });

  it("matches a Windows production path after separator normalization", () => {
    const productionPath = "C:\\repo\\sites\\api.arolariu.ro\\src\\Invoices\\Brokers\\AnalysisRunBroker\\CosmosAnalysisRunBroker.cs";
    const xml = buildOpenCoverXml([{uid: 1, fullPath: productionPath, methods: [{visited: true, sequencePoints: [1], branchPoints: [1, 1]}]}]);

    const measurement = measureOpenCover([xml], DEFAULT_INCLUDED_PATH_FRAGMENTS);

    expect(measurement.files).toHaveLength(1);
    expect(measurement.files[0]!.path).toBe(productionPath.replaceAll("\\", "/"));
  });

  it("pins every threshold dimension at 99%", () => {
    expect(DEFAULT_THRESHOLDS).toStrictEqual({lines: 99, branches: 99, methods: 99});
  });
});

describe("official-api-trigger coverage gate", () => {
  it("runs the CI-mode verifier suite after collecting the dedicated analysis report", () => {
    const workflow = readFileSync(resolve(import.meta.dirname, "..", ".github", "workflows", "official-api-trigger.yml"), "utf8");

    expect(workflow).toMatch(/- "scripts\/verify\.analysis-coverage\.ts"/);
    expect(workflow).toMatch(/- "scripts\/verify\.analysis-coverage\.test\.ts"/);
    expect(workflow).toMatch(
      /--results-directory \.\/sites\/api\.arolariu\.ro\/TestResults\/AnalysisCoverage[\s\S]*?CI: 'true'[\s\S]*?npx vitest run scripts\/verify\.analysis-coverage\.test\.ts --config vitest\.config\.ts --coverage\.enabled=false/,
    );
  });
});

describe("measureOpenCover", () => {
  it("counts every real BranchPoint node, never inventing a vacuous 100%", () => {
    const xml = buildOpenCoverXml([
      {
        uid: 1,
        fullPath: "/repo/src/Invoices/Modules/InvoiceMetrics.cs",
        methods: [{visited: true, sequencePoints: [1, 1], branchPoints: [1, 0, 1, 0]}],
      },
    ]);

    const measurement = measureOpenCover([xml], ["Invoices/Modules/InvoiceMetrics.cs"]);

    expect(measurement.totalBranches).toBe(4);
    expect(measurement.coveredBranches).toBe(2);
    expect(measurement.branchPercent).toBeCloseTo(50, 5);
  });

  it("reports branch coverage as unavailable rather than 100% when no branch points exist", () => {
    const xml = buildOpenCoverXml([
      {
        uid: 1,
        fullPath: "/repo/src/Invoices/Modules/InvoiceMetrics.cs",
        methods: [{visited: true, sequencePoints: [1], branchPoints: []}],
      },
    ]);

    const measurement = measureOpenCover([xml], ["Invoices/Modules/InvoiceMetrics.cs"]);

    expect(measurement.totalBranches).toBe(0);
    expect(measurement.branchPercent).toBeUndefined();
  });

  it("merges per-file coverage across multiple reports by taking the best observed visit counts", () => {
    const first = buildOpenCoverXml([
      {
        uid: 1,
        fullPath: "/repo/src/Invoices/Modules/InvoiceMetrics.cs",
        methods: [{visited: false, sequencePoints: [1, 0], branchPoints: [1, 0]}],
      },
    ]);
    const second = buildOpenCoverXml([
      {
        uid: 1,
        fullPath: "/repo/src/Invoices/Modules/InvoiceMetrics.cs",
        methods: [{visited: false, sequencePoints: [0, 1], branchPoints: [0, 1]}],
      },
    ]);

    const merged = measureOpenCover([first, second], ["Invoices/Modules/InvoiceMetrics.cs"]);

    expect(merged.totalLines).toBe(2);
    expect(merged.coveredLines).toBe(2);
    expect(merged.totalBranches).toBe(2);
    expect(merged.coveredBranches).toBe(2);
  });

  it("attributes per-file gaps so failures can be diagnosed without re-running coverage", () => {
    const xml = buildOpenCoverXml([
      {
        uid: 1,
        fullPath: "/repo/src/Invoices/Modules/InvoiceMetrics.cs",
        methods: [{visited: true, sequencePoints: [1, 0], branchPoints: [1]}],
      },
      {
        uid: 2,
        fullPath: "/repo/src/Invoices/Workers/AnalysisWorker.cs",
        methods: [{visited: true, sequencePoints: [1, 1], branchPoints: [1]}],
      },
    ]);

    const measurement = measureOpenCover([xml], ["Invoices/Modules/InvoiceMetrics.cs", "Invoices/Workers/AnalysisWorker.cs"]);

    expect(measurement.files).toHaveLength(2);
    const metrics = measurement.files.find((file) => file.path.endsWith("InvoiceMetrics.cs"));
    expect(metrics?.missedLines).toBe(1);
    const worker = measurement.files.find((file) => file.path.endsWith("AnalysisWorker.cs"));
    expect(worker?.missedLines).toBe(0);
  });
});

describe("selectOpenCoverReports", () => {
  it("selects only reports containing included analysis files and ignores unrelated project reports", async () => {
    const root = await makeScratchDirectory();

    const analysisReport = join(root, "domain", "coverage.opencover.xml");
    const unrelatedReport = join(root, "core", "coverage.opencover.xml");
    await mkdir(join(root, "domain"), {recursive: true});
    await mkdir(join(root, "core"), {recursive: true});

    await writeFile(
      analysisReport,
      buildOpenCoverXml([
        {uid: 1, fullPath: "/repo/src/Invoices/Modules/InvoiceMetrics.cs", methods: [{visited: true, sequencePoints: [1], branchPoints: []}]},
      ]),
    );
    await writeFile(
      unrelatedReport,
      buildOpenCoverXml([
        {uid: 1, fullPath: "/repo/src/Core/Program.cs", methods: [{visited: true, sequencePoints: [1], branchPoints: []}]},
      ]),
    );
    // Make the unrelated report the newest on disk: a newest-wins selector would pick it and pass vacuously.
    const future = new Date(Date.now() + 60_000);
    await utimes(unrelatedReport, future, future);

    const selected = await selectOpenCoverReports(root, ["Invoices/Modules/InvoiceMetrics.cs"]);

    expect(selected).toStrictEqual([analysisReport]);
  });

  it("returns every matching report in deterministic sorted order, never an arbitrary newest one", async () => {
    const root = await makeScratchDirectory();

    const paths = ["bbb", "aaa", "ccc"].map((name) => join(root, name, "coverage.opencover.xml"));
    for (const path of paths) {
      await mkdir(dirname(path), {recursive: true});
      await writeFile(
        path,
        buildOpenCoverXml([
          {uid: 1, fullPath: "/repo/src/Invoices/Modules/InvoiceMetrics.cs", methods: [{visited: true, sequencePoints: [1], branchPoints: []}]},
        ]),
      );
    }

    const selected = await selectOpenCoverReports(root, ["Invoices/Modules/InvoiceMetrics.cs"]);

    expect(selected).toStrictEqual([...paths].sort((left, right) => left.localeCompare(right)));
  });

  it("throws when reports exist but none contain any included analysis file", async () => {
    const root = await makeScratchDirectory();
    await mkdir(join(root, "core"), {recursive: true});
    await writeFile(
      join(root, "core", "coverage.opencover.xml"),
      buildOpenCoverXml([{uid: 1, fullPath: "/repo/src/Core/Program.cs", methods: [{visited: true, sequencePoints: [1], branchPoints: []}]}]),
    );

    await expect(selectOpenCoverReports(root, ["Invoices/Modules/InvoiceMetrics.cs"])).rejects.toThrow(/none contained any included analysis file/i);
  });

  it("throws when the results directory contains no OpenCover report at all", async () => {
    const root = await makeScratchDirectory();

    await expect(selectOpenCoverReports(root, ["Invoices/Modules/InvoiceMetrics.cs"])).rejects.toThrow(/No coverage\.opencover\.xml/i);
  });

  it("throws when the results directory does not exist", async () => {
    await expect(selectOpenCoverReports(join(await makeScratchDirectory(), "missing"), ["Invoices/"])).rejects.toThrow(/does not exist/i);
  });
});

describe("parseCliOptions", () => {
  it("accepts an explicit results directory override", () => {
    expect(parseCliOptions(["--results-directory", "sites/api.arolariu.ro/TestResults/AnalysisCoverage"]).resultsDirectory).toBe(
      "sites/api.arolariu.ro/TestResults/AnalysisCoverage",
    );
  });

  it("defaults to the dedicated AnalysisCoverage results directory", () => {
    expect(parseCliOptions([]).resultsDirectory).toBe("sites/api.arolariu.ro/TestResults/AnalysisCoverage");
  });

  it("rejects out-of-range thresholds", () => {
    expect(() => parseCliOptions(["--threshold", "101"])).toThrow(/Invalid --threshold/i);
    expect(() => parseCliOptions(["--threshold", "not-a-number"])).toThrow(/Invalid --threshold/i);
  });
});

describe("real OpenCover output", () => {
  const realReportPath = findRealReport();

  it("has a collected report available (mandatory in CI)", () => {
    if (realReportPath === undefined) {
      // In CI the dedicated collection runs before this suite, so a missing report means the gate would have been
      // silently unverified. Locally the report is optional so the suite stays runnable without a full collection.
      expect(
        isContinuousIntegration(),
        `No OpenCover report under ${DEFAULT_RESULTS_DIRECTORY}. CI must collect it before running the verifier tests.`,
      ).toBe(false);
      return;
    }

    expect(realReportPath).toMatch(/coverage\.opencover\.xml$/);
  });

  it.runIf(realReportPath !== undefined)("counts real BranchPoint nodes from a genuine coverlet report", () => {
    const xml = readFileSync(realReportPath!, "utf8");
    const measurement = measureOpenCover([xml], DEFAULT_INCLUDED_PATH_FRAGMENTS);

    // Real analysis code branches; a report claiming zero branch points would mean the verifier is not reading them.
    expect(measurement.totalBranches).toBeGreaterThan(500);
    expect(measurement.coveredBranches).toBeLessThanOrEqual(measurement.totalBranches);
    expect(measurement.files.length).toBeGreaterThanOrEqual(60);
    expect(measurement.branchPercent).toBeDefined();
    // Honest reporting: a real report is not a perfect 100% synthetic fixture.
    expect(measurement.branchPercent!).toBeLessThan(100);
    expect(measurement.branchPercent!).toBeGreaterThanOrEqual(DEFAULT_THRESHOLDS.branches);
  });

  it.runIf(realReportPath !== undefined)("passes the production gate against the genuine report", () => {
    const xml = readFileSync(realReportPath!, "utf8");

    expect(() => verifyOpenCover([xml], DEFAULT_INCLUDED_PATH_FRAGMENTS, DEFAULT_THRESHOLDS)).not.toThrow();
  });
});


describe("main", () => {
  const originalArgv = process.argv;

  afterEach(() => {
    process.argv = originalArgv;
  });

  it.runIf(findRealReport() !== undefined)("returns exit code 0 and prints merged percentages for the real report", async () => {
    const logs: string[] = [];
    const infoSpy = vi.spyOn(console, "info").mockImplementation((message: unknown) => void logs.push(String(message)));

    process.argv = ["node", "verify.analysis-coverage.ts", "--results-directory", DEFAULT_RESULTS_DIRECTORY];
    const exitCode = await main();
    infoSpy.mockRestore();

    expect(exitCode).toBe(0);
    expect(logs.join("\n")).toMatch(/Analysis coverage gate passed \(>= 99%\)/);
    expect(logs.join("\n")).toMatch(/branches\s+\d+\.\d{2}%/);
  });

  it("propagates a failure when the results directory holds no analysis report", async () => {
    const root = await makeScratchDirectory();
    await mkdir(join(root, "core"), {recursive: true});
    await writeFile(
      join(root, "core", "coverage.opencover.xml"),
      buildOpenCoverXml([{uid: 1, fullPath: "/repo/src/Core/Program.cs", methods: [{visited: true, sequencePoints: [1], branchPoints: [1]}]}]),
    );

    process.argv = ["node", "verify.analysis-coverage.ts", "--results-directory", root];

    await expect(main()).rejects.toThrow(/none contained any included analysis file/i);
  });

  it("propagates a below-threshold failure naming the worst offending files", async () => {
    const root = await makeScratchDirectory();
    await mkdir(join(root, "domain"), {recursive: true});
    await writeFile(
      join(root, "domain", "coverage.opencover.xml"),
      buildOpenCoverXml([
        {
          uid: 1,
          fullPath: "/repo/src/Invoices/Workers/AnalysisWorker.cs",
          methods: [{visited: false, sequencePoints: [0, 0], branchPoints: [0, 0]}],
        },
      ]),
    );

    process.argv = ["node", "verify.analysis-coverage.ts", "--results-directory", root];

    await expect(main()).rejects.toThrow(/Worst offenders[\s\S]*AnalysisWorker\.cs/i);
  });
});


describe("defensive parsing", () => {
  /** Raw OpenCover XML exercising attribute/element shapes that coverlet can legitimately emit. */
  const irregularXml = `<?xml version="1.0" encoding="utf-8"?>
<CoverageSession xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Modules>
    <Module hash="irregular">
      <Files>
        <File uid="1" fullPath="/repo/src/Invoices/Modules/InvoiceMetrics.cs" />
        <File fullPath="/repo/src/Invoices/Modules/NoUid.cs" />
        <File uid="9" />
      </Files>
      <Classes>
        <Class>
          <Methods>
            <Method visited="true">
              <Name>System.Void Named::Alpha()</Name>
              <FileRef uid="1" />
              <SequencePoints><SequencePoint /></SequencePoints>
              <BranchPoints><BranchPoint /></BranchPoints>
            </Method>
            <Method visited="true">
              <Name>System.Void Named::Beta()</Name>
              <FileRef uid="1" />
              <SequencePoints><SequencePoint vc="4" ordinal="0" sl="7" /></SequencePoints>
              <BranchPoints><BranchPoint vc="2" ordinal="0" offset="3" path="1" /></BranchPoints>
            </Method>
            <Method visited="false">
              <Name>System.Void NoFileRef::Gamma()</Name>
              <SequencePoints><SequencePoint vc="1" ordinal="0" sl="1" /></SequencePoints>
            </Method>
            <Method visited="false">
              <Name>System.Void UnknownFile::Delta()</Name>
              <FileRef uid="404" />
              <SequencePoints><SequencePoint vc="1" ordinal="0" sl="1" /></SequencePoints>
            </Method>
          </Methods>
        </Class>
      </Classes>
    </Module>
  </Modules>
</CoverageSession>`;

  it("tolerates missing attributes, unnamed points, absent FileRefs and dangling file uids", () => {
    const measurement = measureOpenCover([irregularXml], ["Invoices/Modules/InvoiceMetrics.cs"]);

    expect(measurement.files).toHaveLength(1);
    // Only the two InvoiceMetrics methods are attributed; the FileRef-less and dangling-uid methods are skipped.
    expect(measurement.totalMethods).toBe(2);
    expect(measurement.totalLines).toBe(2);
    expect(measurement.coveredLines).toBe(1); // the attribute-less SequencePoint defaults to vc=0
    expect(measurement.totalBranches).toBe(2);
    expect(measurement.coveredBranches).toBe(1);
  });

  it("honours the OpenCover visited attribute when a method reports no visited sequence points", () => {
    const measurement = measureOpenCover([irregularXml], ["Invoices/Modules/InvoiceMetrics.cs"]);

    // Alpha has only an unvisited sequence point yet visited="true", so it still counts as a covered method.
    expect(measurement.coveredMethods).toBe(2);
    expect(measurement.methodPercent).toBeCloseTo(100, 5);
  });

  it("falls back to a positional identity for methods without a Name element", () => {
    const xml = buildOpenCoverXml([
      {
        uid: 1,
        fullPath: "/repo/src/Invoices/Modules/InvoiceMetrics.cs",
        methods: [
          {visited: true, sequencePoints: [1], branchPoints: [1]},
          {visited: true, sequencePoints: [1], branchPoints: [1]},
        ],
      },
    ]);

    // Distinct positional identities keep two identical unnamed methods from collapsing into one.
    expect(measureOpenCover([xml], ["Invoices/Modules/InvoiceMetrics.cs"]).totalMethods).toBe(2);
  });

  it("requires at least one included path fragment in every entry point", async () => {
    expect(() => measureOpenCover([irregularXml], [])).toThrow(/at least one included path fragment/i);
    await expect(selectOpenCoverReports(".", [])).rejects.toThrow(/at least one included path fragment/i);
  });

  it("rejects a results directory that is a file rather than a directory", async () => {
    const root = await makeScratchDirectory();
    const filePath = join(root, "not-a-directory.xml");
    await writeFile(filePath, "<CoverageSession />");

    await expect(selectOpenCoverReports(filePath, ["Invoices/"])).rejects.toThrow(/not a directory/i);
  });

  it("accepts an explicit in-range threshold override", () => {
    expect(parseCliOptions(["--threshold", "85"]).threshold).toBe(85);
    expect(parseCliOptions([]).threshold).toBe(DEFAULT_THRESHOLDS.lines);
  });
});
