"use client";

import {Switch as BaseSwitch} from "@base-ui/react/switch";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./switch.module.css";

const Switch = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof BaseSwitch.Root>>(({className, ...props}, ref) => (
  <BaseSwitch.Root
    ref={ref}
    className={cn(styles.root, className)}
    {...props}>
    <BaseSwitch.Thumb className={styles.thumb} />
  </BaseSwitch.Root>
));
Switch.displayName = "Switch";

export {Switch};
