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
import styles from "./island.module.scss";

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
        <main className={styles["container"]}>
          {/* Header */}
          <main className={styles["headerSection"]}>
            {Boolean(!isOwner && !isLoadingUserInformation) && <InvoiceGuestBanner />}
            <InvoiceHeader />
          </main>

          <main className={styles["mainGrid"]}>
            {/* Left Column - Timeline (hidden on mobile, shown on lg+) */}
            <main className={styles["leftColumn"]}>
              <main className={styles["leftColumnSticky"]}>
                <InvoiceTimeline />
              </main>
            </main>

            {/* Main Content - Center Column */}
            <main className={styles["centerColumn"]}>
              <main className={styles["centerItem"]}>
                <InvoiceDetailsCard />
              </main>

              <main className={styles["centerItem"]}>
                <CategoryInsightsCardContainer />
              </main>

              <main className={styles["centerItem"]}>
                <InvoiceTabs />
              </main>

              {/* Timeline on mobile/tablet (shown below main content) */}
              <main className={styles["mobileTimeline"]}>
                <InvoiceTimeline />
              </main>
            </main>

            {/* Sidebar - Right Column */}
            <main className={styles["rightColumn"]}>
              <main className={styles["rightItem"]}>
                <ReceiptScanCard />
              </main>
              <main className={styles["rightItem"]}>
                {Boolean(isOwner && !isLoadingUserInformation) && <ShoppingCalendarCard />}
              </main>
              <main className={styles["rightItem"]}>
                {Boolean(isOwner && !isLoadingUserInformation) && <BudgetImpactCard />}
              </main>
              <main className={styles["rightItem"]}>
                {Boolean(isOwner && !isLoadingUserInformation) && <SeasonalInsightsCard />}
              </main>
              <main className={styles["rightItem"]}>
                <MerchantInfoCard />
              </main>
            </main>
          </main>

          {/* Analytics Section */}
          <main className={styles["analyticsSection"]}>
            <InvoiceAnalytics />
          </main>
        </main>
        <DialogContainer />
      </DialogProvider>
    </InvoiceContextProvider>
  );
}
