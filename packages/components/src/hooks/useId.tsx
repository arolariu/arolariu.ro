"use client";

import * as React from "react";

/**
 * Generates a unique, stable identifier that is safe for server-side rendering.
 *
 * @remarks
 * This hook wraps React's `useId` and optionally prepends a custom prefix.
 * The generated ID remains stable across re-renders and matches between server
 * and client, making it ideal for associating form labels with inputs or
 * managing accessible ARIA relationships.
 *
 * @param prefix - Optional string to prepend to the generated ID.
 * @returns A unique identifier string.
 *
 * @example
 * ```tsx
 * function FormField({label}) {
 *   const id = useId("field");
 *
 *   return (
 *     <div>
 *       <label htmlFor={id}>{label}</label>
 *       <input id={id} type="text" />
 *     </div>
 *   );
 * }
 * ```
 *
 * @see {@link https://react.dev/reference/react/useId | React useId}
 */
export function useId(prefix?: string): string {
  const reactId = React.useId();
  return prefix ? `${prefix}-${reactId}` : reactId;
}
