"use client";

import {formatCurrency, formatDate} from "@/lib/utils.generic";
import {InvoiceCategory, PaymentType} from "@/types/invoices";
import {
  Badge,
  Button,
  Calendar,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion} from "motion/react";
import {useLocale} from "next-intl";
import {useCallback, useMemo} from "react";
import {TbCalendar, TbCreditCard, TbHeart, TbTag} from "react-icons/tb";
import {useEditInvoiceContext} from "../../_context/EditInvoiceContext";
import ItemsTable from "../tables/ItemsTable";

/**
 * Displays comprehensive invoice details with inline editing capabilities.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Invoice Details Displayed**:
 * - **Date**: Transaction date with ISO timestamp tooltip
 * - **Category**: Invoice category badge (e.g., GROCERIES, DINING)
 * - **Payment Method**: Editable dropdown select with all payment types
 * - **Total Amount**: Formatted currency with locale-aware formatting
 * - **Description**: Merchant description text
 * - **Items Table**: Paginated list of invoice line items (via `ItemsTable`)
 *
 * **Editing Capabilities**:
 * - **Payment Method**: Dropdown select to change payment type
 * - **Mark as Important**: Toggle badge to favorite/unfavorite invoice
 * - **Edit Items**: Via `ItemsTable` which opens `ItemsDialog` for modifications
 *
 * **Animation**: Uses Framer Motion for card entrance and hover scale effects
 * on individual detail sections.
 *
 * **Domain Context**: Central component of the edit-invoice page, providing
 * the primary invoice summary view with editing access points.
 *
 * @returns Client-rendered card with invoice details and edit controls
 *
 * @example
 * ```tsx
 * <InvoiceCard />
 * // Displays: Invoice Details card with date, category, payment dropdown, total, items
 * ```
 *
 * @see {@link ItemsTable} - Nested component for displaying/editing items
 * @see {@link useEditInvoiceContext} - Context for tracking pending changes
 */
export default function InvoiceCard(): React.JSX.Element {
  const locale = useLocale();
  const {invoice, merchant, pendingChanges, setPaymentType, setIsImportant, setCategory, setDescription, setTransactionDate} =
    useEditInvoiceContext();
  const {paymentInformation, category, isImportant, description} = invoice;

  // Get the current values (pending change or original)
  const currentPaymentType = pendingChanges.paymentType ?? paymentInformation.paymentType;
  const currentIsImportant = pendingChanges.isImportant ?? isImportant;
  const currentCategory = pendingChanges.category ?? category;
  const currentDescription = pendingChanges.description ?? description;
  const currentTransactionDate = pendingChanges.transactionDate ?? new Date(paymentInformation.transactionDate);

  /** Converts a TypeScript numeric enum to select options */
  const enumToOptions = useCallback(<T extends Record<string, string | number>>(enumObj: T) => {
    return Object.entries(enumObj)
      .filter(([key]) => Number.isNaN(Number(key)))
      .map(([key, value]) => ({label: key.replaceAll("_", " "), value: value as number}));
  }, []);

  const paymentTypeOptions = useMemo(() => enumToOptions(PaymentType), [enumToOptions]);
  const categoryOptions = useMemo(() => enumToOptions(InvoiceCategory), [enumToOptions]);

  /** Generic handler for enum select changes */
  const createEnumHandler = useCallback(
    <T extends number>(setter: (value: T) => void) =>
      (value: string) =>
        setter(Number(value) as T),
    [],
  );

  const handlePaymentTypeChange = useMemo(() => createEnumHandler<PaymentType>(setPaymentType), [createEnumHandler, setPaymentType]);
  const handleCategoryChange = useMemo(() => createEnumHandler<InvoiceCategory>(setCategory), [createEnumHandler, setCategory]);

  const handleImportantToggle = useCallback(() => {
    setIsImportant(!currentIsImportant);
  }, [currentIsImportant, setIsImportant]);

  const handleDescriptionChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDescription(event.target.value);
    },
    [setDescription],
  );

  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      if (date) {
        // Preserve the current time when selecting a new date
        const newDate = new Date(date);
        newDate.setUTCHours(currentTransactionDate.getUTCHours());
        newDate.setUTCMinutes(currentTransactionDate.getUTCMinutes());
        setTransactionDate(newDate);
      }
    },
    [setTransactionDate, currentTransactionDate],
  );

  const handleTimeChange = useCallback(
    (type: "hours" | "minutes", value: string) => {
      const numValue = Number.parseInt(value, 10);
      if (Number.isNaN(numValue)) return;

      const newDate = new Date(currentTransactionDate);
      if (type === "hours" && numValue >= 0 && numValue <= 23) {
        newDate.setUTCHours(numValue);
      } else if (type === "minutes" && numValue >= 0 && numValue <= 59) {
        newDate.setUTCMinutes(numValue);
      }
      setTransactionDate(newDate);
    },
    [setTransactionDate, currentTransactionDate],
  );

  const handleHoursChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleTimeChange("hours", e.target.value),
    [handleTimeChange],
  );

  const handleMinutesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleTimeChange("minutes", e.target.value),
    [handleTimeChange],
  );

  return (
    <motion.div variants={{hidden: {opacity: 0}, visible: {opacity: 1}}}>
      <Card className='group overflow-hidden transition-shadow duration-300 hover:shadow-md'>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle>Invoice Details</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant={currentIsImportant === true ? "default" : "outline"}
                    className='cursor-pointer transition-transform hover:scale-105'
                    onClick={handleImportantToggle}>
                    <TbHeart className={cn("text-red-500 hover:text-red-700", currentIsImportant && "fill-red-500")} />
                    {currentIsImportant ? "IMPORTANT" : "Mark as Important"}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <span>Click to {currentIsImportant ? "unmark" : "mark"} as favorite</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription>
            From {merchant.name}
            <Separator className='my-2' />
            <Textarea
              value={currentDescription}
              onChange={handleDescriptionChange}
              placeholder='Enter invoice description...'
              className='min-h-20 resize-none'
              rows={3}
            />
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <motion.div
              whileHover={{scale: 1.02}}
              transition={{type: "spring", stiffness: 400, damping: 10}}>
              <h3 className='text-muted-foreground mb-1 text-sm font-medium'>Date (UTC)</h3>
              <div className='flex items-center'>
                <TbCalendar className='text-muted-foreground mr-2 h-4 w-4' />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      className='w-64 justify-start text-left font-normal'>
                      {formatDate(currentTransactionDate, {dateStyle: "full", timeStyle: "short", timeZone: "UTC", locale})}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className='w-auto p-4'
                    align='start'>
                    <Calendar
                      mode='single'
                      hideNavigation
                      selected={currentTransactionDate}
                      onSelect={handleDateSelect}
                      captionLayout='dropdown'
                      startMonth={new Date(2015, 0)}
                      endMonth={new Date(new Date().getFullYear() + 1, 11)}
                      className='w-64 rounded-md border [--cell-size:2.5rem]'
                    />
                    <Separator className='my-3' />
                    <div className='flex items-center justify-center gap-2'>
                      <div className='flex flex-col items-center gap-1'>
                        <Label
                          htmlFor='hours'
                          className='text-muted-foreground text-xs'>
                          Hours
                        </Label>
                        <Input
                          id='hours'
                          type='number'
                          min={0}
                          max={23}
                          value={currentTransactionDate.getUTCHours()}
                          onChange={handleHoursChange}
                          className='h-9 w-16 text-center'
                        />
                      </div>
                      <span className='text-muted-foreground mt-5 text-lg font-medium'>:</span>
                      <div className='flex flex-col items-center gap-1'>
                        <Label
                          htmlFor='minutes'
                          className='text-muted-foreground text-xs'>
                          Minutes
                        </Label>
                        <Input
                          id='minutes'
                          type='number'
                          min={0}
                          max={59}
                          value={currentTransactionDate.getUTCMinutes()}
                          onChange={handleMinutesChange}
                          className='h-9 w-16 text-center'
                        />
                      </div>
                      <span className='text-muted-foreground mt-5 text-sm'>UTC</span>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </motion.div>
            <motion.div
              whileHover={{scale: 1.02}}
              transition={{type: "spring", stiffness: 400, damping: 10}}>
              <h3 className='text-muted-foreground mb-1 text-sm font-medium'>Category</h3>
              <div className='flex items-center'>
                <TbTag className='text-muted-foreground mr-2 h-4 w-4' />
                <Select
                  value={String(currentCategory)}
                  onValueChange={handleCategoryChange}>
                  <SelectTrigger className='w-40'>
                    <SelectValue placeholder='Select category' />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
            <motion.div
              whileHover={{scale: 1.02}}
              transition={{type: "spring", stiffness: 400, damping: 10}}>
              <h3 className='text-muted-foreground mb-1 text-sm font-medium'>Payment Method</h3>
              <div className='flex items-center'>
                <TbCreditCard className='text-muted-foreground mr-2 h-4 w-4' />
                <Select
                  value={String(currentPaymentType)}
                  onValueChange={handlePaymentTypeChange}>
                  <SelectTrigger className='w-45'>
                    <SelectValue placeholder='Select payment type' />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentTypeOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
            <motion.div
              whileHover={{scale: 1.02}}
              transition={{type: "spring", stiffness: 400, damping: 10}}>
              <h3 className='text-muted-foreground mb-1 text-sm font-medium'>Total Amount</h3>
              <p className='text-lg font-semibold'>
                {formatCurrency(paymentInformation.totalCostAmount, {currencyCode: paymentInformation.currency.code, locale})}
              </p>
            </motion.div>
          </div>

          <Separator />

          <ItemsTable invoice={invoice} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
