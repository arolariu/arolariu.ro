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
        <div className={styles["container"]}>
          {/* Header */}
          <div className={styles["headerSection"]}>
            {Boolean(!isOwner && !isLoadingUserInformation) && <InvoiceGuestBanner />}
            <InvoiceHeader />
          </div>

          <div className={styles["mainGrid"]}>
            {/* Left Column - Timeline (hidden on mobile, shown on lg+) */}
            <div className={styles["leftColumn"]}>
              <div className={styles["leftColumnSticky"]}>
                <InvoiceTimeline />
              </div>
            </div>

            {/* Main Content - Center Column */}
            <div className={styles["centerColumn"]}>
              <div className={styles["centerItem"]}>
                <InvoiceDetailsCard />
              </div>

              <div className={styles["centerItem"]}>
                <CategoryInsightsCardContainer />
              </div>

              <div className={styles["centerItem"]}>
                <InvoiceTabs />
              </div>

              {/* Timeline on mobile/tablet (shown below main content) */}
              <div className={styles["mobileTimeline"]}>
                <InvoiceTimeline />
              </div>
            </div>

            {/* Sidebar - Right Column */}
            <div className={styles["rightColumn"]}>
              <div className={styles["rightItem"]}>
                <ReceiptScanCard />
              </div>
              <div className={styles["rightItem"]}>{Boolean(isOwner && !isLoadingUserInformation) && <ShoppingCalendarCard />}</div>
              <div className={styles["rightItem"]}>{Boolean(isOwner && !isLoadingUserInformation) && <BudgetImpactCard />}</div>
              <div className={styles["rightItem"]}>{Boolean(isOwner && !isLoadingUserInformation) && <SeasonalInsightsCard />}</div>
              <div className={styles["rightItem"]}>
                <MerchantInfoCard />
              </div>
            </div>
          </div>

          {/* Analytics Section */}
          <div className={styles["analyticsSection"]}>
            <InvoiceAnalytics />
          </div>
        </div>
        <DialogContainer />
      </DialogProvider>
    </InvoiceContextProvider>
  );
}
