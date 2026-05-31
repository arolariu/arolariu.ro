import {describe, it, expect} from "vitest";
import {
  parseJUnitXml,
  jUnitSuitesToResult,
  parseTrxToSuiteResult,
  parseTrxDuration,
  aggregateSuites,
  flattenSuiteFindings,
  type SuiteResult,
} from "./_testHelpers.ts";

describe("parseJUnitXml", () => {
  it("parses a pytest-style document with one suite and passing/failing cases", () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<testsuites>
  <testsuite name="pytest" tests="3" failures="1" errors="0" skipped="1" time="0.45">
    <testcase classname="tests.module" name="test_pass" file="tests/test_module.py" line="10" time="0.01"/>
    <testcase classname="tests.module" name="test_fail" file="tests/test_module.py" line="20" time="0.02">
      <failure message="assert 1 == 2">AssertionError</failure>
    </testcase>
    <testcase classname="tests.module" name="test_skip" file="tests/test_module.py" line="30">
      <skipped message="not implemented"/>
    </testcase>
  </testsuite>
</testsuites>`;
    const suites = parseJUnitXml(xml);
    expect(suites).toHaveLength(1);
    expect(suites[0]?.name).toBe("pytest");
    expect(suites[0]?.tests).toBe(3);
    expect(suites[0]?.failures).toBe(1);
    expect(suites[0]?.skipped).toBe(1);
    expect(suites[0]?.cases).toHaveLength(3);
  });

  it("tolerates a single-suite document without <testsuites> wrapper", () => {
    const xml = `<?xml version="1.0"?><testsuite name="single" tests="1" failures="0" errors="0" skipped="0"><testcase name="t"/></testsuite>`;
    const suites = parseJUnitXml(xml);
    expect(suites).toHaveLength(1);
    expect(suites[0]?.name).toBe("single");
  });
});

describe("jUnitSuitesToResult", () => {
  it("aggregates pass/fail/skip counts and emits LineFindings for failed cases", () => {
    const xml = `<testsuites><testsuite name="pytest" tests="2" failures="1" errors="0" skipped="0">
      <testcase classname="tests.x" name="t1" file="tests/x.py" line="5"/>
      <testcase classname="tests.x" name="t2" file="tests/x.py" line="10"><failure message="boom">stack</failure></testcase>
    </testsuite></testsuites>`;
    const result = jUnitSuitesToResult("test-exp", parseJUnitXml(xml));
    expect(result.totalTests).toBe(2);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f?.kind).toBe("line");
    if (f?.kind === "line") {
      expect(f.file).toBe("tests/x.py");
      expect(f.line).toBe(10);
      expect(f.ruleId).toBe("test-exp/test-failure");
      expect(f.message).toContain("boom");
    }
  });

  it("includes <error> cases in the failed count and findings", () => {
    const xml = `<testsuite name="s" tests="1" failures="0" errors="1" skipped="0">
      <testcase classname="tests.y" name="t1" file="tests/y.py" line="3"><error message="exception">trace</error></testcase>
    </testsuite>`;
    const result = jUnitSuitesToResult("test-exp", parseJUnitXml(xml));
    expect(result.failed).toBe(1);
    expect(result.findings[0]?.message).toContain("exception");
  });

  it("falls back to classname when file attribute is missing", () => {
    const xml = `<testsuite name="s" tests="1" failures="1" errors="0" skipped="0">
      <testcase classname="tests.z" name="t1"><failure message="x">y</failure></testcase>
    </testsuite>`;
    const result = jUnitSuitesToResult("test-exp", parseJUnitXml(xml));
    const f = result.findings[0];
    if (f?.kind === "line") {
      expect(f.file).toBe("tests.z");
    }
  });
});

describe("parseTrxDuration", () => {
  it("converts HH:MM:SS.fff to milliseconds", () => {
    expect(parseTrxDuration("00:00:01.500")).toBe(1500);
    expect(parseTrxDuration("00:01:30.000")).toBe(90000);
    expect(parseTrxDuration("01:00:00.000")).toBe(3600000);
  });

  it("returns undefined for invalid input", () => {
    expect(parseTrxDuration(undefined)).toBeUndefined();
    expect(parseTrxDuration("not-a-duration")).toBeUndefined();
  });
});

describe("parseTrxToSuiteResult", () => {
  it("parses a TRX file with passing and failing tests", () => {
    const trx = `<?xml version="1.0" encoding="utf-8"?>
<TestRun>
  <Results>
    <UnitTestResult testName="Foo.Bar_HappyPath_Pass" outcome="Passed" duration="00:00:00.0500000"/>
    <UnitTestResult testName="Foo.Bar_SadPath_Fail" outcome="Failed" duration="00:00:00.0100000">
      <Output><ErrorInfo><Message>Assert.Equal: expected 1, got 2</Message><StackTrace>at Foo.Bar.Test()</StackTrace></ErrorInfo></Output>
    </UnitTestResult>
  </Results>
</TestRun>`;
    const result = parseTrxToSuiteResult("test-api", trx);
    expect(result.totalTests).toBe(2);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    if (f?.kind === "line") {
      expect(f.file).toBe("Foo.Bar_SadPath_Fail");
      expect(f.message).toContain("Assert.Equal");
      expect(f.ruleId).toBe("test-api/test-failure");
    }
  });

  it("handles a TRX with a single UnitTestResult (object, not array)", () => {
    const trx = `<TestRun><Results><UnitTestResult testName="only" outcome="Passed" duration="00:00:00.001"/></Results></TestRun>`;
    const result = parseTrxToSuiteResult("test-api", trx);
    expect(result.totalTests).toBe(1);
    expect(result.passed).toBe(1);
  });

  it("returns empty result for an empty TestRun", () => {
    const trx = `<TestRun><Results/></TestRun>`;
    const result = parseTrxToSuiteResult("test-api", trx);
    expect(result.totalTests).toBe(0);
    expect(result.findings).toEqual([]);
  });

  it("classifies NotExecuted / Skipped outcomes as skipped, not failed", () => {
    const trx = `<TestRun><Results>
      <UnitTestResult testName="t1" outcome="NotExecuted" duration="00:00:00.000"/>
      <UnitTestResult testName="t2" outcome="Skipped" duration="00:00:00.000"/>
    </Results></TestRun>`;
    const result = parseTrxToSuiteResult("test-api", trx);
    expect(result.skipped).toBe(2);
    expect(result.failed).toBe(0);
  });
});

describe("aggregateSuites", () => {
  it("sums per-suite counts into a TestSuitesPayload", () => {
    const suites: SuiteResult[] = [
      {name: "a", totalTests: 10, passed: 8, failed: 1, skipped: 1, findings: []},
      {name: "b", totalTests: 5, passed: 5, failed: 0, skipped: 0, findings: []},
    ];
    const out = aggregateSuites(suites);
    expect(out.totalTests).toBe(15);
    expect(out.passed).toBe(13);
    expect(out.failed).toBe(1);
    expect(out.skipped).toBe(1);
    expect(out.suites).toBe(suites);
  });
});

describe("flattenSuiteFindings", () => {
  it("concatenates findings across suites preserving order", () => {
    const suites: SuiteResult[] = [
      {name: "a", totalTests: 1, passed: 0, failed: 1, skipped: 0, findings: [
        {kind: "line", severity: "error", file: "a.ts", line: 1, column: 1, message: "first"},
      ]},
      {name: "b", totalTests: 1, passed: 0, failed: 1, skipped: 0, findings: [
        {kind: "line", severity: "error", file: "b.ts", line: 1, column: 1, message: "second"},
      ]},
    ];
    const out = flattenSuiteFindings(suites);
    expect(out).toHaveLength(2);
    expect(out[0]?.kind === "line" && out[0].file).toBe("a.ts");
    expect(out[1]?.kind === "line" && out[1].file).toBe("b.ts");
  });
});
