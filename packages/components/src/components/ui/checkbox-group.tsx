"use client";

import {CheckboxGroup as BaseCheckboxGroup} from "@base-ui/react/checkbox-group";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./checkbox-group.module.css";

type CheckboxGroupProps = React.ComponentPropsWithRef<typeof BaseCheckboxGroup>;

/**
 * Wraps the Base UI checkbox group with compact stacked spacing.
 */
function CheckboxGroup(props: Readonly<CheckboxGroup.Props>): React.ReactElement {
  const {className, render, ...otherProps} = props;

  return (
    <BaseCheckboxGroup
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.group, className)}, {}),
      })}
    />
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace CheckboxGroup {
  export type Props = CheckboxGroupProps;
  export type State = BaseCheckboxGroup.State;
}

export {CheckboxGroup};
