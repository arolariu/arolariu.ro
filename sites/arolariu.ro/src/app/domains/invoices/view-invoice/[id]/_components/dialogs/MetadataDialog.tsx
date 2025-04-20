/** @format */

"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@arolariu/components";
import {useCallback, useState} from "react";
import {TbDiscFilled} from "react-icons/tb";
import {useDialog} from "../../_contexts/DialogContext";

// Define valid metadata keys and which ones are readonly
export const VALID_METADATA_KEYS = [
  {key: "loyaltyPoints", label: "Loyalty Points", readonly: false},
  {key: "storeLocation", label: "Store Location", readonly: false},
  {key: "cashier", label: "Cashier", readonly: false},
  {key: "receiptNumber", label: "Receipt Number", readonly: true},
  {key: "transactionId", label: "Transaction ID", readonly: true},
  {key: "paymentMethod", label: "Payment Method", readonly: false},
  {key: "discountCode", label: "Discount Code", readonly: false},
  {key: "customerNotes", label: "Customer Notes", readonly: false},
  {key: "taxAmount", label: "Tax Amount", readonly: true},
];

const AddDialog = () => {
  const {isOpen, open, close} = useDialog("metadata");
  const [addedMetadata, setAddedMetadata] = useState<{key: string; value: string}>({
    key: "",
    value: "",
  });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAddedMetadata((prev) => ({...prev, [e.target.name]: e.target.value}));
  }, []);

  const handleSave = useCallback(
    () => {
      // Save the added metadata
      console.log("Saving added metadata:", addedMetadata);
      close();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close fn is stable
    [addedMetadata],
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Add Metadata</DialogTitle>
          <DialogDescription>Add additional information to this invoice</DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='space-y-2'>
            <Label htmlFor='key'>Metadata Key</Label>
            <Input
              id='key'
              name='key'
              value={addedMetadata.key}
              onChange={handleChange}
              placeholder='Enter key'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='value'>Metadata Value</Label>
            <Input
              id='value'
              name='value'
              value={addedMetadata.value}
              onChange={handleChange}
              placeholder='Enter value'
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={close}>
            Cancel
          </Button>
          <Button
            type='button'
            onClick={handleSave}>
            <TbDiscFilled className='mr-2 h-4 w-4' />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const UpdateDialog = ({metadata}: Readonly<{metadata: Record<string, string>}>) => {
  const {isOpen, open, close} = useDialog("metadata");
  const [editedMetadata, setEditedMetadata] = useState<Record<string, string>>(metadata);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedMetadata((prev) => ({...prev, [e.target.name]: e.target.value}));
  };

  const handleSave = () => {
    // Save the edited metadata
    console.log("Saving edited metadata:", editedMetadata);
    close();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Edit Metadata</DialogTitle>
          <DialogDescription>Update the value of this metadata field</DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='space-y-2'>
            <Label htmlFor='key'>Metadata Field</Label>
            <Input
              id='key'
              value={editedMetadata["key"]}
              disabled
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='value'>Value</Label>
            <Input
              id='value'
              value={editedMetadata["value"]}
              onChange={handleChange}
              placeholder='Enter value'
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={close}>
            Cancel
          </Button>
          <Button
            type='button'
            onClick={handleSave}>
            <TbDiscFilled className='mr-2 h-4 w-4' />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DeleteDialog = ({metadata}: Readonly<{metadata: Record<string, string>}>) => {
  const {isOpen, open, close} = useDialog("metadata");

  const handleDelete = () => {
    // Delete the metadata
    console.log("Deleting metadata:", metadata);
    close();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Delete Metadata</DialogTitle>
          <DialogDescription>Are you sure you want to delete this metadata?</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={close}>
            Cancel
          </Button>
          <Button
            type='button'
            onClick={handleDelete}
            className='bg-red-500 text-white'>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Dialog component for managing metadata.
 * It handles adding, editing, and deleting metadata.
 * @returns The rendered dialog component for metadata.
 */
export default function MetadataDialog(): React.JSX.Element {
  const {
    currentDialog: {mode, payload},
  } = useDialog("metadata");

  const metadata = payload as Record<string, string>;

  switch (mode) {
    case "add":
      return <AddDialog />;
    case "delete":
      return <DeleteDialog metadata={metadata} />;
    case "edit":
      return <UpdateDialog metadata={metadata} />;
    default:
      return false as unknown as React.JSX.Element;
  }
}
