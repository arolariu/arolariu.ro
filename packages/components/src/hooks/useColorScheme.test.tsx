import {renderHook} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {useColorScheme} from "./useColorScheme";

describe("useColorScheme", () => {
  it.each(["light", "dark"] as const)("returns %s when the system prefers it", (scheme) => {
    const {device} = window.happyDOM.settings;
    const original = device.prefersColorScheme;
    device.prefersColorScheme = scheme;
    try {
      const {result} = renderHook(useColorScheme);

      expect(result.current).toBe(scheme);
    } finally {
      device.prefersColorScheme = original;
    }
  });
});
