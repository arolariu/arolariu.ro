"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {Switch as BaseSwitch} from "@base-ui/react/switch";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./switch.module.css";

type SwitchProps = React.ComponentPropsWithRef<typeof BaseSwitch.Root>;

/**
 * Renders a styled Base UI switch with a composed thumb.
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

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Switch {
  export type Props = SwitchProps;
  export type State = BaseSwitch.Root.State;
}

export {Switch};
