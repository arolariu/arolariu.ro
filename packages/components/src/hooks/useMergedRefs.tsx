"use client";

import * as React from "react";

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
 * @param refs - An array of refs to merge. Can include callback refs, ref objects, or undefined.
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
  return React.useCallback(
    (element: T | null) => {
      for (const ref of refs) {
        if (!ref) {
          continue;
        }

        if (typeof ref === "function") {
          ref(element);
        } else {
          // Mutable ref object
          (ref as React.MutableRefObject<T | null>).current = element;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    refs,
  );
}
