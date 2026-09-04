// @vitest-environment node
/**
 * @fileoverview CSV preservation, ordering, and atomic-write evidence for the exchange-rate feature.
 * @module scripts/features/exchange-rates/rate-csv.test
 *
 * @remarks
 * Every case runs against {@link createMemoryFileSystem}; the recording facade reproduces the exact
 * temporary-then-rename sequence `scripts/adapters/node/node-filesystem.ts` performs for
 * `writeTextAtomic`, so a merge that ever wrote the destination path directly would be visible.
 * Mapping {@link RateCsvWriteError} onto the typed `csv-merge-write-failed` decision belongs to
 * `./workflow.ts` and is proved in `./workflow.test.ts`.
 */

import {describe, expect, it} from "vitest";

import {FileSystemError, type FileSystem} from "../../core/runtime/runtime-capability.ts";
import {createMemoryFileSystem} from "../../testing/fixtures/memory-filesystem.fixture.ts";
import {RateCsvWriteError, readPreservedRateRecords, writeMergedRateCsv} from "./rate-csv.ts";

const csvPath = "/repo/sites/arolariu.ro/public/data/exchange-rates.csv";

/** A memory filesystem plus the ordered write operations one merge performed against it. */
function buildRecordingFileSystem(seed: Readonly<Record<string, string>> = {}): Readonly<{files: FileSystem; operations: string[]}> {
  const inner = createMemoryFileSystem(seed);
  const operations: string[] = [];
  const files: FileSystem = {
    ...inner,
    writeText: async (path: string, contents: string): Promise<void> => {
      operations.push(`writeText ${path}`);
      await inner.writeText(path, contents);
    },
    writeTextAtomic: async (path: string, contents: string): Promise<void> => {
      const temporaryPath = `${path}.tmp`;
      await inner.createDirectory(path.slice(0, path.lastIndexOf("/")), {recursive: true});
      operations.push(`writeText ${temporaryPath}`);
      await inner.writeText(temporaryPath, contents);
      operations.push(`move ${temporaryPath} -> ${path}`);
      await inner.move(temporaryPath, path);
    },
  };

  return {files, operations};
}

describe("exchange rate CSV merge", () => {
  it("preserves records outside the updated range, replaces records inside it, and sorts by year then currency", async () => {
    const {files} = buildRecordingFileSystem({
      [csvPath]: ["year,currency,rate_to_ron", "2019,USD,4.1", "2024,EUR,4.97", "2024,USD,4.9", ""].join("\n"),
    });

    const preserved = await readPreservedRateRecords(files, csvPath, 2024, 2024);
    await writeMergedRateCsv(files, csvPath, [
      ...preserved,
      {year: 2024, currency: "USD", rateToRon: 5},
      {year: 2024, currency: "EUR", rateToRon: 4.5},
    ]);

    expect(preserved).toEqual([{year: 2019, currency: "USD", rateToRon: 4.1}]);
    expect((await files.readText(csvPath)).split("\n")).toEqual([
      "year,currency,rate_to_ron",
      "2019,USD,4.1",
      "2024,EUR,4.5",
      "2024,USD,5",
      "",
    ]);
  });

  it("preserves nothing when the CSV file does not exist yet, and skips malformed rows", async () => {
    const {files} = buildRecordingFileSystem({
      [csvPath]: ["year,currency,rate_to_ron", "2017,USD,3.9", "", "2018,", "not-a-record", "2026,EUR,5.2"].join("\n"),
    });

    expect(await readPreservedRateRecords(createMemoryFileSystem(), csvPath, 2018, 2025)).toEqual([]);
    expect(await readPreservedRateRecords(files, csvPath, 2018, 2025)).toEqual([
      {year: 2017, currency: "USD", rateToRon: 3.9},
      {year: 2026, currency: "EUR", rateToRon: 5.2},
    ]);
  });

  it("writes the merged CSV through a temporary file and a rename, never over the destination", async () => {
    const {files, operations} = buildRecordingFileSystem();

    await writeMergedRateCsv(files, csvPath, [{year: 2024, currency: "USD", rateToRon: 5}]);

    expect(operations).toEqual([`writeText ${csvPath}.tmp`, `move ${csvPath}.tmp -> ${csvPath}`]);
    expect(await files.readText(csvPath)).toBe("year,currency,rate_to_ron\n2024,USD,5\n");
  });

  it("surfaces a write fault as a RateCsvWriteError that keeps the original message and cause", async () => {
    const cause = new FileSystemError("writeTextAtomic", csvPath, `Failed to writeTextAtomic '${csvPath}': permission denied`, {
      code: "EACCES",
    });
    const files: FileSystem = {...createMemoryFileSystem(), writeTextAtomic: () => Promise.reject(cause)};
    let thrown: unknown;

    try {
      await writeMergedRateCsv(files, csvPath, []);
    } catch (error: unknown) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(RateCsvWriteError);
    expect(thrown).toMatchObject({csvPath, cause, message: cause.message});
  });
});
