"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {Switch as BaseSwitch} from "@base-ui/react/switch";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./switch.module.css";

/**
 * Props for the shared switch wrapper.
 */
interface SwitchProps extends Omit<React.ComponentPropsWithRef<typeof BaseSwitch.Root>, "className"> {
  /** Additional CSS classes merged with the switch root styles. @default undefined */
  className?: string;
}

/**
 * Toggles between on and off states with a styled thumb control.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/switch | Base UI Switch}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <Switch defaultChecked />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/switch | Base UI Documentation}
 */
function Switch(props: Readonly<Switch.Props>): React.ReactElement {
  const {className, render, ...otherProps} = props;

  return (
    <BaseSwitch.Root
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: render as never,
        props: mergeProps({className: cn(styles.root, className)}, {}),
      })}>
      <BaseSwitch.Thumb className={styles.thumb} />
    </BaseSwitch.Root>
  );
}
Switch.displayName = "Switch";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Switch {
  export type Props = SwitchProps;
  export type State = BaseSwitch.Root.State;
}

export {Switch};
