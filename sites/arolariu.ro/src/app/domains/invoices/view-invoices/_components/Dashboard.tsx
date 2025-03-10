/** @format */

"use client";

import type {Invoice} from "@/types/invoices";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import {motion} from "framer-motion";
import {DashboardHeader} from "./DashboardHeader";
import {InvoiceStatistics} from "./InvoiceStatistics";
import {InvoiceTable} from "./InvoiceTable";

type Props = {
  invoices: Invoice[];
};

export function Dashboard({invoices}: Readonly<Props>) {
  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      transition={{duration: 0.5}}
      className='container mx-auto space-y-8 py-6'>
      <DashboardHeader />

      <Tabs
        defaultValue='invoices'
        className='w-full'>
        <TabsList className='grid w-full max-w-md grid-cols-2'>
          <TabsTrigger value='invoices'>Invoices</TabsTrigger>
          <TabsTrigger value='statistics'>Statistics</TabsTrigger>
        </TabsList>
        <TabsContent
          value='invoices'
          className='mt-6'>
          <motion.div
            key='invoices'
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -20}}
            transition={{duration: 0.3}}>
            <InvoiceTable invoices={invoices} />
          </motion.div>
        </TabsContent>
        <TabsContent
          value='statistics'
          className='mt-6'>
          <motion.div
            key='statistics'
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -20}}
            transition={{duration: 0.3}}>
            <InvoiceStatistics invoices={invoices} />
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

