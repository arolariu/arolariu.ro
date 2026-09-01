// @vitest-environment node
/**
 * @fileoverview Contract tests for central diagnostic helpers.
 * @module scripts.doctor.diagnostics.test
 */

import {describe, expect, it} from "vitest";

import {
  boundEvidence,
  boundCommandExcerpt,
  normalizeErrorForReport,
  classifyCommandOutcome,
  passDiagnostic,
  warnDiagnostic,
  failDiagnostic,
  skippedDiagnostic as skipDiagnosticFactory,
  STANDARD_EVIDENCE_LIMIT,
  VERBOSE_EVIDENCE_LIMIT,
  EVIDENCE_ENTRY_MAX_CHARS,
  COMMAND_EXCERPT_MAX_CHARS,
} from "./doctor.diagnostics.ts";

// ============================================================================
// Evidence bounding constants
// ============================================================================

describe("evidence bounding constants", () => {
  it("exports STANDARD_EVIDENCE_LIMIT as 5", () => {
    expect(STANDARD_EVIDENCE_LIMIT).toBe(5);
  });

  it("exports VERBOSE_EVIDENCE_LIMIT as 20", () => {
    expect(VERBOSE_EVIDENCE_LIMIT).toBe(20);
  });

  it("exports EVIDENCE_ENTRY_MAX_CHARS as 500", () => {
    expect(EVIDENCE_ENTRY_MAX_CHARS).toBe(500);
  });

  it("exports COMMAND_EXCERPT_MAX_CHARS as 2000", () => {
    expect(COMMAND_EXCERPT_MAX_CHARS).toBe(2_000);
  });
});

// ============================================================================
// boundEvidence
// ============================================================================

describe("boundEvidence", () => {
  it("retains all entries when count is within normal limit", () => {
    const entries = ["a", "b", "c"];
    const result = boundEvidence(entries, false);
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("retains at most 5 entries in normal mode with omitted-count summary", () => {
    const entries = Array.from({length: 10}, (_, i) => `entry-${String(i)}`);
    const result = boundEvidence(entries, false);
    expect(result).toHaveLength(5);
    expect(result[0]).toBe("entry-0");
    expect(result[result.length - 1]).toMatch(/6.*omitted/i);
  });

  it("retains at most 20 entries in verbose mode with omitted-count summary", () => {
    const entries = Array.from({length: 30}, (_, i) => `entry-${String(i)}`);
    const result = boundEvidence(entries, true);
    expect(result).toHaveLength(20);
    expect(result[result.length - 1]).toMatch(/11.*omitted/i);
  });

  it("truncates individual entries longer than 500 characters", () => {
    const longEntry = "x".repeat(600);
    const result = boundEvidence([longEntry], false);
    expect(result[0]!.length).toBeLessThanOrEqual(EVIDENCE_ENTRY_MAX_CHARS);
  });

  it("bounds 10,000-entry evidence to at most 5 entries in normal mode", () => {
    const entries = Array.from({length: 10_000}, (_, i) => `entry-${String(i)}`);
    const result = boundEvidence(entries, false);
    expect(result.length).toBeLessThanOrEqual(STANDARD_EVIDENCE_LIMIT);
    // Must include deterministic omitted-count summary
    expect(result[result.length - 1]).toMatch(/9996.*omitted/i);
  });

  it("bounds 10,000-entry evidence to at most 20 entries in verbose mode", () => {
    const entries = Array.from({length: 10_000}, (_, i) => `entry-${String(i)}`);
    const result = boundEvidence(entries, true);
    expect(result.length).toBeLessThanOrEqual(VERBOSE_EVIDENCE_LIMIT);
    expect(result[result.length - 1]).toMatch(/omitted/i);
  });

  it("each retained entry is at most 500 chars for a 10,000-entry evidence set", () => {
    const entries = Array.from({length: 10_000}, (_, i) => "x".repeat(600) + String(i));
    const result = boundEvidence(entries, false);
    for (const entry of result) {
      expect(entry.length).toBeLessThanOrEqual(EVIDENCE_ENTRY_MAX_CHARS);
    }
  });

  it("preserves non-empty, ANSI-free strings as-is when within limits", () => {
    const result = boundEvidence(["clean string"], false);
    expect(result).toEqual(["clean string"]);
  });

  it("returns empty array for empty input", () => {
    expect(boundEvidence([], false)).toEqual([]);
  });
});

// ============================================================================
// boundCommandExcerpt
// ============================================================================

describe("boundCommandExcerpt", () => {
  it("returns short output unchanged", () => {
    expect(boundCommandExcerpt("short")).toBe("short");
  });

  it("truncates output longer than 2000 characters", () => {
    const long = "x".repeat(3000);
    const result = boundCommandExcerpt(long);
    expect(result.length).toBeLessThanOrEqual(COMMAND_EXCERPT_MAX_CHARS);
  });

  it("returns empty string for empty input", () => {
    expect(boundCommandExcerpt("")).toBe("");
  });
});

// ============================================================================
// normalizeErrorForReport
// ============================================================================

describe("normalizeErrorForReport", () => {
  it("extracts message from an Error", () => {
    expect(normalizeErrorForReport(new Error("boom"), "fallback")).toBe("boom");
  });

  it("strips ANSI sequences", () => {
    const result = normalizeErrorForReport(new Error("\u001B[31mred\u001B[0m"), "fallback");
    expect(result).toBe("red");
    expect(result).not.toMatch(/\u001B/);
  });

  it("falls back for empty message", () => {
    expect(normalizeErrorForReport(new Error(""), "fallback text")).toBe("fallback text");
  });

  it("falls back for whitespace-only message", () => {
    expect(normalizeErrorForReport(new Error("   "), "fallback text")).toBe("fallback text");
  });

  it("stringifies a non-Error thrown value", () => {
    expect(normalizeErrorForReport(42, "fallback")).toBe("42");
  });
});

// ============================================================================
// classifyCommandOutcome
// ============================================================================

describe("classifyCommandOutcome", () => {
  it("classifies a successful command as 'success'", () => {
    const result = classifyCommandOutcome({code: 0, stdout: "ok", stderr: "", durationMs: 1, timedOut: false});
    expect(result).toBe("success");
  });

  it("classifies an absent command (spawn error) as 'missing'", () => {
    const result = classifyCommandOutcome({code: 1, stdout: "", stderr: "", durationMs: 1, timedOut: false, spawnError: "ENOENT"});
    expect(result).toBe("missing");
  });

  it("classifies a non-zero exit as 'failure'", () => {
    const result = classifyCommandOutcome({code: 1, stdout: "", stderr: "", durationMs: 1, timedOut: false});
    expect(result).toBe("failure");
  });

  it("classifies a timeout as 'failure'", () => {
    const result = classifyCommandOutcome({code: 1, stdout: "", stderr: "", durationMs: 1, timedOut: true});
    expect(result).toBe("failure");
  });
});

// ============================================================================
// Diagnostic factories
// ============================================================================

describe("passDiagnostic", () => {
  it("creates a pass result with the correct structure", () => {
    const result = passDiagnostic({
      id: "workspace.repository-root",
      module: "workspace",
      name: "Repository root",
      summary: "Root detected.",
    });
    expect(result.status).toBe("pass");
    expect(result.id).toBe("workspace.repository-root");
    expect(result.evidence).toEqual([]);
    expect(result.durationMs).toBe(0);
  });
});

describe("warnDiagnostic", () => {
  it("creates a warn result with evidence and fixes", () => {
    const result = warnDiagnostic({
      id: "workspace.repository-root",
      module: "workspace",
      name: "Repository root",
      summary: "Root is degraded.",
      evidence: ["something happened"],
      potentialCauses: [{cause: "missing file", confidence: "high"}],
      fixes: [{description: "fix it"}],
    });
    expect(result.status).toBe("warn");
    expect(result.evidence).toEqual(["something happened"]);
  });
});

describe("failDiagnostic", () => {
  it("creates a fail result with evidence and rootCause", () => {
    const result = failDiagnostic({
      id: "workspace.repository-root",
      module: "workspace",
      name: "Repository root",
      summary: "Root is broken.",
      evidence: ["error output"],
      rootCause: "missing dir",
      fixes: [{description: "fix it"}],
    });
    expect(result.status).toBe("fail");
    expect(result.rootCause).toBe("missing dir");
  });
});

describe("skipDiagnosticFactory", () => {
  it("creates a skipped result", () => {
    const result = skipDiagnosticFactory({
      id: "workspace.repository-root",
      module: "workspace",
      name: "Repository root",
      summary: "Skipped.",
    });
    expect(result.status).toBe("skipped");
    expect(result.durationMs).toBe(0);
  });
});
