import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./textarea.module.css";

/**
 * Props for the shared textarea wrapper.
 */
interface TextareaProps extends React.ComponentPropsWithoutRef<"textarea"> {
  /** Additional CSS classes merged with the textarea styles. @default undefined */
  className?: string;
}

/**
 * Renders a multi-line text area for longer free-form text input.
 *
 * @remarks
 * - Renders a `<textarea>` element by default
 * - Built on {@link https://base-ui.com/react/components/textarea | Base UI Textarea}
 * - Supports the `render` prop for element composition through standard React composition patterns
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <Textarea placeholder="Add additional details" />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/textarea | Base UI Documentation}
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({className, ...props}: Readonly<TextareaProps>, ref): React.JSX.Element => (
    <textarea
      ref={ref}
      className={cn(styles.textarea, className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export {Textarea};
