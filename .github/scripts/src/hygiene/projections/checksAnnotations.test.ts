import {describe, it, expect, vi} from "vitest";
import {findingsToAnnotations, batchAnnotations, postAnnotations} from "./checksAnnotations.ts";
import type {Finding} from "../domain/types.ts";

describe("findingsToAnnotations", () => {
  it("maps LineFindings to annotations", () => {
    const findings: Finding[] = [
      {kind: "line", severity: "error", file: "src/a.ts", line: 5, column: 3, message: "bad", ruleId: "r1"},
      {kind: "line", severity: "warning", file: "src/b.ts", line: 1, column: 1, message: "meh"},
    ];
    const ann = findingsToAnnotations(findings);
    expect(ann).toHaveLength(2);
    expect(ann[0]).toMatchObject({
      path: "src/a.ts",
      start_line: 5,
      end_line: 5,
      annotation_level: "failure",
      message: "bad",
      title: "r1",
    });
    expect(ann[1]?.annotation_level).toBe("warning");
  });

  it("ignores non-LineFindings", () => {
    const findings: Finding[] = [
      {kind: "file", severity: "warning", file: "x.ts", message: "fmt"},
      {kind: "metric", severity: "info", name: "x", value: 1, message: "y"},
    ];
    expect(findingsToAnnotations(findings)).toEqual([]);
  });

  it("maps severities to annotation levels", () => {
    const make = (s: Finding["severity"]): Finding => ({kind: "line", severity: s, file: "x", line: 1, column: 1, message: "m"});
    const out = findingsToAnnotations([make("info"), make("notice"), make("warning"), make("error"), make("critical")]);
    expect(out.map((a) => a.annotation_level)).toEqual(["notice", "notice", "warning", "failure", "failure"]);
  });
});

describe("batchAnnotations", () => {
  it("splits into chunks of 50", () => {
    const items = Array.from({length: 130}, (_, i) => ({
      path: "x", start_line: i, end_line: i,
      annotation_level: "warning" as const, message: String(i),
    }));
    const batches = batchAnnotations(items, 50);
    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(50);
    expect(batches[1]).toHaveLength(50);
    expect(batches[2]).toHaveLength(30);
  });
});

describe("postAnnotations", () => {
  it("calls update once per batch", async () => {
    const update = vi.fn().mockResolvedValue({});
    const items = Array.from({length: 75}, (_, i) => ({
      path: "x", start_line: i, end_line: i,
      annotation_level: "warning" as const, message: String(i),
    }));
    await postAnnotations(items, {checkRunId: 1, owner: "o", repo: "r", update});
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("no-ops on empty input", async () => {
    const update = vi.fn();
    await postAnnotations([], {checkRunId: 1, owner: "o", repo: "r", update});
    expect(update).not.toHaveBeenCalled();
  });
});
