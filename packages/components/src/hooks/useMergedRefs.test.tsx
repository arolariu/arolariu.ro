import "@testing-library/jest-dom/vitest";
import {render, renderHook} from "@testing-library/react";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

import {useMergedRefs} from "./useMergedRefs";

interface MergedRefElementProps {
  readonly refs: ReadonlyArray<React.Ref<HTMLDivElement> | undefined>;
}

function MergedRefElement({refs}: Readonly<MergedRefElementProps>): React.JSX.Element {
  const ref = useMergedRefs(...refs);
  return (
    <div
      ref={ref}
      data-testid='merged-ref-element'
    />
  );
}

describe("useMergedRefs", () => {
  it("runs returned callback cleanup once while clearing object and legacy callback refs on real unmount", () => {
    const objectRef = React.createRef<HTMLDivElement>();
    let cleanupCalls = 0;
    let cleanupRefNullCalls = 0;
    let legacyNode: HTMLDivElement | null = null;
    const cleanupRef: React.RefCallback<HTMLDivElement> = (node) => {
      if (node === null) {
        cleanupRefNullCalls += 1;
        return;
      }
      return () => {
        cleanupCalls += 1;
      };
    };
    const legacyRef: React.RefCallback<HTMLDivElement> = (node) => {
      legacyNode = node;
    };
    const {getByTestId, unmount} = render(<MergedRefElement refs={[cleanupRef, objectRef, legacyRef]} />);
    expect(objectRef.current).toBe(getByTestId("merged-ref-element"));
    expect(legacyNode).toBe(objectRef.current);
    unmount();

    expect(cleanupCalls).toBe(1);
    expect(cleanupRefNullCalls).toBe(0);
    expect(objectRef.current).toBeNull();
    expect(legacyNode).toBeNull();
  });

  it("cleans a removed callback before attaching its replacement to the retained real node", () => {
    const events: string[] = [];
    const firstRef: React.RefCallback<HTMLDivElement> = (node) => {
      if (node === null) return;
      events.push("first attached");
      return () => {
        events.push("first cleaned");
      };
    };
    const secondRef: React.RefCallback<HTMLDivElement> = (node) => {
      if (node === null) return;
      events.push("second attached");
      return () => {
        events.push("second cleaned");
      };
    };
    const {getByTestId, rerender, unmount} = render(<MergedRefElement refs={[firstRef]} />);
    const node = getByTestId("merged-ref-element");
    rerender(<MergedRefElement refs={[secondRef]} />);

    expect(getByTestId("merged-ref-element")).toBe(node);
    expect(events).toEqual(["first attached", "first cleaned", "second attached"]);
    unmount();
    expect(events).toEqual(["first attached", "first cleaned", "second attached", "second cleaned"]);
  });

  it("does not reattach or clean retained cleanup refs when another ref changes", () => {
    let attaches = 0;
    let cleanups = 0;
    const cleanupRef: React.RefCallback<HTMLDivElement> = (node) => {
      if (node === null) return;
      attaches += 1;
      return () => {
        cleanups += 1;
      };
    };
    const firstObjectRef = React.createRef<HTMLDivElement>();
    const secondObjectRef = React.createRef<HTMLDivElement>();
    const {rerender, unmount} = render(<MergedRefElement refs={[cleanupRef, firstObjectRef]} />);
    const node = firstObjectRef.current;
    rerender(<MergedRefElement refs={[cleanupRef, secondObjectRef]} />);

    expect(firstObjectRef.current).toBeNull();
    expect(secondObjectRef.current).toBe(node);
    expect(attaches).toBe(1);
    expect(cleanups).toBe(0);
    unmount();
    expect(cleanups).toBe(1);
    expect(secondObjectRef.current).toBeNull();
  });

  it("balances callback cleanup during StrictMode ref replay and unmount", () => {
    let attaches = 0;
    let cleanups = 0;
    const cleanupRef: React.RefCallback<HTMLDivElement> = (node) => {
      if (node === null) return;
      attaches += 1;
      return () => {
        cleanups += 1;
      };
    };
    const {unmount} = render(
      <React.StrictMode>
        <MergedRefElement refs={[cleanupRef]} />
      </React.StrictMode>,
    );
    expect(attaches).toBe(2);
    expect(cleanups).toBe(1);
    unmount();
    expect(cleanups).toBe(2);
  });

  it("returns a callback ref", () => {
    const {result} = renderHook(() => useMergedRefs());

    expect(typeof result.current).toBe("function");
  });

  it("sets a single mutable ref object", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {result} = renderHook(() => useMergedRefs(ref));

    const element = document.createElement("div");
    result.current(element);

    expect(ref.current).toBe(element);
  });

  it("calls a single callback ref", () => {
    const callbackRef = vi.fn();
    const {result} = renderHook(() => useMergedRefs(callbackRef));

    const element = document.createElement("div");
    expect(result.current(element)).toBeUndefined();

    expect(callbackRef).toHaveBeenCalledWith(element);
  });

  it("merges multiple mutable ref objects", () => {
    const ref1 = React.createRef<HTMLDivElement>();
    const ref2 = React.createRef<HTMLDivElement>();
    const {result} = renderHook(() => useMergedRefs(ref1, ref2));

    const element = document.createElement("div");
    result.current(element);

    expect(ref1.current).toBe(element);
    expect(ref2.current).toBe(element);
  });

  it("merges callback refs and mutable refs", () => {
    const callbackRef = vi.fn();
    const mutableRef = React.createRef<HTMLDivElement>();
    const {result} = renderHook(() => useMergedRefs(callbackRef, mutableRef));

    const element = document.createElement("div");
    result.current(element);

    expect(callbackRef).toHaveBeenCalledWith(element);
    expect(mutableRef.current).toBe(element);
  });

  it("handles undefined refs gracefully", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {result} = renderHook(() => useMergedRefs(undefined, ref, undefined));

    const element = document.createElement("div");
    expect(() => result.current(element)).not.toThrow();
    expect(ref.current).toBe(element);
  });

  it("handles null refs gracefully", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {result} = renderHook(() => useMergedRefs(null, ref));

    const element = document.createElement("div");
    expect(() => result.current(element)).not.toThrow();
    expect(ref.current).toBe(element);
  });

  it("clears refs when element is null", () => {
    const ref1 = React.createRef<HTMLDivElement>();
    const ref2 = React.createRef<HTMLDivElement>();
    const callbackRef = vi.fn();
    const {result} = renderHook(() => useMergedRefs(ref1, ref2, callbackRef));

    const element = document.createElement("div");
    result.current(element);

    expect(ref1.current).toBe(element);
    expect(ref2.current).toBe(element);
    expect(callbackRef).toHaveBeenCalledWith(element);

    result.current(null);

    expect(ref1.current).toBe(null);
    expect(ref2.current).toBe(null);
    expect(callbackRef).toHaveBeenCalledWith(null);
  });

  it("updates refs when element changes", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {result} = renderHook(() => useMergedRefs(ref));

    const element1 = document.createElement("div");
    result.current(element1);
    expect(ref.current).toBe(element1);

    const element2 = document.createElement("div");
    result.current(element2);
    expect(ref.current).toBe(element2);
  });

  it("works with no refs provided", () => {
    const {result} = renderHook(() => useMergedRefs());

    const element = document.createElement("div");
    expect(() => result.current(element)).not.toThrow();
  });

  it("keeps the callback stable when the ref inputs are stable", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {rerender, result} = renderHook(() => useMergedRefs(ref));
    const firstCallback = result.current;

    rerender();

    expect(result.current).toBe(firstCallback);
  });

  it("syncs the current node when the ref inputs change", () => {
    const firstRef = React.createRef<HTMLDivElement>();
    const secondRef = React.createRef<HTMLDivElement>();
    const {rerender, result} = renderHook(({ref}) => useMergedRefs(ref), {
      initialProps: {ref: firstRef},
    });
    const element = document.createElement("div");

    result.current(element);
    rerender({ref: secondRef});

    expect(firstRef.current).toBe(null);
    expect(secondRef.current).toBe(element);
  });

  it("clears removed callback refs when the ref inputs change", () => {
    const removedCallbackRef = vi.fn();
    const keptRef = React.createRef<HTMLDivElement>();
    const {rerender, result} = renderHook(({refs}: Readonly<MergedRefElementProps>) => useMergedRefs(...refs), {
      initialProps: {refs: [removedCallbackRef, keptRef]},
    });
    const element = document.createElement("div");

    result.current(element);
    rerender({refs: [keptRef]});

    expect(removedCallbackRef).toHaveBeenLastCalledWith(null);
    expect(keptRef.current).toBe(element);
  });
});
