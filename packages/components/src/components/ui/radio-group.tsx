"use client";

import {Radio} from "@base-ui/react/radio";
import {RadioGroup as BaseRadioGroup} from "@base-ui/react/radio-group";
import {Circle} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./radio-group.module.css";

const RadioGroup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseRadioGroup>>(({className, ...props}, ref) => (
  <BaseRadioGroup
    ref={ref}
    className={cn(styles.group, className)}
    {...props}
  />
));
RadioGroup.displayName = "RadioGroup";

const RadioGroupItem = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Radio.Root>>(
  ({className, ...props}, ref) => (
    <Radio.Root
      ref={ref}
      className={cn(styles.item, className)}
      {...props}>
      <Radio.Indicator className={styles.indicator}>
        <Circle className={styles.icon} />
      </Radio.Indicator>
    </Radio.Root>
  ),
);
RadioGroupItem.displayName = "RadioGroupItem";

export {RadioGroup, RadioGroupItem};
