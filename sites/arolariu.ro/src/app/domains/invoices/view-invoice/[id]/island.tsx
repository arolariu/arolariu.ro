"use client";

import type {Invoice, Merchant} from "@/types/invoices";
import {BudgetImpactCard} from "./_components/cards/BudgetImpactCard";
import {CategoryInsightsCard} from "./_components/cards/insights/CategoryInsightsCard";
import {InvoiceDetailsCard} from "./_components/cards/InvoiceDetailsCard";
import {MerchantInfoCard} from "./_components/cards/MerchantInfoCard";
import {QuickActionsCard} from "./_components/cards/QuickActionsCard";
import {ReceiptImageCard} from "./_components/cards/ReceiptImageCard";
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

  return (
    <InvoiceContextProvider
      invoice={invoice}
      merchant={merchant}>
      <div className='animate-in fade-in container mx-auto px-4 py-8 duration-500 sm:py-12'>
        {/* Header */}
        <div className='animate-in slide-in-from-bottom-4 mb-8 duration-500'>
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
              <CategoryInsightsCard />
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
              <ReceiptImageCard />
            </div>
            <div className='animate-in slide-in-from-right-4 lg:animate-in lg:slide-in-from-bottom-4 delay-150 duration-500'>
              <BudgetImpactCard />
            </div>
            <div className='animate-in slide-in-from-right-4 lg:animate-in lg:slide-in-from-bottom-4 delay-200 duration-500'>
              <ShoppingCalendarCard />
            </div>
            <div className='animate-in slide-in-from-right-4 lg:animate-in lg:slide-in-from-bottom-4 delay-250 duration-500'>
              <SeasonalInsightsCard />
            </div>
            <div className='animate-in slide-in-from-right-4 lg:animate-in lg:slide-in-from-bottom-4 delay-300 duration-500'>
              <MerchantInfoCard />
            </div>
            <div className='animate-in slide-in-from-right-4 lg:animate-in lg:slide-in-from-bottom-4 delay-350 duration-500'>
              <QuickActionsCard />
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className='border-border mt-8 border-t pt-8 sm:mt-12 sm:pt-12'>
          <InvoiceAnalytics />
        </div>
      </div>
    </InvoiceContextProvider>
  );
}
