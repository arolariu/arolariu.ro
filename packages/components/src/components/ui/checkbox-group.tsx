"use client";

import {CheckboxGroup as BaseCheckboxGroup} from "@base-ui/react/checkbox-group";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./checkbox-group.module.css";

/**
 * Groups related checkboxes into a single accessible fieldset-like control.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on Base UI Checkbox Group primitives
 * - Applies compact stacked spacing between child checkboxes
 *
 * @example
 * ```tsx
 * <CheckboxGroup defaultValue={["news"]}>
 *   <Checkbox value='news'>Newsletter</Checkbox>
 *   <Checkbox value='events'>Events</Checkbox>
 * </CheckboxGroup>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/checkbox-group | Base UI Checkbox Group Docs}
 */
const CheckboxGroup = React.forwardRef<HTMLDivElement, CheckboxGroup.Props>(function CheckboxGroup(props, forwardedRef) {
  const {className, render, ...otherProps} = props;

  return (
    <BaseCheckboxGroup
      {...otherProps}
      ref={forwardedRef}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.group, className)}, {}),
      })}
    />
  );
});

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace CheckboxGroup {
  export type Props = React.ComponentPropsWithRef<typeof BaseCheckboxGroup>;
  export type State = BaseCheckboxGroup.State;
}

CheckboxGroup.displayName = "CheckboxGroup";

export {CheckboxGroup};
