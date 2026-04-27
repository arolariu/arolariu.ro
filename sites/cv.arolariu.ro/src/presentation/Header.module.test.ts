import {describe, expect, it} from "vitest";

import styles from "./Header.module.scss";

describe("Header styles", () => {
  it("exports a class for every Header variant", () => {
    expect(styles.default).toBeTypeOf("string");
    expect(styles.default.length).toBeGreaterThan(0);
    expect(styles.inverse).toBeTypeOf("string");
    expect(styles.inverse.length).toBeGreaterThan(0);
  });
});
