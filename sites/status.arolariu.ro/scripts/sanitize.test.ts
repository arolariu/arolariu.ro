import {describe, it, expect} from "vitest";
import {sanitizeDescription} from "./sanitize";

describe("sanitizeDescription", () => {
  it("returns undefined for undefined input", () => {
    expect(sanitizeDescription(undefined)).toBeUndefined();
  });

  it("strips URLs", () => {
    expect(sanitizeDescription("check https://db.example.com:443 failed"))
      .toBe("check  failed");
  });

  it("strips password= tokens case-insensitively", () => {
    expect(sanitizeDescription("conn err password=hunter2")).toBe("conn err ");
    expect(sanitizeDescription("Password=X Y Z")).toBe(" Y Z");
  });

  it("strips key= tokens", () => {
    expect(sanitizeDescription("auth failed key=abc123 reason"))
      .toBe("auth failed  reason");
  });

  it("truncates to 200 chars with ellipsis", () => {
    const long = "x".repeat(250);
    const out = sanitizeDescription(long)!;
    expect(out.length).toBe(201);
    expect(out.endsWith("…")).toBe(true);
  });

  it("preserves short safe strings", () => {
    expect(sanitizeDescription("connection pool exhausted"))
      .toBe("connection pool exhausted");
  });
});
