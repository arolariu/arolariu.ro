import {existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {beforeAll, describe, expect, it} from "vitest";
import {evaluateGate as evaluateLegacyGate} from "../../src/hygiene/domain/types.ts";

let contracts: typeof import("./contracts.ts") | undefined;

beforeAll(async () => {
  const url = new URL("./contracts.ts", import.meta.url);
  if (existsSync(fileURLToPath(url))) contracts = await import(url.href);
});

describe("shared hygiene contracts", () => {
  it("retains severity-based gate decisions through both supported import paths", () => {
    expect(contracts?.evaluateGate).toBeTypeOf("function");
    if (!contracts) return;
    const finding = {kind: "file", severity: "error", file: "a.ts", message: "Invalid source"} as const;
    expect(contracts.evaluateGate({kind: "blocking", blockOn: "warning"}, [finding])).toBe("failed");
    expect(evaluateLegacyGate({kind: "blocking", blockOn: "warning"}, [finding])).toBe("failed");
  });

  it("keeps advisory and informational policy independent of finding severity", () => {
    expect(contracts?.evaluateGate).toBeTypeOf("function");
    if (!contracts) return;
    const finding = {kind: "file", severity: "critical", file: "a.ts", message: "Diagnostic"} as const;
    expect(contracts.evaluateGate({kind: "advisory"}, [finding])).toBe("advisory");
    expect(contracts.evaluateGate({kind: "informational"}, [finding])).toBe("passed");
  });
});
