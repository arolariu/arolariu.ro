import {describe, expect, it} from "vitest";

import {cx} from "./classNames";

describe("cx", () => {
  it("joins truthy class names in order", () => {
    expect(cx("root", "active", "large")).toBe("root active large");
  });

  it("omits falsey class names", () => {
    expect(cx("root", false, undefined, null, "", "active")).toBe("root active");
  });

  it("preserves external class strings for component class passthrough", () => {
    expect(cx("module_hash", "external-class")).toBe("module_hash external-class");
  });
});
