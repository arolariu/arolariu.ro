"use client";

/**
 * The exact Base UI direction provider and hook, sharing its scoped context.
 *
 * @remarks
 * `DirectionProvider` adds no DOM wrapper. It configures Base UI behavior, not
 * native text layout: callers also set HTML `dir` where appropriate.
 * `useDirection` returns the closest provider's direction, defaulting to `ltr`.
 *
 * @see {@link https://base-ui.com/react/utils/direction-provider | Base UI Direction Provider}
 */
export {DirectionProvider, useDirection} from "@base-ui/react/direction-provider";

/** Original Base UI provider props and the `"ltr" | "rtl"` direction union. */
export type {DirectionProviderProps, TextDirection} from "@base-ui/react/direction-provider";
