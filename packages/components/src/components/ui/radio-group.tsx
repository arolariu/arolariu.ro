"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {Radio} from "@base-ui/react/radio";
import {RadioGroup as BaseRadioGroup} from "@base-ui/react/radio-group";
import {useRender} from "@base-ui/react/use-render";
import {Circle} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./radio-group.module.css";

type RadioGroupProps = React.ComponentPropsWithRef<typeof BaseRadioGroup>;
type RadioGroupItemProps = React.ComponentPropsWithRef<typeof Radio.Root>;

/**
 * Renders a styled radio group container.
 */
function RadioGroup(props: Readonly<RadioGroup.Props>): React.ReactElement {
  const {className, render, ...otherProps} = props;

  return (
    <BaseRadioGroup
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.group, className)}, {}),
      })}
    />
  );
}

/**
 * Renders a styled radio item with an indicator icon.
 */
function RadioGroupItem(props: Readonly<RadioGroupItem.Props>): React.ReactElement {
  const {className, render, ...otherProps} = props;

  return (
    <Radio.Root
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: render as never,
        props: mergeProps({className: cn(styles.item, className)}, {}),
      })}>
      <Radio.Indicator className={styles.indicator}>
        <Circle className={styles.icon} />
      </Radio.Indicator>
    </Radio.Root>
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace RadioGroup {
  export type Props = RadioGroupProps;
  export type State = BaseRadioGroup.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace RadioGroupItem {
  export type Props = RadioGroupItemProps;
  export type State = Radio.Root.State;
}

export {RadioGroup, RadioGroupItem};
