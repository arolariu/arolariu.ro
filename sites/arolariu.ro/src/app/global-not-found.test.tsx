/**
 * @fileoverview Unit tests for the global 404 document's route-segment exports.
 * @module app/global-not-found.test
 *
 * @remarks
 * `global-not-found.tsx` renders its own `<html>` document and bypasses the root layout, so it must export the shared
 * viewport itself for Next.js to emit `viewport-fit=cover` on the 404 page.
 */

import {viewport as sharedViewport} from "@/metadata";
import {describe, expect, it} from "vitest";
import * as globalNotFound from "./global-not-found";

describe("global-not-found", () => {
  it("exports the shared viewport so the 404 document extends into the safe areas", () => {
    // Assert
    expect(globalNotFound).toHaveProperty("viewport", sharedViewport);
    expect(globalNotFound).toHaveProperty("viewport.viewportFit", "cover");
  });
});
