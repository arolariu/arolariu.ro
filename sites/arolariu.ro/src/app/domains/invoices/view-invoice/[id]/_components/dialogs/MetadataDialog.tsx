/** @format */

"use client";

import {Invoice} from "@/types/invoices";
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
import {useMemo, useState} from "react";
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

type Props = {
  invoice: Invoice;
  metadata: Record<string, string>;
  mode: "add" | "edit";
};

const MetadataAddDialog = ({invoice}: Readonly<{invoice: Invoice}>) => {
  const {isOpen, open, close} = useDialog("metadata");
  const [addedMetadata, setAddedMetadata] = useState<{key: string; value: string}>({
    key: "",
    value: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddedMetadata((prev) => ({...prev, [e.target.name]: e.target.value}));
  };

  const handleSave = () => {
    // Save the added metadata
  };

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
              value={addedMetadata.key}
              onChange={handleChange}
              placeholder='Enter metadata key'
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

const MetadataEditDialog = ({invoice, metadata}: Readonly<{invoice: Invoice; metadata: Record<string, string>}>) => {
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

export function MetadataDialog(props: Readonly<Props>) {
  const {invoice, metadata, mode} = props;

  const DialogComponent = useMemo(() => {
    switch (mode) {
      case "add":
        return <MetadataAddDialog invoice={invoice} />;
      case "edit":
        return (
          <MetadataEditDialog
            invoice={invoice}
            metadata={metadata}
          />
        );
      default:
        return null;
    }
  }, [mode]);

  return DialogComponent;
}
