import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {fs} from "../filesystem/index.ts";
import {parseJUnitXml} from "./junit.ts";
import {parseTrxResults} from "./trx.ts";
import {decodeVitestReport} from "./vitest.ts";

const fixture = (name: string): string => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

describe("raw serialized report decoders", () => {
  it("retains raw JUnit cases without importing workflow findings", async () => {
    const suites = parseJUnitXml(await fs.readText(fixture("junit.xml")));
    expect(suites[0]).toMatchObject({tests: 3, failures: 1, skipped: 1});
    expect(suites[0]?.cases[1]).toMatchObject({name: "fails", line: 12, failureMessage: "Expected true"});
    expect(parseJUnitXml('<testsuite name="single" tests="1"><testcase name="one"/></testsuite>')).toHaveLength(1);
  });
  it("retains single/multiple TRX results including Error outcomes", async () => {
    expect(parseTrxResults(await fs.readText(fixture("trx.xml"))).map((result) => result.outcome)).toEqual(["Passed", "Error"]);
    expect(parseTrxResults('<TestRun><Results><UnitTestResult testName="one" outcome="Passed"/></Results></TestRun>')).toHaveLength(1);
  });
  it.each(["<testsuite>", "<other/>", '<testsuite tests="-1"/>'])("rejects malformed JUnit evidence %s", (xml) => {
    expect(() => parseJUnitXml(xml)).toThrow();
  });
  it("validates real Vitest JSON rather than casting its counters", async () => {
    const raw = await fs.readJson<unknown>(fixture("vitest.json"));
    const report = decodeVitestReport(raw);
    expect(report.numFailedTests).toBe(1);
    expect(() => decodeVitestReport({...report, numFailedTests: "1"})).toThrow();
    expect(() => decodeVitestReport({...report, numTotalTests: -1})).toThrow();
    expect(() => decodeVitestReport({testResults: []})).toThrow();
  });
});
