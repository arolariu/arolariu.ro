import {formatCurrency, formatDate} from "@/lib/utils.generic";
import {useInvoicesStore} from "@/stores";
import {type Invoice} from "@/types/invoices";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion} from "motion/react";
import {useLocale} from "next-intl";
import Image from "next/image";
import {useCallback} from "react";
import {TbCalendar, TbEye} from "react-icons/tb";
import TableViewActions from "./TableViewActions";
import styles from "./GridView.module.scss";

type Props = Readonly<{
  invoices: ReadonlyArray<Invoice> | Invoice[];
}>;

export const GridView = ({invoices}: Readonly<Props>): React.JSX.Element => {
  const locale = useLocale();
  const selectedInvoices = useInvoicesStore((state) => state.selectedInvoices);
  const setSelectedInvoices = useInvoicesStore((state) => state.setSelectedInvoices);

  const handleSelectInvoice = useCallback(
    (invoiceId: string) => {
      const invoice = invoices.find((invoice) => invoice.id === invoiceId);
      if (invoice && !selectedInvoices.includes(invoice)) {
        setSelectedInvoices([...selectedInvoices, invoice]);
      } else if (invoice && selectedInvoices.includes(invoice)) {
        setSelectedInvoices(selectedInvoices.filter((inv) => inv.id !== invoice.id));
      }
    },
    [invoices, selectedInvoices, setSelectedInvoices],
  );

  if (invoices.length === 0) {
    return (
      <div className={styles["emptyState"]}>
        <div className={styles["emptyMessage"]}>No invoices found</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.2}}
      className={styles["grid"]}>
      {invoices.map((invoice) => (
        <div 
          key={invoice.id}
          className={styles["cardWrapper"]}>
          <div className={styles["checkboxOverlay"]}>
            <Checkbox
              checked={selectedInvoices.includes(invoice)}
              // eslint-disable-next-line react/jsx-no-bind -- inline fn for ease.
              onCheckedChange={() => handleSelectInvoice(invoice.id)}
              aria-label={`Select invoice ${invoice.name}`}
              className='bg-background/80 backdrop-blur-sm'
            />
          </div>
          <Card className='overflow-hidden'>
            <div className={styles["imageContainer"]}>
              <Image
                src={invoice.scans[0]?.location || "/placeholder.svg"}
                alt={invoice.name}
                className={styles["cardImage"]}
                width={400}
                height={400}
              />
              <div className={styles["imageActions"]}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      asChild
                      className='cursor-pointer'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='bg-background/80 h-8 w-8 backdrop-blur-sm'>
                        <TbEye className={styles["viewIcon"]} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View Details</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TableViewActions invoice={invoice} />
              </div>
            </div>
            <CardHeader className='pt-4 pb-2'>
              <CardTitle className='text-lg'>{invoice.name}</CardTitle>
              <CardDescription>{invoice.description}</CardDescription>
            </CardHeader>
            <CardContent className='pb-2'>
              <div className={styles["contentRow"]}>
                <div className={styles["dateRow"]}>
                  <TbCalendar className={styles["calendarIcon"]} />
                  <span>{formatDate(invoice.createdAt, {dateStyle: "full", locale})}</span>
                </div>
                <div className={styles["amount"]}>
                  {formatCurrency(invoice.paymentInformation.totalCostAmount, {
                    currencyCode: invoice.paymentInformation.currency.code,
                    locale,
                  })}
                </div>
              </div>
            </CardContent>
            <CardFooter className='flex justify-between pt-2'>
              <div className={styles["itemCount"]}>{invoice.items?.length || 0} items</div>
            </CardFooter>
          </Card>
        </div>
      ))}
    </motion.div>
  );
};
