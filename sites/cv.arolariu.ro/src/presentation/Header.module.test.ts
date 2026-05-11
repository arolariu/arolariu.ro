import {describe, expect, it} from "vitest";

import styles from "./Header.module.scss";

describe("Header styles", () => {
  it("exports a class for every Header variant", () => {
    const defaultClass = styles["default"];
    const inverseClass = styles["inverse"];
    expect(defaultClass).toBeTypeOf("string");
    expect(defaultClass).toBeDefined();
    expect((defaultClass ?? "").length).toBeGreaterThan(0);
    expect(inverseClass).toBeTypeOf("string");
    expect(inverseClass).toBeDefined();
    expect((inverseClass ?? "").length).toBeGreaterThan(0);
  });
});
