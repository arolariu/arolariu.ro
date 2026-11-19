import {beforeEach} from "vitest";

if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");

  beforeEach(() => {
    localStorage.clear();
  });
}
