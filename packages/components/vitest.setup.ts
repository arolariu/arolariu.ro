import {afterEach} from "vitest";

if (typeof document !== "undefined") {
  const {cleanup} = await import("@testing-library/react");
  await import("@testing-library/jest-dom/vitest");

  // Happy DOM's native cancellation rejects Motion's animation promises; use its supported JS fallback in DOM tests.
  if (!Reflect.deleteProperty(Element.prototype, "animate")) {
    throw new Error("Could not disable the unsupported Happy DOM animation boundary");
  }

  afterEach(() => {
    cleanup();
    globalThis.localStorage.clear();
    globalThis.sessionStorage.clear();
  });
}
