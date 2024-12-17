/** @format */

import { Dialog, DialogActionsProps, DialogBody, DialogSurface, DialogTrigger } from "@fluentui/react-components";
import React from "react";

type PrimaryDialogProps = {
  callToActionButton: React.JSX.Element;
  title: React.JSX.Element;
  content: React.JSX.Element;
};

export const PrimaryDialog = ({ callToActionButton: DialogButton }: Readonly<PrimaryDialogProps>) => {
  return (
    <Dialog>
      <DialogTrigger>
        {DialogButton}
      </DialogTrigger>
      <DialogSurface>
        <DialogBody></DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

