"use client";

import * as React from "react";

/**
 * Assigns a value to a single ref, supporting callback refs, ref objects, and `undefined`.
 *
 * @typeParam T - The type of the referenced element.
 * @param ref - The ref to update.
 * @param value - The element instance (or `null`) to assign.
 */
function setRef<T>(ref: React.Ref<T> | undefined, value: T | null): void {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
  } else {
    (ref as React.RefObject<T | null>).current = value;
  }
}

/**
 * Checks whether two ref lists contain the same refs in the same order.
 *
 * @typeParam T - The type of the referenced element.
 * @param previousRefs - The previously registered refs.
 * @param nextRefs - The refs from the latest render.
 * @returns Whether both ref lists are equivalent.
 */
function areRefsEqual<T>(
  previousRefs: ReadonlyArray<React.Ref<T> | undefined>,
  nextRefs: ReadonlyArray<React.Ref<T> | undefined>,
): boolean {
  return previousRefs.length === nextRefs.length && previousRefs.every((ref, index) => ref === nextRefs[index]);
}

/**
 * Merges multiple refs into a single callback ref.
 *
 * @remarks
 * This hook is essential when you need to attach multiple refs to the same element,
 * such as combining a forwarded ref with an internal ref for measurements or
 * imperative operations. All provided refs will receive the same element instance.
 *
 * Supports all ref types: callback refs, mutable ref objects, and `null`/`undefined`.
 *
 * @typeParam T - The type of the element being referenced.
 * @param refs - Variadic refs to merge. Can include callback refs, ref objects, or undefined.
 * @returns A callback ref that updates all provided refs.
 *
 * @example
 * ```tsx
 * const MyComponent = React.forwardRef<HTMLDivElement, Props>((props, forwardedRef) => {
 *   const internalRef = useRef<HTMLDivElement>(null);
 *   const mergedRef = useMergedRefs(forwardedRef, internalRef);
 *
 *   return <div ref={mergedRef}>Content</div>;
 * });
 * ```
 */
export function useMergedRefs<T>(...refs: Array<React.Ref<T> | undefined>): React.RefCallback<T> {
  const refsRef = React.useRef<ReadonlyArray<React.Ref<T> | undefined>>(refs);
  const nodeRef = React.useRef<T | null>(null);

  React.useLayoutEffect(() => {
    const previousRefs = refsRef.current;
    refsRef.current = refs;

    if (nodeRef.current === null || areRefsEqual(previousRefs, refs)) {
      return;
    }

    for (const ref of previousRefs) {
      if (!refs.includes(ref)) {
        setRef(ref, null);
      }
    }

    for (const ref of refs) {
      setRef(ref, nodeRef.current);
    }
  });

  return React.useCallback((node: T | null): void => {
    nodeRef.current = node;

    for (const ref of refsRef.current) {
      setRef(ref, node);
    }
  }, []);
}
