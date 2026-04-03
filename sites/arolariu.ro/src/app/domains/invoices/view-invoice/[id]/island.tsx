"use client";

import {useUserInformation} from "@/hooks";
import {useInvoicesStore, useMerchantsStore} from "@/stores";
import type {Invoice, Merchant} from "@/types/invoices";
import {Button, Dialog, DialogContent, DialogHeader, DialogTitle} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useMemo, useState} from "react";
import DialogContainer from "../../_contexts/DialogContainer";
import {DialogProvider} from "../../_contexts/DialogContext";
import {InvoiceGuestBanner} from "./_components/banners/InvoiceGuestBanner";
import {AnalysisPanel} from "./_components/cards/AnalysisPanel";
import {BudgetImpactCard} from "./_components/cards/BudgetImpactCard";
import {CategoryInsightsCardContainer} from "./_components/cards/insights/CategoryInsightsCardContainer";
import {InvoiceDetailsCard} from "./_components/cards/InvoiceDetailsCard";
import {InvoiceHealthScore} from "./_components/cards/InvoiceHealthScore";
import {ItemAnalyticsCard} from "./_components/cards/ItemAnalyticsCard";
import {MerchantInfoCard} from "./_components/cards/MerchantInfoCard";
import {ReceiptScanCard} from "./_components/cards/ReceiptScanCard";
import {RelatedInvoicesCard} from "./_components/cards/RelatedInvoicesCard";
import {SeasonalInsightsCard} from "./_components/cards/SeasonalInsightsCard";
import {ShareCollaborateCard} from "./_components/cards/ShareCollaborateCard";
import {ShoppingCalendarCard} from "./_components/cards/ShoppingCalendarCard";
import {InvoiceAnalytics} from "./_components/InvoiceAnalytics";
import {InvoiceHeader} from "./_components/InvoiceHeader";
import {PrintHeader} from "./_components/PrintHeader";
import {InvoiceTabs} from "./_components/tabs/InvoiceTabs";
import {InvoiceTimeline} from "./_components/timeline/InvoiceTimeline";
import {InvoiceContextProvider} from "./_context/InvoiceContext";
import {calculateHealthScorePercentage} from "./_utils/healthScore";
import styles from "./island.module.scss";

type Props = Readonly<{
  readonly invoice: Invoice;
  readonly merchant: Merchant | null;
}>;

export default function RenderViewInvoiceScreen(props: Readonly<Props>): React.JSX.Element {
  const {invoice, merchant} = props;
  const t = useTranslations("Invoices.ViewInvoice");
  const upsertInvoice = useInvoicesStore((state) => state.upsertInvoice);
  const upsertMerchant = useMerchantsStore((state) => state.upsertMerchant);
  const {
    isLoading: isLoadingUserInformation,
    userInformation: {userIdentifier},
  } = useUserInformation();

  const [showHealthDialog, setShowHealthDialog] = useState(false);

  const isOwner = invoice.userIdentifier === userIdentifier;
  // We only add the invoice and the merchant to the store if the user is the owner.
  if (!isLoadingUserInformation && isOwner) {
    upsertInvoice(invoice);
    if (merchant) upsertMerchant(merchant);
  }

  // Calculate health score percentage for compact display
  const healthScorePercentage = useMemo(() => calculateHealthScorePercentage(invoice), [invoice]);

  return (
    <InvoiceContextProvider
      invoice={invoice}
      merchant={merchant}>
      <DialogProvider>
        {/* Print Header - only visible when printing */}
        <PrintHeader
          invoice={invoice}
          merchant={merchant}
        />

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

              {/* Compact health score indicator */}
              <div className={styles["centerItem"]}>
                <div className={styles["healthScoreCompact"]}>
                  <div className={styles["healthScoreBar"]}>
                    <div
                      className={styles["healthScoreFill"]}
                      style={{width: `${healthScorePercentage}%`}}
                    />
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setShowHealthDialog(true)}>
                    {t("healthScore.seeReport")}
                  </Button>
                </div>
              </div>

              <div className={styles["centerItem"]}>
                <ItemAnalyticsCard />
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
              {Boolean(isOwner && !isLoadingUserInformation) && (
                <div className={styles["rightItem"]}>
                  <AnalysisPanel />
                </div>
              )}
              <div className={styles["rightItem"]}>
                <ReceiptScanCard />
              </div>
              <div className={styles["rightItem"]}>{Boolean(isOwner && !isLoadingUserInformation) && <ShoppingCalendarCard />}</div>
              <div className={styles["rightItem"]}>{Boolean(isOwner && !isLoadingUserInformation) && <BudgetImpactCard />}</div>
              <div className={styles["rightItem"]}>{Boolean(isOwner && !isLoadingUserInformation) && <SeasonalInsightsCard />}</div>
              <div className={styles["rightItem"]}>
                <MerchantInfoCard />
              </div>
              <div className={styles["rightItem"]}>{Boolean(isOwner && !isLoadingUserInformation) && <ShareCollaborateCard />}</div>
            </div>
          </div>

          {/* Analytics Section - only show when invoice has been analyzed */}
          {invoice.items.length > 0 && (
            <div className={styles["analyticsSection"]}>
              <InvoiceAnalytics />
            </div>
          )}

          {/* Related Invoices Section */}
          {Boolean(isOwner && !isLoadingUserInformation) && (
            <div className={styles["analyticsSection"]}>
              <RelatedInvoicesCard />
            </div>
          )}
        </div>
        <DialogContainer />

        {/* Health Score Dialog */}
        <Dialog
          open={showHealthDialog}
          onOpenChange={setShowHealthDialog}>
          <DialogContent className='max-h-[85vh] max-w-2xl overflow-y-auto'>
            <DialogHeader>
              <DialogTitle>{t("healthScore.dialogTitle")}</DialogTitle>
            </DialogHeader>
            <InvoiceHealthScore />
          </DialogContent>
        </Dialog>
      </DialogProvider>
    </InvoiceContextProvider>
  );
}
