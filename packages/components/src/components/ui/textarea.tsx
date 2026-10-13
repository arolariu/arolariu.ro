import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./textarea.module.css";

/**
 * Props for the shared textarea wrapper.
 */
export type TextareaProps = Readonly<
  React.ComponentPropsWithoutRef<"textarea"> & {
    /** CSS sizing policy; unsupported content sizing falls back to native sizing. @default "fixed" */
    "data-sizing"?: "fixed" | "content";
  }
>;

/**
 * Renders a multi-line text area for longer free-form text input.
 *
 * @remarks
 * - Renders a `<textarea>` element by default
 * - Native control; there is no Base UI Textarea primitive or `render` prop
 * - Preserves native `value`, `defaultValue`, `onChange`, form and ref contracts
 * - Manual vertical resizing and `rows` sizing are the default
 * - Opt into CSS content sizing with `data-sizing="content"`; supporting browsers
 *   grow with content instead of using `rows`. Others retain native manual sizing.
 * - No JavaScript measurement or autosizing handlers are installed
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <Textarea placeholder="Add additional details" />
 * ```
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea | Native textarea}
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({className, ...props}: Readonly<TextareaProps>, ref): React.JSX.Element => (
    <textarea
      data-slot='textarea'
      ref={ref}
      className={cn(styles.textarea, className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Textarea {
  export type Props = Readonly<TextareaProps>;
}

export {Textarea};
