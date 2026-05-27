"use client";

/**
 * @fileoverview Client island for view-invoices page with tab-based navigation.
 * @module app/domains/invoices/view-invoices/island
 *
 * @remarks
 * **Island Architecture**: This client component is the interactive layer for the
 * view-invoices route. Rendered by the server component (`page.tsx`) after auth
 * checks and initial HTML delivery. Hydrates with interactivity for tab navigation,
 * dialog management, and bulk actions.
 *
 * **Key Features**:
 * - Three-tab navigation: Invoices list, Statistics dashboard, Live AI analysis
 * - Dialog management via `DialogProvider` context for modals/sheets
 * - Bulk actions toolbar for multi-select operations
 * - Loading skeleton during initial data fetch from Zustand store
 * - Framer Motion transitions for smooth tab switching
 *
 * **Context Providers**:
 * - `DialogProvider`: Manages modal/sheet state for create/edit/delete operations
 * - Consumed by `InvoicesHeader`, `BulkActionsToolbar`, and child view components
 *
 * **Data Flow**:
 * 1. `useInvoices` hook fetches from Zustand store (IndexedDB-persisted)
 * 2. Store hydrates from IndexedDB on first render
 * 3. Loading skeleton displays during hydration
 * 4. Real content renders with invoice data passed to tab views
 *
 * @see {@link RenderInvoicesView} - Main invoices table view
 * @see {@link RenderStatisticsView} - Analytics and charts view
 * @see {@link RenderGenerativeView} - AI-powered analysis view
 * @see {@link useInvoices} - Hook for invoice collection management
 * @see {@link DialogProvider} - Context for modal/sheet state
 */

import {useInvoices} from "@/hooks";
import {Skeleton, Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl-selector";
import DialogContainer from "../_contexts/DialogContainer";
import {DialogProvider} from "../_contexts/DialogContext";
import BulkActionsToolbar from "./_components/BulkActionsToolbar";
import InvoicesHeader from "./_components/InvoicesHeader";
import RenderGenerativeView from "./_components/views/GenerativeView";
import RenderInvoicesView from "./_components/views/InvoicesView";
import RenderStatisticsView from "./_components/views/StatisticsView";
import styles from "./island.module.scss";

/**
 * This function renders the view invoices page.
 * @returns This function renders the view invoices page.
 */
export default function RenderViewInvoicesScreen(): React.JSX.Element {
  const {invoices, isLoading} = useInvoices();
  const t = useTranslations();

  if (isLoading) {
    return (
      <section className={styles["loadingSection"]}>
        <Skeleton className={styles["skeletonHeader"]} />
        <div className={styles["loadingTabsRow"]}>
          <Skeleton className={styles["skeletonTab"]} />
          <Skeleton className={styles["skeletonTab"]} />
          <Skeleton className={styles["skeletonTab"]} />
        </div>
        <div className={styles["loadingGrid"]}>
          <Skeleton className={styles["skeletonCard"]} />
          <Skeleton className={styles["skeletonCard"]} />
          <Skeleton className={styles["skeletonCard"]} />
        </div>
      </section>
    );
  }

  return (
    <DialogProvider>
      <motion.section>
        <InvoicesHeader />
        <motion.article>
          <Tabs
            defaultValue='invoices'
            className={styles["fullWidth"]}>
            <TabsList className={styles["tabsList"]}>
              <TabsTrigger
                value='invoices'
                className={styles["tabTrigger"]}>
                {t((m) => m.pages.invoices.viewInvoices.viewInvoicesIsland.tabs.invoices)}
              </TabsTrigger>
              <TabsTrigger
                value='statistics'
                className={styles["tabTrigger"]}>
                {t((m) => m.pages.invoices.viewInvoices.viewInvoicesIsland.tabs.statistics)}
              </TabsTrigger>
              <TabsTrigger
                value='liveAnalysis'
                className={styles["tabTrigger"]}>
                {t((m) => m.pages.invoices.viewInvoices.viewInvoicesIsland.tabs.liveAnalysis)}
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value='invoices'
              className={styles["tabsContent"]}>
              <motion.div
                key='invoices'
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -20}}
                transition={{duration: 0.3}}>
                <RenderInvoicesView invoices={invoices} />
              </motion.div>
            </TabsContent>
            <TabsContent
              value='statistics'
              className={styles["tabsContent"]}>
              <motion.div
                key='statistics'
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -20}}
                transition={{duration: 0.3}}>
                <RenderStatisticsView invoices={invoices} />
              </motion.div>
            </TabsContent>
            <TabsContent
              value='liveAnalysis'
              className={styles["tabsContent"]}>
              <motion.div
                key='liveAnalysis'
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -20}}
                transition={{duration: 0.3}}>
                <RenderGenerativeView invoices={invoices} />
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.article>
      </motion.section>
      <DialogContainer />
      <BulkActionsToolbar />
    </DialogProvider>
  );
}
