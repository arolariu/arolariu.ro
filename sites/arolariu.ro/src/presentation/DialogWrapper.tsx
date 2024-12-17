/** @format */

import React from "react";
import {Button, Dialog, DialogTrigger, Heading, Modal, ModalOverlay} from "react-aria-components";

const defaultActions = () => {
  return (
    <React.Fragment>
      <Button>Close</Button>
      <Button>Ok</Button>
    </React.Fragment>
  );
};

type PrimaryDialogProps = {
  callToActionButton: React.JSX.Element;
  title: React.JSX.Element;
  children: React.ReactNode;
  actions?: () => React.JSX.Element;
};

export const DialogWrapper = ({
  callToActionButton: DialogButton,
  title,
  children: content,
  actions,
}: Readonly<PrimaryDialogProps>) => {
  const dialogActions = actions || defaultActions;

  return (
    <DialogTrigger>
      {DialogButton}
      <ModalOverlay>
        <Modal>
          <Dialog>
            <Heading slot='title'>{title}</Heading>
            <p>{content}</p>
            <div>{dialogActions()}</div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
};
