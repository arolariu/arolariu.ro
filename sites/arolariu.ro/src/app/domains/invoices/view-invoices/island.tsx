"use client";

import {useInvoices} from "@/hooks";
import {Skeleton, Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import DialogContainer from "../_contexts/DialogContainer";
import {DialogProvider} from "../_contexts/DialogContext";
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

  if (isLoading) {
    return (
      <section className={styles["loadingSection"]}>
        <Skeleton className='h-24 w-full' />
        <main className={styles["loadingTabsRow"]}>
          <Skeleton className='h-10 w-24' />
          <Skeleton className='h-10 w-24' />
          <Skeleton className='h-10 w-24' />
        </main>
        <main className={styles["loadingGrid"]}>
          <Skeleton className='h-48 w-full' />
          <Skeleton className='h-48 w-full' />
          <Skeleton className='h-48 w-full' />
        </main>
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
            className='w-full'>
            <TabsList className='grid w-full max-w-md grid-cols-3 print:hidden'>
              <TabsTrigger
                value='invoices'
                className='cursor-pointer'>
                Invoices
              </TabsTrigger>
              <TabsTrigger
                value='statistics'
                className='cursor-pointer'>
                Statistics
              </TabsTrigger>
              <TabsTrigger
                value='liveAnalysis'
                className='cursor-pointer'>
                Live Analysis
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
    </DialogProvider>
  );
}
