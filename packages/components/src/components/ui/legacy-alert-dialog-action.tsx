"use client";

import {AlertDialog as BaseAlertDialog} from "@base-ui/react/alert-dialog";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {buttonVariants, type ButtonSize, type ButtonVariant} from "./button";
import styles from "./legacy-alert-dialog-action.module.css";

/** Explicit opt-in compatibility for the pre-refresh Close-backed action. */
export type LegacyAlertDialogActionProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Close>, "className"> & {
    className?: string;
    /** Shared Button treatment. @default "default" */
    variant?: ButtonVariant;
    /** Shared Button size. @default "default" */
    size?: ButtonSize;
  }
>;

/**
 * Immediately closes on activation, retaining the old confirmation behavior.
 * @deprecated Prefer AlertDialogAction and close explicitly after successful work.
 * This adapter does not await asynchronous handlers and is unsuitable for pending/rejected work.
 */
const LegacyAlertDialogAction = React.forwardRef<HTMLButtonElement, LegacyAlertDialogAction.Props>(
  (
    {className, variant = "default", size = "default", ...props}: Readonly<React.PropsWithoutRef<LegacyAlertDialogAction.Props>>,
    ref,
  ): React.ReactElement => (
    <BaseAlertDialog.Close
      data-slot='legacy-alert-dialog-action'
      data-variant={variant}
      data-size={size}
      {...props}
      ref={ref}
      className={cn(buttonVariants({variant, size}), styles.action, className)}
    />
  ),
);
// eslint-disable-next-line sonarjs/deprecation -- configuring the intentional compatibility adapter itself.
LegacyAlertDialogAction.displayName = "LegacyAlertDialogAction";

// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace LegacyAlertDialogAction {
  export type Props = Readonly<LegacyAlertDialogActionProps>;
  export type State = BaseAlertDialog.Close.State;
}

export {LegacyAlertDialogAction};
