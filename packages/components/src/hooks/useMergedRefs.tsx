"use client";

import * as React from "react";

/**
 * Invokes external ref code, deferring its errors until all members are processed.
 *
 * @typeParam TResult - The external ref operation's return type.
 * @param invoke - The external callback, cleanup, or ref-object assignment.
 * @param errors - Errors that the owning operation must rethrow after cleanup.
 * @returns The result, or `undefined` when an error has been recorded for rethrow.
 */
function invokeRef<TResult>(invoke: () => TResult, errors: unknown[]): TResult | undefined {
  try {
    return invoke();
  } catch (error) {
    errors.push(error);
    return undefined;
  }
}

/**
 * Assigns a value to a single ref, supporting callback refs, ref objects, and `undefined`.
 *
 * @typeParam T - The type of the referenced element.
 * @param ref - The ref to update.
 * @param value - The element instance (or `null`) to assign.
 * @param cleanups - Callback cleanup functions belonging to attached refs.
 * @param errors - External ref errors to propagate after the full operation.
 */
function setRef<T>(
  ref: React.Ref<T> | undefined,
  value: T | null,
  cleanups: Map<React.Ref<T> | undefined, () => void>,
  errors: unknown[],
): void {
  const cleanup = cleanups.get(ref);
  if (cleanup) {
    cleanups.delete(ref);
    invokeRef(cleanup, errors);
  }
  if (!ref) return;
  if (value === null && cleanup) return;

  if (typeof ref === "function") {
    const nextCleanup = invokeRef(() => ref(value), errors);
    if (value !== null && typeof nextCleanup === "function") {
      cleanups.set(ref, nextCleanup);
    }
  } else {
    invokeRef(() => {
      ref.current = value;
    }, errors);
  }
}

/**
 * Propagates original ref failures only after all members have been processed.
 *
 * @param errors - Errors in invocation order, including any rollback failures.
 */
function throwRefErrors(errors: readonly unknown[]): void {
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, "Multiple merged ref operations failed");
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
 * Supports callback refs, ref objects, and `null`/`undefined`.
 * Repeated ref identities are attached once and retained until their final
 * membership is removed. Reordering does not dispose retained refs.
 * Returned callback cleanup functions are run on detach or ref replacement
 * instead of calling that callback with `null`. Each attachment returns a
 * React 19 disposer; obsolete disposers cannot detach a newer attachment.
 * External ref failures do not prevent the remaining members from synchronizing
 * or detaching. A failed attachment or membership reconciliation releases the
 * current attachment before propagating the original error, or an AggregateError
 * containing every original cause when multiple ref operations fail.
 * Inline callback refs create a new function identity on every render; wrap them
 * in `useCallback` before passing them here to avoid repeated ref synchronization.
 *
 * @typeParam T - The type of the element being referenced.
 * @param refs - Variadic refs to merge. Can include callback refs, ref objects, or undefined.
 * @returns A callback ref that updates all provided refs.
 *
 * @example
 * ```tsx
 * function MyComponent({ref, ...props}: Props & {ref?: React.Ref<HTMLDivElement>}) {
 *   const internalRef = useRef<HTMLDivElement>(null);
 *   const mergedRef = useMergedRefs(ref, internalRef);
 *
 *   return <div ref={mergedRef}>Content</div>;
 * }
 * ```
 */
export function useMergedRefs<T>(...refs: Array<React.Ref<T> | undefined>): React.RefCallback<T> {
  const uniqueRefs = [...new Set(refs)];
  const refsRef = React.useRef<ReadonlyArray<React.Ref<T> | undefined>>(uniqueRefs);
  const nodeRef = React.useRef<T | null>(null);
  const cleanupsRef = React.useRef(new Map<React.Ref<T> | undefined, () => void>());
  const attachmentRef = React.useRef(0);

  const detach = React.useCallback((errors: unknown[]): void => {
    if (nodeRef.current === null) return;
    nodeRef.current = null;
    for (const ref of refsRef.current) {
      setRef(ref, null, cleanupsRef.current, errors);
    }
  }, []);

  React.useLayoutEffect(() => {
    const previousRefs = refsRef.current;
    refsRef.current = uniqueRefs;

    if (nodeRef.current === null || areRefsEqual(previousRefs, uniqueRefs)) {
      return;
    }

    const errors: unknown[] = [];
    for (const ref of previousRefs) {
      if (!uniqueRefs.includes(ref)) {
        setRef(ref, null, cleanupsRef.current, errors);
      }
    }

    for (const ref of uniqueRefs) {
      if (!previousRefs.includes(ref)) {
        setRef(ref, nodeRef.current, cleanupsRef.current, errors);
      }
    }
    if (errors.length > 0) detach(errors);
    throwRefErrors(errors);
  });

  return React.useCallback(
    (node: T | null): ReturnType<React.RefCallback<T>> => {
      const errors: unknown[] = [];
      detach(errors);
      throwRefErrors(errors);
      if (node === null) return undefined;
      nodeRef.current = node;
      const attachment = ++attachmentRef.current;
      for (const ref of refsRef.current) {
        setRef(ref, node, cleanupsRef.current, errors);
      }
      if (errors.length > 0) detach(errors);
      throwRefErrors(errors);
      return (): void => {
        if (attachmentRef.current === attachment) {
          const detachErrors: unknown[] = [];
          detach(detachErrors);
          throwRefErrors(detachErrors);
        }
      };
    },
    [detach],
  );
}
