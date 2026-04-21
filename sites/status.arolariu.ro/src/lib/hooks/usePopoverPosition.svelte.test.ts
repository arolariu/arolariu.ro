import {flushSync} from "svelte";
import {afterEach, describe, expect, it, vi} from "vitest";
import {computePopoverPosition, usePopoverPosition} from "./usePopoverPosition.svelte";

function mkRect(top: number, left: number, width: number) {
  return {top, left, width};
}

const viewport = (scrollX = 0, scrollY = 0, innerWidth = 1200) => ({
  scrollX,
  scrollY,
  innerWidth,
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

describe("usePopoverPosition (reactive hook)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns zero position when active but anchor is null", () => {
    vi.stubGlobal("window", {
      scrollX: 0,
      scrollY: 0,
      innerWidth: 1200,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const root = $effect.root(() => {
      const getPos = usePopoverPosition(
        () => null, // anchor is null
        () => null,
        () => true, // active = true
      );
      flushSync();
      // Recompute runs but exits early at `if (!el) return`
      expect(getPos()).toEqual({top: 0, left: 0, flipHoriz: false});
    });
    root();
  });

  it("returns initial zero position when inactive", () => {
    const root = $effect.root(() => {
      const anchor = () => null;
      const tooltipEl = () => null;
      const active = () => false;
      const getPos = usePopoverPosition(anchor, tooltipEl, active);
      flushSync();
      const pos = getPos();
      expect(pos).toEqual({top: 0, left: 0, flipHoriz: false});
    });
    root();
  });

  it("computes position when active and anchor is available", () => {
    vi.stubGlobal("window", {
      scrollX: 0,
      scrollY: 0,
      innerWidth: 1200,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const anchorEl = {
      getBoundingClientRect: () => ({top: 100, left: 300, width: 80}),
      offsetWidth: 80,
    } as unknown as HTMLElement;

    const tooltipEl = {
      offsetWidth: 200,
    } as unknown as HTMLElement;

    const root = $effect.root(() => {
      let isActive = $state(false);
      let currentAnchor = $state<HTMLElement | null>(null);

      const getPos = usePopoverPosition(
        () => currentAnchor,
        () => tooltipEl,
        () => isActive,
        200,
      );

      flushSync();
      expect(getPos()).toEqual({top: 0, left: 0, flipHoriz: false});

      // Activate with anchor
      currentAnchor = anchorEl;
      isActive = true;
      flushSync();

      const pos = getPos();
      // top = 100 + 0 - 8 = 92; left = 300 + 40 + 0 = 340
      expect(pos.top).toBe(92);
      expect(pos.left).toBe(340);
      expect(pos.flipHoriz).toBe(false);
    });
    root();
  });

  it("uses fallback width when tooltipEl is null", () => {
    vi.stubGlobal("window", {
      scrollX: 0,
      scrollY: 0,
      innerWidth: 1200,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const anchorEl = {
      getBoundingClientRect: () => ({top: 50, left: 100, width: 60}),
    } as unknown as HTMLElement;

    const root = $effect.root(() => {
      let isActive = $state(true);
      void isActive;

      const getPos = usePopoverPosition(
        () => anchorEl,
        () => null,
        () => true,
        280, // fallback width
      );

      flushSync();
      const pos = getPos();
      // Should use fallback 280, not crash
      expect(pos.top).toBe(42); // 50 + 0 - 8
      expect(typeof pos.left).toBe("number");
    });
    root();
  });

  it("deregisters scroll/resize listeners when deactivated", () => {
    const removeListener = vi.fn();
    vi.stubGlobal("window", {
      scrollX: 0,
      scrollY: 0,
      innerWidth: 1200,
      addEventListener: vi.fn(),
      removeEventListener: removeListener,
    });

    const anchorEl = {
      getBoundingClientRect: () => ({top: 50, left: 100, width: 60}),
    } as unknown as HTMLElement;

    const root = $effect.root(() => {
      let isActive = $state(true);

      usePopoverPosition(
        () => anchorEl,
        () => null,
        () => isActive,
      );

      flushSync();
      // Deactivate — should trigger cleanup
      isActive = false;
      flushSync();

      // removeEventListener should have been called for cleanup
      expect(removeListener).toHaveBeenCalled();
    });
    root();
  });
});
