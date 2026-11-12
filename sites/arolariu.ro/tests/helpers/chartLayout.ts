/**
 * @fileoverview Browser-layout shim that lets Recharts charts render under happy-dom.
 * @module tests/helpers/chartLayout
 *
 * @remarks
 * happy-dom does not perform layout, so every element measures 0x0 and Recharts'
 * `ResponsiveContainer` renders no SVG. {@link installChartLayout} stubs only the
 * measurement getters Recharts reads. The spies are restored automatically by the
 * Vitest `restoreMocks` setting, so call it from `beforeEach` (or inside each test).
 */

import {act, fireEvent} from "@testing-library/react";
import {vi} from "vitest";

/** Rendered chart dimensions used when no explicit size is supplied. */
export const DEFAULT_CHART_SIZE = {width: 600, height: 400} as const;

/**
 * Gives every element a fixed layout box so Recharts can measure its container.
 *
 * @param width - Width in pixels reported for every element.
 * @param height - Height in pixels reported for every element.
 */
export function installChartLayout(width: number = DEFAULT_CHART_SIZE.width, height: number = DEFAULT_CHART_SIZE.height): void {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(width);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(height);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(width);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(height);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, width, height));
}

/**
 * Moves the pointer over a rendered Recharts chart so its tooltip content renders.
 *
 * @param container - Element containing the chart (usually the `render` container).
 * @param point - Pointer coordinates relative to the chart's top-left corner.
 * @throws {Error} When no chart wrapper rendered (for example, the layout shim is missing).
 */
export async function hoverChart(
  container: ParentNode,
  point: Readonly<{x: number; y: number}> = {x: DEFAULT_CHART_SIZE.width / 2, y: DEFAULT_CHART_SIZE.height / 3},
): Promise<void> {
  const wrapper = container.querySelector(".recharts-wrapper");
  if (wrapper === null) {
    throw new Error("No .recharts-wrapper rendered; call installChartLayout() before rendering the chart.");
  }

  fireEvent.mouseMove(wrapper, {clientX: point.x, clientY: point.y});
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
  });
}
