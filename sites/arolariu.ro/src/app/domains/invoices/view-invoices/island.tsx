"use client";

import {useInvoices} from "@/hooks";
import {Skeleton, Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
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
  const t = useTranslations("Invoices.ViewInvoices.viewInvoicesIsland");

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
                {t("tabs.invoices")}
              </TabsTrigger>
              <TabsTrigger
                value='statistics'
                className={styles["tabTrigger"]}>
                {t("tabs.statistics")}
              </TabsTrigger>
              <TabsTrigger
                value='liveAnalysis'
                className={styles["tabTrigger"]}>
                {t("tabs.liveAnalysis")}
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
