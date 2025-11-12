/**
 * Unit tests for intersection observer Svelte action
 * Tests viewport detection, callbacks, and lifecycle management
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {intersect} from "./intersection";

describe("intersect action", () => {
  let element: HTMLElement;
  let mockObserver: {
    observe: ReturnType<typeof vi.fn>;
    unobserve: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };

  // Helper to create mock IntersectionObserverEntry
  const createMockEntry = (target: Element, isIntersecting: boolean): IntersectionObserverEntry => {
    return {
      target,
      isIntersecting,
      intersectionRatio: isIntersecting ? 0.5 : 0,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: Date.now(),
    } as IntersectionObserverEntry;
  };

  beforeEach(() => {
    element = document.createElement("div");
    document.body.appendChild(element);

    // Create mock observer
    mockObserver = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };

    // Mock IntersectionObserver as a spy-able constructor
    global.IntersectionObserver = vi.fn(function (callback: IntersectionObserverCallback) {
      // Store callback for manual triggering
      (mockObserver as any).callback = callback;
      return mockObserver;
    }) as any;
  });

  afterEach(() => {
    document.body.removeChild(element);
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should create IntersectionObserver on init", () => {
      intersect(element);

      expect(IntersectionObserver).toHaveBeenCalledTimes(1);
    });

    it("should observe the element", () => {
      intersect(element);

      expect(mockObserver.observe).toHaveBeenCalledWith(element);
    });

    it("should use default options when none provided", () => {
      intersect(element);

      expect(IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          threshold: 0.1,
          root: null,
          rootMargin: "0px",
        }),
      );
    });

    it("should accept custom threshold", () => {
      intersect(element, {threshold: 0.5});

      expect(IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          threshold: 0.5,
        }),
      );
    });

    it("should accept threshold array", () => {
      intersect(element, {threshold: [0, 0.25, 0.5, 0.75, 1]});

      expect(IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          threshold: [0, 0.25, 0.5, 0.75, 1],
        }),
      );
    });

    it("should accept custom rootMargin", () => {
      intersect(element, {rootMargin: "10px"});

      expect(IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          rootMargin: "10px",
        }),
      );
    });

    it("should accept custom root element", () => {
      const root = document.createElement("div");
      intersect(element, {root});

      expect(IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          root,
        }),
      );
    });
  });

  describe("onEnter callback", () => {
    it("should call onEnter when element intersects", () => {
      const onEnter = vi.fn();
      intersect(element, {onEnter});

      const entry = createMockEntry(element, true);
      (mockObserver as any).callback([entry]);

      expect(onEnter).toHaveBeenCalledTimes(1);
      expect(onEnter).toHaveBeenCalledWith(entry);
    });

    it("should not call onEnter when element is not intersecting", () => {
      const onEnter = vi.fn();
      intersect(element, {onEnter});

      const entry = createMockEntry(element, false);
      (mockObserver as any).callback([entry]);

      expect(onEnter).not.toHaveBeenCalled();
    });

    it("should not call onEnter for different element", () => {
      const onEnter = vi.fn();
      const otherElement = document.createElement("div");
      intersect(element, {onEnter});

      const entry = createMockEntry(otherElement, true);
      (mockObserver as any).callback([entry]);

      expect(onEnter).not.toHaveBeenCalled();
    });

    it("should handle multiple intersections with once:false", () => {
      const onEnter = vi.fn();
      intersect(element, {onEnter, once: false});

      const entry = createMockEntry(element, true);
      (mockObserver as any).callback([entry]);
      (mockObserver as any).callback([entry]);

      expect(onEnter).toHaveBeenCalledTimes(2);
    });
  });

  describe("onLeave callback", () => {
    it("should call onLeave when element leaves viewport", () => {
      const onLeave = vi.fn();
      intersect(element, {onLeave});

      const entry = createMockEntry(element, false);
      (mockObserver as any).callback([entry]);

      expect(onLeave).toHaveBeenCalledTimes(1);
      expect(onLeave).toHaveBeenCalledWith(entry);
    });

    it("should not call onLeave when element is intersecting", () => {
      const onLeave = vi.fn();
      intersect(element, {onLeave});

      const entry = createMockEntry(element, true);
      (mockObserver as any).callback([entry]);

      expect(onLeave).not.toHaveBeenCalled();
    });
  });

  describe("once option", () => {
    it("should unobserve after first intersection when once:true (default)", () => {
      intersect(element, {once: true});

      const entry = createMockEntry(element, true);
      (mockObserver as any).callback([entry]);

      expect(mockObserver.unobserve).toHaveBeenCalledWith(element);
    });

    it("should unobserve by default without explicit once option", () => {
      intersect(element);

      const entry = createMockEntry(element, true);
      (mockObserver as any).callback([entry]);

      expect(mockObserver.unobserve).toHaveBeenCalledWith(element);
    });

    it("should not unobserve when once:false", () => {
      intersect(element, {once: false});

      const entry = createMockEntry(element, true);
      (mockObserver as any).callback([entry]);

      expect(mockObserver.unobserve).not.toHaveBeenCalled();
    });

    it("should not unobserve on leave event", () => {
      intersect(element, {once: true});

      const entry = createMockEntry(element, false);
      (mockObserver as any).callback([entry]);

      expect(mockObserver.unobserve).not.toHaveBeenCalled();
    });
  });

  describe("update method", () => {
    it("should update callbacks without recreating observer", () => {
      const onEnter1 = vi.fn();
      const onEnter2 = vi.fn();

      const action = intersect(element, {onEnter: onEnter1});

      // Clear the initial observer creation
      vi.clearAllMocks();

      action.update({onEnter: onEnter2});

      // Should not create new observer
      expect(IntersectionObserver).not.toHaveBeenCalled();

      // Trigger intersection with new callback
      const entry = createMockEntry(element, true);
      (mockObserver as any).callback([entry]);

      expect(onEnter1).not.toHaveBeenCalled();
      expect(onEnter2).toHaveBeenCalledWith(entry);
    });

    it("should recreate observer when threshold changes", () => {
      const action = intersect(element, {threshold: 0.1});

      vi.clearAllMocks();

      action.update({threshold: 0.5});

      expect(mockObserver.disconnect).toHaveBeenCalled();
      expect(IntersectionObserver).toHaveBeenCalled();
    });

    it("should recreate observer when rootMargin changes", () => {
      const action = intersect(element, {rootMargin: "0px"});

      vi.clearAllMocks();

      action.update({rootMargin: "10px"});

      expect(mockObserver.disconnect).toHaveBeenCalled();
      expect(IntersectionObserver).toHaveBeenCalled();
    });

    it("should recreate observer when root changes", () => {
      const root1 = document.createElement("div");
      const root2 = document.createElement("div");

      const action = intersect(element, {root: root1});

      vi.clearAllMocks();

      action.update({root: root2});

      expect(mockObserver.disconnect).toHaveBeenCalled();
      expect(IntersectionObserver).toHaveBeenCalled();
    });

    it("should recreate observer when once changes", () => {
      const action = intersect(element, {once: true});

      vi.clearAllMocks();

      action.update({once: false});

      expect(mockObserver.disconnect).toHaveBeenCalled();
      expect(IntersectionObserver).toHaveBeenCalled();
    });

    it("should not recreate observer when only callbacks change", () => {
      const onEnter1 = vi.fn();
      const onEnter2 = vi.fn();
      const onLeave1 = vi.fn();
      const onLeave2 = vi.fn();

      const action = intersect(element, {onEnter: onEnter1, onLeave: onLeave1});

      vi.clearAllMocks();

      action.update({onEnter: onEnter2, onLeave: onLeave2});

      expect(mockObserver.disconnect).not.toHaveBeenCalled();
      expect(IntersectionObserver).not.toHaveBeenCalled();
    });
  });

  describe("destroy method", () => {
    it("should disconnect observer on destroy", () => {
      const action = intersect(element);

      action.destroy();

      expect(mockObserver.disconnect).toHaveBeenCalled();
    });

    it("should handle multiple destroy calls", () => {
      const action = intersect(element);

      action.destroy();
      action.destroy();

      expect(mockObserver.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe("multiple entries", () => {
    it("should handle multiple entries in callback", () => {
      const onEnter = vi.fn();
      intersect(element, {onEnter, once: false});

      const entry1 = createMockEntry(element, true);
      const entry2 = createMockEntry(element, true);

      (mockObserver as any).callback([entry1, entry2]);

      expect(onEnter).toHaveBeenCalledTimes(2);
    });

    it("should ignore entries for wrong element", () => {
      const onEnter = vi.fn();
      const otherElement = document.createElement("div");
      intersect(element, {onEnter});

      const entry1 = createMockEntry(element, true);
      const entry2 = createMockEntry(otherElement, true);

      (mockObserver as any).callback([entry1, entry2]);

      expect(onEnter).toHaveBeenCalledTimes(1);
      expect(onEnter).toHaveBeenCalledWith(entry1);
    });
  });

  describe("edge cases", () => {
    it("should handle no callbacks provided", () => {
      intersect(element);

      const entry = createMockEntry(element, true);

      expect(() => (mockObserver as any).callback([entry])).not.toThrow();
    });

    it("should handle update with no parameters", () => {
      const action = intersect(element, {threshold: 0.5});

      expect(() => action.update({})).not.toThrow();
    });

    it("should maintain observer after non-structural update", () => {
      const action = intersect(element);
      const initialObserver = mockObserver;

      action.update({onEnter: vi.fn()});

      // Should be same observer instance (not recreated)
      expect(mockObserver.disconnect).not.toHaveBeenCalled();
      expect(mockObserver).toBe(initialObserver);
    });
  });
});
