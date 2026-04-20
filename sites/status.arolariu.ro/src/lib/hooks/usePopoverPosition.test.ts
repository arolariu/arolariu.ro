import {describe, it, expect} from "vitest";
import {computePopoverPosition} from "./usePopoverPosition.svelte";

function mkRect(top: number, left: number, width: number) {
  return {top, left, width};
}

const viewport = (scrollX = 0, scrollY = 0, innerWidth = 1200) => ({
  scrollX, scrollY, innerWidth,
});

describe("computePopoverPosition", () => {
  it("centres horizontally on the anchor when there's room on the right", () => {
    // Anchor at left=100, width=40 → centre at x=120.
    // Tooltip width 280 → right edge at 120 + 140 = 260, well under 1200 - 8.
    const pos = computePopoverPosition(mkRect(50, 100, 40), 280, viewport());
    expect(pos.left).toBe(120);
    expect(pos.flipHoriz).toBe(false);
  });

  it("sits 8px above the anchor top (page-relative) for tooltip-above layout", () => {
    const pos = computePopoverPosition(mkRect(100, 500, 40), 280, viewport(0, 200));
    // top = anchorTop (100) + scrollY (200) - 8 = 292
    expect(pos.top).toBe(292);
  });

  it("clamps left so the tooltip's right edge stays within the viewport", () => {
    // Anchor near the right edge: x-centre at 1180, tooltip half-width 140 →
    // right edge would be 1320, viewport inner width 1200 (right limit 1192).
    // Clamp left to viewportRight (1192) - tipWidth/2 (140) = 1052.
    const pos = computePopoverPosition(mkRect(50, 1160, 40), 280, viewport());
    expect(pos.flipHoriz).toBe(true);
    expect(pos.left).toBe(1052);
  });

  it("handles tooltips wider than the viewport (clamps to the right edge)", () => {
    // Pathological very-wide tooltip: desiredLeft=520, viewportRight=592,
    // clampedLeft = min(520, 592 - 1000) = -408. The left edge goes negative
    // — acceptable since the content can overflow off the viewport start;
    // the important invariant is that `flipHoriz` is true so the arrow and
    // any bespoke right-edge alignment kick in.
    const pos = computePopoverPosition(mkRect(50, 500, 40), 2000, viewport(0, 0, 600));
    expect(pos.flipHoriz).toBe(true);
    expect(pos.left).toBe(-408);
  });

  it("uses the provided scrollX/innerWidth for the viewport-right math", () => {
    // scrollX shifts the right edge to the right, so more room.
    const pos = computePopoverPosition(mkRect(50, 1160, 40), 280, viewport(300, 0, 1200));
    // desiredLeft = 1180 + 300 = 1480; viewportRight = 300 + 1200 - 8 = 1492;
    // right edge of tooltip = 1480 + 140 = 1620 > 1492 → flip.
    expect(pos.flipHoriz).toBe(true);
    // Clamped left = min(1480, 1492 - 140) = 1352.
    expect(pos.left).toBe(1352);
  });
});
