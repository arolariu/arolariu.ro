/**
 * @fileoverview Unit tests for the DeferredMount primitive.
 * @module sites/arolariu.ro/src/app/domains/invoices/_components/DeferredMount.test
 *
 * @remarks
 * Pins the IntersectionObserver contract for DeferredMount:
 * 1. Initial render shows the placeholder, not the children.
 * 2. On first intersection, children replace the placeholder and the
 *    observer disconnects.
 * 3. When IntersectionObserver is unavailable, children render immediately
 *    (graceful degradation for very old WebViews).
 */

import {act, render} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import DeferredMount from "./DeferredMount";

type Callback = (entries: ReadonlyArray<{isIntersecting: boolean}>) => void;

const {observerInstances, originalIntersectionObserver} = vi.hoisted(() => ({
  observerInstances: [] as Array<{
    callback: Callback;
    observe: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    observedElement: Element | null;
  }>,
  originalIntersectionObserver: globalThis.IntersectionObserver as
    | typeof IntersectionObserver
    | undefined,
}));

function installIntersectionObserverMock(): void {
  observerInstances.length = 0;

  class MockIntersectionObserver {
    public observe: ReturnType<typeof vi.fn>;
    public disconnect: ReturnType<typeof vi.fn>;
    public observedElement: Element | null = null;
    public readonly callback: Callback;

    constructor(callback: Callback) {
      this.callback = callback;
      const instance = {
        callback,
        observe: vi.fn((el: Element) => {
          this.observedElement = el;
          instance.observedElement = el;
        }),
        disconnect: vi.fn(),
        observedElement: null as Element | null,
      };
      this.observe = instance.observe;
      this.disconnect = instance.disconnect;
      observerInstances.push(instance);
    }
  }

  Object.defineProperty(globalThis, "IntersectionObserver", {
    value: MockIntersectionObserver,
    writable: true,
    configurable: true,
  });
}

function uninstallIntersectionObserverMock(): void {
  if (originalIntersectionObserver) {
    Object.defineProperty(globalThis, "IntersectionObserver", {
      value: originalIntersectionObserver,
      writable: true,
      configurable: true,
    });
  } else {
    // @ts-expect-error -- intentional delete for the unavailable-runtime test
    delete globalThis.IntersectionObserver;
  }
}

describe("DeferredMount", () => {
  beforeEach(() => {
    installIntersectionObserverMock();
  });

  afterEach(() => {
    uninstallIntersectionObserverMock();
    vi.clearAllMocks();
  });

  it("renders the placeholder and not the children before intersection", () => {
    const {queryByText} = render(
      <DeferredMount placeholder={<span>shimmer</span>}>
        <span>real card</span>
      </DeferredMount>,
    );

    expect(queryByText("shimmer")).not.toBeNull();
    expect(queryByText("real card")).toBeNull();
    expect(observerInstances).toHaveLength(1);
    expect(observerInstances[0]!.observe).toHaveBeenCalledTimes(1);
  });

  it("swaps placeholder for children when intersection fires, then disconnects", () => {
    const {queryByText} = render(
      <DeferredMount placeholder={<span>shimmer</span>}>
        <span>real card</span>
      </DeferredMount>,
    );

    const instance = observerInstances[0]!;

    act(() => {
      instance.callback([{isIntersecting: true}]);
    });

    expect(queryByText("real card")).not.toBeNull();
    expect(queryByText("shimmer")).toBeNull();
    // disconnect may be called more than once: once inside the callback when
    // intersection fires, and once as the useEffect cleanup when the
    // `activated` dependency change re-runs the effect. The contract we
    // care about is "disconnect was called" — IntersectionObserver tolerates
    // redundant disconnect calls.
    expect(instance.disconnect).toHaveBeenCalled();
  });

  it("renders children immediately when IntersectionObserver is unavailable", () => {
    uninstallIntersectionObserverMock();
    // @ts-expect-error -- intentional delete to simulate ancient runtime
    delete globalThis.IntersectionObserver;

    const {queryByText} = render(
      <DeferredMount placeholder={<span>shimmer</span>}>
        <span>real card</span>
      </DeferredMount>,
    );

    expect(queryByText("real card")).not.toBeNull();
    expect(queryByText("shimmer")).toBeNull();
  });
});
