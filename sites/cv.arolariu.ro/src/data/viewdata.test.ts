import {describe, expect, it} from "vitest";

import {ui} from "./viewdata";

describe("ui string catalog", () => {
  it("is frozen at runtime", () => {
    expect(Object.isFrozen(ui)).toBe(true);
  });

  it("has all the major categories", () => {
    expect(ui.navigation).toBeTypeOf("object");
    expect(ui.buttons).toBeTypeOf("object");
    expect(ui.labels).toBeTypeOf("object");
    expect(ui.placeholders).toBeTypeOf("object");
    expect(ui.status).toBeTypeOf("object");
    expect(ui.formats).toBeTypeOf("object");
  });

  it("exposes the button labels read by /json copy/download", () => {
    expect(ui.buttons["copy"]).toBeTypeOf("string");
    expect(ui.buttons["copied"]).toBeTypeOf("string");
    expect(ui.buttons["download"]).toBeTypeOf("string");
  });
});
