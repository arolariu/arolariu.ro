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
  // Capture the current rest-parameter array so useCallback can reference a named dep.
  // useMemo itself re-runs whenever the array identity changes (every render for rest params),
  // but the dependency list is now an array literal, satisfying react-hooks/use-memo.
  const refsKey = React.useMemo(() => refs, [refs]);

  return React.useCallback(
    (node: T | null): void => {
      for (const ref of refsKey) {
        setRef(ref, node);
      }
    },
    [refsKey],
  );
}
