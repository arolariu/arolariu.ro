/** @format */

"use client";

import {FakeInvoice, FakeMerchant} from "@/data/mocks/invoices";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useRef} from "react";
import {TbShoppingCart, TbToolsKitchen} from "react-icons/tb";
import DialogContainer from "../../_contexts/DialogContainer";
import {DialogProvider} from "../../_contexts/DialogContext";
import {AnalyticsCard} from "./_components/cards/AnalyticsCard";
import InvoiceCard from "./_components/cards/InvoiceCard";
import InvoiceHeader from "./_components/InvoiceHeader";
import SidebarSection from "./_components/sidebar/SidebarSection";
import MetadataTab from "./_components/tabs/MetadataTab";
import RecipesTab from "./_components/tabs/RecipesTab";

/**
 * This function renders the view invoice page.
 * @returns The JSX for the view invoice page.
 */
export default function RenderViewInvoiceScreen({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>) {
  const printRef = useRef<HTMLDivElement>(null);

  // Invoice data (mocked for this example)
  const invoice = FakeInvoice;

  // Merchant data (mocked for this example)
  const merchant = FakeMerchant;

  // Animation variants for Framer Motion
  const containerVariants = {
    hidden: {opacity: 0},
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: {y: 20, opacity: 0},
    visible: {
      y: 0,
      opacity: 1,
      transition: {type: "spring", stiffness: 300, damping: 24},
    },
  };

  return (
    <DialogProvider>
      <section
        className='container mx-auto py-12'
        ref={printRef}>
        {/* Header */}
        <InvoiceHeader
          invoice={invoice}
          onPrint={() => {}}
        />

        <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
          <motion.div
            variants={containerVariants}
            initial='hidden'
            animate='visible'
            className='space-y-6 md:col-span-2'>
            <InvoiceCard
              invoice={invoice}
              merchant={merchant}
            />

            {/* Tabs for Recipes and Metadata */}
            <motion.div variants={itemVariants}>
              <Tabs defaultValue='recipes'>
                <TabsList className='grid w-full grid-cols-2'>
                  <TabsTrigger
                    value='recipes'
                    className='cursor-pointer'>
                    <TbToolsKitchen className='mr-2 h-4 w-4' />
                    Possible Recipes
                  </TabsTrigger>
                  <TabsTrigger
                    value='metadata'
                    className='cursor-pointer'>
                    <TbShoppingCart className='mr-2 h-4 w-4' />
                    Additional Info
                  </TabsTrigger>
                </TabsList>

                <AnimatePresence mode='wait'>
                  <TabsContent
                    value='recipes'
                    className='mt-4'>
                    <RecipesTab recipes={invoice.possibleRecipes} />
                  </TabsContent>

                  <TabsContent
                    value='metadata'
                    className='mt-4'>
                    <MetadataTab metadata={invoice.additionalMetadata} />
                  </TabsContent>
                </AnimatePresence>
              </Tabs>
            </motion.div>

            {/* Expanded Statistics Card */}
            <motion.div variants={itemVariants}>
              <AnalyticsCard
                invoice={invoice}
                merchant={merchant}
              />
            </motion.div>
          </motion.div>

          {/* Right column - Sidebar */}
          <motion.div variants={itemVariants}>
            <SidebarSection
              invoice={invoice}
              merchant={merchant}
            />
          </motion.div>
        </div>
      </section>
      <DialogContainer />
    </DialogProvider>
  );
}
