"use client";

import {useUserInformation} from "@/hooks";
import {useInvoicesStore, useMerchantsStore} from "@/stores";
import type {Invoice, Merchant} from "@/types/invoices";
import DialogContainer from "../../_contexts/DialogContainer";
import {DialogProvider} from "../../_contexts/DialogContext";
import {InvoiceGuestBanner} from "./_components/banners/InvoiceGuestBanner";
import {BudgetImpactCard} from "./_components/cards/BudgetImpactCard";
import {CategoryInsightsCardContainer} from "./_components/cards/insights/CategoryInsightsCardContainer";
import {InvoiceDetailsCard} from "./_components/cards/InvoiceDetailsCard";
import {MerchantInfoCard} from "./_components/cards/MerchantInfoCard";
import {ReceiptScanCard} from "./_components/cards/ReceiptScanCard";
import {SeasonalInsightsCard} from "./_components/cards/SeasonalInsightsCard";
import {ShoppingCalendarCard} from "./_components/cards/ShoppingCalendarCard";
import {InvoiceAnalytics} from "./_components/InvoiceAnalytics";
import {InvoiceHeader} from "./_components/InvoiceHeader";
import {InvoiceTabs} from "./_components/tabs/InvoiceTabs";
import {InvoiceTimeline} from "./_components/timeline/InvoiceTimeline";
import {InvoiceContextProvider} from "./_context/InvoiceContext";

type Props = Readonly<{
  readonly invoice: Invoice;
  readonly merchant: Merchant;
}>;

export default function RenderViewInvoiceScreen(props: Readonly<Props>): React.JSX.Element {
  const {invoice, merchant} = props;
  const upsertInvoice = useInvoicesStore((state) => state.upsertInvoice);
  const upsertMerchant = useMerchantsStore((state) => state.upsertMerchant);
  const {
    isLoading: isLoadingUserInformation,
    userInformation: {userIdentifier},
  } = useUserInformation();

  const isOwner = invoice.userIdentifier === userIdentifier;
  // We only add the invoice and the merchant to the store if the user is the owner.
  if (!isLoadingUserInformation && isOwner) {
    upsertInvoice(invoice);
    upsertMerchant(merchant);
  }

  return (
    <InvoiceContextProvider
      invoice={invoice}
      merchant={merchant}>
      <DialogProvider>
        <div className='animate-in fade-in container mx-auto px-4 py-8 duration-500 sm:py-12'>
          {/* Header */}
          <div className='animate-in slide-in-from-bottom-4 mb-8 duration-500'>
            {Boolean(!isOwner && !isLoadingUserInformation) && <InvoiceGuestBanner />}
            <InvoiceHeader />
          </div>

          <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
            {/* Left Column - Timeline (hidden on mobile, shown on lg+) */}
            <div className='hidden space-y-6 lg:col-span-3 lg:block'>
              <div className='animate-in slide-in-from-left-4 sticky top-6 delay-100 duration-500'>
                <InvoiceTimeline />
              </div>
            </div>

            {/* Main Content - Center Column */}
            <div className='space-y-6 lg:col-span-6'>
              <div className='animate-in slide-in-from-bottom-4 delay-100 duration-500'>
                <InvoiceDetailsCard />
              </div>

              <div className='animate-in slide-in-from-bottom-4 delay-150 duration-500'>
                <CategoryInsightsCardContainer />
              </div>

              <div className='animate-in slide-in-from-bottom-4 delay-200 duration-500'>
                <InvoiceTabs />
              </div>

              {/* Timeline on mobile/tablet (shown below main content) */}
              <div className='animate-in slide-in-from-bottom-4 delay-250 duration-500 lg:hidden'>
                <InvoiceTimeline />
              </div>
            </div>

            {/* Sidebar - Right Column */}
            <div className='space-y-6 lg:col-span-3'>
              <div className='animate-in slide-in-from-right-4 lg:animate-in lg:slide-in-from-bottom-4 delay-100 duration-500'>
                <ReceiptScanCard />
              </div>
              <div className='animate-in slide-in-from-right-4 lg:animate-in lg:slide-in-from-bottom-4 delay-150 duration-500'>
                {Boolean(isOwner && !isLoadingUserInformation) && <ShoppingCalendarCard />}
              </div>
              <div className='animate-in slide-in-from-right-4 lg:animate-in lg:slide-in-from-bottom-4 delay-200 duration-500'>
                {Boolean(isOwner && !isLoadingUserInformation) && <BudgetImpactCard />}
              </div>
              <div className='animate-in slide-in-from-right-4 lg:animate-in lg:slide-in-from-bottom-4 delay-250 duration-500'>
                {Boolean(isOwner && !isLoadingUserInformation) && <SeasonalInsightsCard />}
              </div>
              <div className='animate-in slide-in-from-right-4 lg:animate-in lg:slide-in-from-bottom-4 delay-300 duration-500'>
                <MerchantInfoCard />
              </div>
            </div>
          </div>

          {/* Analytics Section */}
          <div className='border-border mt-8 border-t pt-8 sm:mt-12 sm:pt-12'>
            <InvoiceAnalytics />
          </div>
        </div>
        <DialogContainer />
      </DialogProvider>
    </InvoiceContextProvider>
  );
}
