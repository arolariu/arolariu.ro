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

class RefErrorBoundary extends React.Component<Readonly<{children: React.ReactNode}>, {failed: boolean}> {
  public override state = {failed: false};

  public static getDerivedStateFromError(): {failed: boolean} {
    return {failed: true};
  }

  public override render(): React.ReactNode {
    return this.state.failed ? <div role='alert'>Ref failed</div> : this.props.children;
  }
}

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error("Expected the ref operation to throw");
}

function expectAggregateCauses(error: unknown, causes: readonly unknown[]): void {
  expect(error).toBeInstanceOf(AggregateError);
  if (!(error instanceof AggregateError)) throw new Error("Expected an AggregateError");
  expect(error.errors).toHaveLength(causes.length);
  causes.forEach((cause, index) => {
    expect(error.errors[index]).toBe(cause);
  });
}

describe("useMergedRefs", () => {
  describe("ref errors", () => {
    it.each(["disposer", "null", "replacement"] as const)(
      "finishes detaching every member before propagating the first cleanup error via %s",
      (operation) => {
        const failure = new Error("first cleanup failed");
        const firstCleanup = vi.fn(() => {
          throw failure;
        });
        const firstNull = vi.fn();
        const firstRef: React.RefCallback<HTMLDivElement> = (node) => (node === null ? firstNull() : firstCleanup);
        const objectRef = React.createRef<HTMLDivElement>();
        const remainingCleanup = vi.fn();
        const remainingNull = vi.fn();
        const remainingRef: React.RefCallback<HTMLDivElement> = (node) => (node === null ? remainingNull() : remainingCleanup);
        const nullRef = vi.fn();
        const {result} = renderHook(() => useMergedRefs(firstRef, objectRef, remainingRef, nullRef));
        const node = document.createElement("div");
        const dispose = result.current(node);
        if (typeof dispose !== "function") throw new Error("Expected a React 19 attachment disposer");

        const detach = (): unknown => {
          if (operation === "disposer") return dispose();
          return result.current(operation === "null" ? null : document.createElement("div"));
        };
        expect(captureError(detach)).toBe(failure);
        expect(objectRef.current).toBeNull();
        expect(remainingCleanup).toHaveBeenCalledExactlyOnceWith();
        expect(nullRef.mock.calls).toEqual([[node], [null]]);
        expect(firstNull).not.toHaveBeenCalled();
        expect(remainingNull).not.toHaveBeenCalled();
        expect(() => dispose()).not.toThrow();
        expect(() => result.current(null)).not.toThrow();
        expect(firstCleanup).toHaveBeenCalledTimes(1);
        expect(remainingCleanup).toHaveBeenCalledTimes(1);
      },
    );

    it("preserves every throwing disposer and null callback cause while clearing the remaining object ref", () => {
      const firstFailure = new Error("first cleanup failed");
      const secondFailure = new Error("second cleanup failed");
      const nullFailure = new Error("null callback failed");
      const firstCleanup = vi.fn(() => {
        throw firstFailure;
      });
      const secondCleanup = vi.fn(() => {
        throw secondFailure;
      });
      const firstRef: React.RefCallback<HTMLDivElement> = (node) => (node === null ? undefined : firstCleanup);
      const secondRef: React.RefCallback<HTMLDivElement> = (node) => (node === null ? undefined : secondCleanup);
      const nullRef: React.RefCallback<HTMLDivElement> = (node) => {
        if (node === null) throw nullFailure;
      };
      const objectRef = React.createRef<HTMLDivElement>();
      const {result} = renderHook(() => useMergedRefs(firstRef, secondRef, nullRef, objectRef));
      const dispose = result.current(document.createElement("div"));
      if (typeof dispose !== "function") throw new Error("Expected a React 19 attachment disposer");

      expectAggregateCauses(captureError(dispose), [firstFailure, secondFailure, nullFailure]);
      expect(objectRef.current).toBeNull();
      expect(firstCleanup).toHaveBeenCalledTimes(1);
      expect(secondCleanup).toHaveBeenCalledTimes(1);
      expect(() => dispose()).not.toThrow();
    });

    it("propagates a thrown undefined value instead of treating it as successful cleanup", () => {
      const throwingRef: React.RefCallback<HTMLDivElement> = (node) => {
        if (node !== null) {
          return () => {
            throw undefined;
          };
        }
      };
      const objectRef = React.createRef<HTMLDivElement>();
      const {result} = renderHook(() => useMergedRefs(throwingRef, objectRef));
      const dispose = result.current(document.createElement("div"));
      if (typeof dispose !== "function") throw new Error("Expected a React 19 attachment disposer");

      expect(captureError(dispose)).toBeUndefined();
      expect(objectRef.current).toBeNull();
      expect(() => dispose()).not.toThrow();
    });

    it.each([false, true])("completes membership reconciliation before React error-boundary unmount (multiple errors: %s)", (multiple) => {
      const firstFailure = new Error("removed cleanup failed");
      const secondFailure = new Error("another removed cleanup failed");
      const events: string[] = [];
      const removedRef: React.RefCallback<HTMLDivElement> = (node) => {
        if (node === null) throw new Error("A cleanup-returning ref must not receive null");
        return () => {
          events.push("first removed cleanup");
          throw firstFailure;
        };
      };
      const anotherRemovedRef: React.RefCallback<HTMLDivElement> = (node) => {
        if (node === null) throw new Error("A cleanup-returning ref must not receive null");
        return () => {
          events.push("second removed cleanup");
          if (multiple) throw secondFailure;
        };
      };
      const removedObject = React.createRef<HTMLDivElement>();
      const retainedObject = React.createRef<HTMLDivElement>();
      const retainedRef: React.RefCallback<HTMLDivElement> = (node) => {
        if (node === null) throw new Error("A cleanup-returning ref must not receive null");
        events.push("retained attach");
        return () => {
          events.push("retained cleanup");
        };
      };
      const addedObject = React.createRef<HTMLDivElement>();
      const addedRef: React.RefCallback<HTMLDivElement> = (node) => {
        if (node === null) return;
        expect(node).toBe(retainedObject.current);
        events.push("added attach");
        return () => {
          events.push("added cleanup");
        };
      };
      const onCaughtError = vi.fn();
      const {getByRole, rerender, unmount} = render(
        <RefErrorBoundary>
          <MergedRefElement refs={[removedRef, anotherRemovedRef, removedObject, retainedObject, retainedRef]} />
        </RefErrorBoundary>,
        {onCaughtError},
      );

      rerender(
        <RefErrorBoundary>
          <MergedRefElement refs={[retainedObject, retainedRef, addedRef, addedObject]} />
        </RefErrorBoundary>,
      );

      expect(getByRole("alert")).toHaveTextContent("Ref failed");
      expect(onCaughtError).toHaveBeenCalledTimes(1);
      const caughtError: unknown = onCaughtError.mock.calls[0]?.[0];
      if (multiple) {
        expectAggregateCauses(caughtError, [firstFailure, secondFailure]);
      } else {
        expect(caughtError).toBe(firstFailure);
      }
      expect(events).toEqual([
        "retained attach",
        "first removed cleanup",
        "second removed cleanup",
        "added attach",
        "retained cleanup",
        "added cleanup",
      ]);
      expect(removedObject.current).toBeNull();
      expect(retainedObject.current).toBeNull();
      expect(addedObject.current).toBeNull();
      unmount();
      expect(events.filter((event) => event.endsWith("cleanup"))).toHaveLength(4);
    });

    it("rolls back retained and added memberships when an added ref throws, preserving rollback errors", () => {
      const attachFailure = new Error("added ref failed");
      const cleanupFailure = new Error("retained cleanup failed");
      const retainedObject = React.createRef<HTMLDivElement>();
      const retainedCleanup = vi.fn(() => {
        throw cleanupFailure;
      });
      const retainedRef: React.RefCallback<HTMLDivElement> = (node) => (node === null ? undefined : retainedCleanup);
      const addedRef = vi.fn((node: HTMLDivElement | null): void => {
        if (node !== null) throw attachFailure;
      });
      const remainingCleanup = vi.fn();
      const remainingRef: React.RefCallback<HTMLDivElement> = (node) => (node === null ? undefined : remainingCleanup);
      const addedObject = React.createRef<HTMLDivElement>();
      const onCaughtError = vi.fn();
      const {getByRole, rerender} = render(
        <RefErrorBoundary>
          <MergedRefElement refs={[retainedObject, retainedRef]} />
        </RefErrorBoundary>,
        {onCaughtError},
      );
      const node = retainedObject.current;

      rerender(
        <RefErrorBoundary>
          <MergedRefElement refs={[retainedObject, retainedRef, addedRef, remainingRef, addedObject]} />
        </RefErrorBoundary>,
      );

      expect(getByRole("alert")).toHaveTextContent("Ref failed");
      expect(onCaughtError).toHaveBeenCalledTimes(1);
      expectAggregateCauses(onCaughtError.mock.calls[0]?.[0], [attachFailure, cleanupFailure]);
      expect(retainedObject.current).toBeNull();
      expect(addedObject.current).toBeNull();
      expect(retainedCleanup).toHaveBeenCalledExactlyOnceWith();
      expect(remainingCleanup).toHaveBeenCalledExactlyOnceWith();
      expect(addedRef.mock.calls).toEqual([[node], [null]]);
    });

    it("clears all real DOM refs when React catches a throwing unmount disposer", () => {
      const failure = new Error("unmount cleanup failed");
      const throwingRef: React.RefCallback<HTMLDivElement> = (node) => {
        if (node !== null) {
          return () => {
            throw failure;
          };
        }
      };
      const objectRef = React.createRef<HTMLDivElement>();
      const remainingCleanup = vi.fn();
      const remainingRef: React.RefCallback<HTMLDivElement> = (node) => (node === null ? undefined : remainingCleanup);
      const onCaughtError = vi.fn();
      const {getByRole, rerender} = render(
        <RefErrorBoundary>
          <MergedRefElement refs={[throwingRef, objectRef, remainingRef]} />
        </RefErrorBoundary>,
        {onCaughtError},
      );
      expect(objectRef.current).toBeInstanceOf(HTMLDivElement);

      rerender(<RefErrorBoundary>{null}</RefErrorBoundary>);

      expect(getByRole("alert")).toHaveTextContent("Ref failed");
      expect(onCaughtError.mock.calls[0]?.[0]).toBe(failure);
      expect(objectRef.current).toBeNull();
      expect(remainingCleanup).toHaveBeenCalledExactlyOnceWith();
    });

    it.each([false, true])("rolls back every attempted attachment before throwing (rollback also fails: %s)", (rollbackFails) => {
      const attachFailure = new Error("attachment failed");
      const rollbackFailure = new Error("rollback cleanup failed");
      let failAttachment = true;
      const beforeCleanup = vi.fn(() => {
        if (rollbackFails && failAttachment) throw rollbackFailure;
      });
      const beforeRef: React.RefCallback<HTMLDivElement> = (node) => (node === null ? undefined : beforeCleanup);
      const beforeObject = React.createRef<HTMLDivElement>();
      const failingRef = vi.fn((node: HTMLDivElement | null): void => {
        if (node !== null && failAttachment) throw attachFailure;
      });
      const afterCleanup = vi.fn();
      const afterRef: React.RefCallback<HTMLDivElement> = (node) => (node === null ? undefined : afterCleanup);
      const afterObject = React.createRef<HTMLDivElement>();
      const {result} = renderHook(() => useMergedRefs(beforeRef, beforeObject, failingRef, afterRef, afterObject));
      const node = document.createElement("div");

      const error = captureError(() => result.current(node));
      if (rollbackFails) {
        expectAggregateCauses(error, [attachFailure, rollbackFailure]);
      } else {
        expect(error).toBe(attachFailure);
      }
      expect(beforeObject.current).toBeNull();
      expect(afterObject.current).toBeNull();
      expect(beforeCleanup).toHaveBeenCalledExactlyOnceWith();
      expect(afterCleanup).toHaveBeenCalledExactlyOnceWith();
      expect(failingRef.mock.calls).toEqual([[node], [null]]);
      expect(() => result.current(null)).not.toThrow();
      expect(beforeCleanup).toHaveBeenCalledTimes(1);
      expect(afterCleanup).toHaveBeenCalledTimes(1);

      failAttachment = false;
      const dispose = result.current(node);
      if (typeof dispose !== "function") throw new Error("Expected a React 19 attachment disposer");
      expect(beforeObject.current).toBe(node);
      expect(afterObject.current).toBe(node);
      dispose();
      expect(beforeObject.current).toBeNull();
      expect(afterObject.current).toBeNull();
      expect(beforeCleanup).toHaveBeenCalledTimes(2);
      expect(afterCleanup).toHaveBeenCalledTimes(2);
    });
  });

  it("attaches a repeated callback once and owns its cleanup until the real node detaches", () => {
    const events: string[] = [];
    const ref: React.RefCallback<HTMLDivElement> = (node) => {
      events.push(node === null ? "null" : "attach");
      if (node !== null) {
        return () => {
          events.push("cleanup");
        };
      }
    };
    const {unmount} = render(<MergedRefElement refs={[ref, ref]} />);

    expect(events).toEqual(["attach"]);
    unmount();
    expect(events).toEqual(["attach", "cleanup"]);
  });

  it("retains duplicate membership across reordering and disposes only after the final membership is removed", () => {
    const events: string[] = [];
    const ref: React.RefCallback<HTMLDivElement> = (node) => {
      if (node === null) {
        events.push("null");
        return;
      }
      events.push("attach");
      return () => {
        events.push("cleanup");
      };
    };
    const objectRef = React.createRef<HTMLDivElement>();
    const {getByTestId, rerender, unmount} = render(<MergedRefElement refs={[ref, ref, objectRef]} />);
    const node = getByTestId("merged-ref-element");

    rerender(<MergedRefElement refs={[objectRef, ref]} />);
    expect(events).toEqual(["attach"]);
    expect(objectRef.current).toBe(node);
    rerender(<MergedRefElement refs={[objectRef]} />);
    expect(events).toEqual(["attach", "cleanup"]);
    unmount();
    expect(events).toEqual(["attach", "cleanup"]);
    expect(objectRef.current).toBeNull();
  });

  it("returns a React 19 disposer that clears the current members exactly once", () => {
    const objectRef = React.createRef<HTMLDivElement>();
    const events: string[] = [];
    const ref: React.RefCallback<HTMLDivElement> = (node) => {
      if (node === null) {
        events.push("null");
        return;
      }
      return () => {
        events.push("cleanup");
      };
    };
    const {result} = renderHook(() => useMergedRefs(ref, objectRef));
    const node = document.createElement("div");
    const dispose = result.current(node);

    expect(typeof dispose).toBe("function");
    expect(objectRef.current).toBe(node);
    if (typeof dispose !== "function") throw new Error("An attached React 19 merged ref must return a disposer");
    dispose();
    dispose();
    expect(objectRef.current).toBeNull();
    expect(events).toEqual(["cleanup"]);
  });

  it("does not let an obsolete attachment disposer detach its replacement", () => {
    const objectRef = React.createRef<HTMLDivElement>();
    const {result} = renderHook(() => useMergedRefs(objectRef));
    const first = document.createElement("div");
    const second = document.createElement("div");
    const disposeFirst = result.current(first);
    const disposeSecond = result.current(second);

    if (typeof disposeFirst !== "function" || typeof disposeSecond !== "function") {
      throw new Error("Each React 19 merged ref attachment must return a disposer");
    }
    disposeFirst();
    expect(objectRef.current).toBe(second);
    disposeSecond();
    expect(objectRef.current).toBeNull();
  });

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
    expect(typeof result.current(element)).toBe("function");

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
