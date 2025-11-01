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
import Image from "next/image";
import {useCallback} from "react";
import {TbCalendar, TbEye} from "react-icons/tb";
import InvoiceTableActions from "./InvoiceTableActions";

export const GridView = ({invoices}: Readonly<{invoices: Invoice[]}>): React.JSX.Element => {
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
      <div className='flex flex-col items-center justify-center py-10'>
        <div className='text-muted-foreground mb-2'>No invoices found</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.2}}
      className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          className='relative'>
          <div className='absolute top-2 left-2 z-10'>
            <Checkbox
              checked={selectedInvoices.includes(invoice)}
              // eslint-disable-next-line react/jsx-no-bind -- inline fn for ease.
              onCheckedChange={() => handleSelectInvoice(invoice.id)}
              aria-label={`Select invoice ${invoice.name}`}
              className='bg-background/80 backdrop-blur-sm'
            />
          </div>
          <Card className='overflow-hidden'>
            <Image
              src={invoice.photoLocation || "/placeholder.svg"}
              alt={invoice.name}
              className='h-full w-full object-fill transition-transform duration-500'
              width={400}
              height={400}
            />
            <CardHeader className='mt-6 pt-4 pb-2'>
              <CardTitle className='text-lg'>{invoice.name}</CardTitle>
              <div className='absolute top-80 right-2 z-10 flex gap-1'>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      asChild
                      className='cursor-pointer'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='bg-background/80 h-8 w-8 backdrop-blur-sm'>
                        <TbEye className='h-4 w-4' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View Details</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <InvoiceTableActions invoice={invoice} />
              </div>
              <CardDescription>{invoice.description}</CardDescription>
            </CardHeader>
            <CardContent className='pb-2'>
              <div className='flex items-center justify-between'>
                <div className='text-muted-foreground flex items-center gap-1 text-sm'>
                  <TbCalendar className='h-3.5 w-3.5' />
                  <span>{invoice.createdAt.toUTCString()}</span>
                </div>
                <div className='text-lg font-medium'>TODO EURO</div>
              </div>
            </CardContent>
            <CardFooter className='flex justify-between pt-2'>
              <div className='text-muted-foreground text-sm'>{invoice.items?.length || 0} items</div>
            </CardFooter>
          </Card>
        </div>
      ))}
    </motion.div>
  );
};
