"use client";

import {Switch as BaseSwitch} from "@base-ui/react/switch";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./switch.module.css";

/** Supported switch track/thumb sizes. */
export type SwitchSize = "sm" | "default";
/** Primitive-owned checked, disabled, and Field state; size is not primitive state. */
export type SwitchState = BaseSwitch.Root.State;
/** Readonly primitive switch props with CSS Module size presets. */
export type SwitchProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseSwitch.Root>, "children">
    & Partial<{
      /** Track/thumb size preset. @default "default" */
      size: SwitchSize | undefined;
    }>
>;

/**
 * Toggles between on and off states with a styled thumb control.
 *
 * @remarks
 * - Renders the primitive's `<span>` and a hidden native checkbox input by default
 * - Built on {@link https://base-ui.com/react/components/switch | Base UI Switch}
 * - Render/class callbacks receive live primitive checked/Field state
 * - Set nativeButton=true with render={<button />} for a native button target
 * - Small/default track and thumb sizes honor logical RTL positioning
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <Switch aria-label="Email alerts" defaultChecked />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/switch | Base UI Documentation}
 */
const Switch = (props: Readonly<Switch.Props>): React.ReactElement => {
  const {ref} = props;
  const {className, size = "default", ...otherProps} = props;

  return (
    <BaseSwitch.Root
      ref={ref}
      data-slot='switch'
      data-size={size}
      className={(state) => cn(styles.root, typeof className === "function" ? className(state) : className)}
      {...otherProps}>
      <BaseSwitch.Thumb
        data-slot='switch-thumb'
        className={styles.thumb}
      />
    </BaseSwitch.Root>
  );
};
Switch.displayName = "Switch";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Switch {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- preserves the documented component namespace API alongside named props
  export type Props = SwitchProps;
  export type State = BaseSwitch.Root.State;
}

export {Switch};
