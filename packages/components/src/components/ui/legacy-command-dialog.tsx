"use client";

import * as React from "react";
import {Command, CommandDialog, type CommandDialogProps} from "./command";
import styles from "./legacy-command-dialog.module.css";

/** Explicitly named opt-in for the old automatic-root CommandDialog composition. */
export type LegacyCommandDialogProps = Readonly<CommandDialogProps>;

/**
 * @deprecated Prefer CommandDialog with an explicit Command child.
 * This adapter accepts direct CommandInput/CommandList children and inserts one root.
 * Do not pass a Command root to this legacy adapter.
 */
const LegacyCommandDialog = React.forwardRef<HTMLDivElement, LegacyCommandDialogProps>(
  ({children, ...props}: Readonly<LegacyCommandDialogProps>, ref): React.JSX.Element => (
    <CommandDialog
      {...props}
      ref={ref}>
      <Command className={styles.automaticRoot}>{children}</Command>
    </CommandDialog>
  ),
);
// eslint-disable-next-line sonarjs/deprecation -- the adapter's own display name intentionally identifies its deprecated contract.
LegacyCommandDialog.displayName = "LegacyCommandDialog";

// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace LegacyCommandDialog {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the component typing API.
  export type Props = LegacyCommandDialogProps;
  export type State = CommandDialog.State;
}

export {LegacyCommandDialog};
