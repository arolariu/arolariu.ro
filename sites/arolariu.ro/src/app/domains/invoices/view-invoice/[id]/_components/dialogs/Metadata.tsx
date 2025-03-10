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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@arolariu/components";
import {Save} from "lucide-react";
import {useState} from "react";

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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  currentKey?: string;
  currentValue?: string;
  existingKeys: string[];
  onSave: (key: string, value: string) => void;
};

export function MetadataDialog({
  open,
  onOpenChange,
  mode,
  currentKey,
  currentValue,
  existingKeys,
  onSave,
}: Readonly<Props>) {
  const isAddMode = mode === "add";
  const [key, setKey] = useState(currentKey || "");
  const [value, setValue] = useState(currentValue || "");

  // Filter out keys that are already in use (for add mode)
  const availableKeys = VALID_METADATA_KEYS.filter((item) => (isAddMode ? !existingKeys.includes(item.key) : true));

  // Check if the current key is readonly
  const isReadonly = !isAddMode && VALID_METADATA_KEYS.find((item) => item.key === currentKey)?.readonly;

  const handleSave = () => {
    if (!key) {
      toast("Missing field", {
        description: "Please select a metadata key",
      });
      return;
    }

    if (!value.trim()) {
      toast("Missing value", {
        description: "Please enter a value for the metadata",
      });
      return;
    }

    onSave(key, value);
    toast(`Metadata ${isAddMode ? "added" : "updated"}`, {
      description: `${VALID_METADATA_KEYS.find((item) => item.key === key)?.label || key} has been ${isAddMode ? "added" : "updated"}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{isAddMode ? "Add Metadata" : "Edit Metadata"}</DialogTitle>
          <DialogDescription>
            {isAddMode ? "Add additional information to this invoice" : "Update the value of this metadata field"}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='space-y-2'>
            <Label htmlFor='key'>Metadata Field</Label>
            {isAddMode ? (
              <Select
                value={key}
                onValueChange={setKey}
                disabled={availableKeys.length === 0}>
                <SelectTrigger id='key'>
                  <SelectValue placeholder='Select a field' />
                </SelectTrigger>
                <SelectContent>
                  {availableKeys.map((item) => (
                    <SelectItem
                      key={item.key}
                      value={item.key}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id='key'
                value={VALID_METADATA_KEYS.find((item) => item.key === key)?.label || key}
                disabled
              />
            )}
            {availableKeys.length === 0 && isAddMode && (
              <p className='text-muted-foreground text-sm'>All available metadata fields are already in use.</p>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='value'>Value</Label>
            <Input
              id='value'
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='Enter value'
              disabled={isReadonly}
            />
            {isReadonly && (
              <p className='text-muted-foreground text-sm'>This field is read-only and cannot be modified.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type='button'
            onClick={handleSave}
            disabled={isReadonly}>
            <Save className='mr-2 h-4 w-4' />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

