"use client";

import type {Invoice, Merchant} from "@/types/invoices";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import {motion, type Variants} from "motion/react";
import {TbShoppingCart, TbToolsKitchen} from "react-icons/tb";
import DialogContainer from "../../_contexts/DialogContainer";
import {DialogProvider} from "../../_contexts/DialogContext";
import {AnalyticsCard} from "./_components/cards/AnalyticsCard";
import ImageCard from "./_components/cards/ImageCard";
import InvoiceCard from "./_components/cards/InvoiceCard";
import MerchantCard from "./_components/cards/MerchantCard";
import SharingCard from "./_components/cards/SharingCard";
import InvoiceHeader from "./_components/InvoiceHeader";
import MetadataTab from "./_components/tabs/MetadataTab";
import RecipesTab from "./_components/tabs/RecipesTab";

type Props = Readonly<{
  readonly invoice: Invoice;
  readonly merchant: Merchant;
}>;

/**
 * This function renders the view invoice page.
 * @returns The JSX for the view invoice page.
 */
export default function RenderViewInvoiceScreen(props: Readonly<Props>): React.JSX.Element {
  const {invoice, merchant} = props;

  const containerVariants: Variants = {
    hidden: {opacity: 0},
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: {y: 20, opacity: 0},
    visible: {
      y: 0,
      opacity: 1,
      transition: {type: "spring", stiffness: 300, damping: 24},
    },
  };

  return (
    <DialogProvider>
      <section className='container mx-auto py-12'>
        {/* Header */}
        <InvoiceHeader invoice={invoice} />

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
            <motion.div
              variants={containerVariants}
              initial='hidden'
              animate='visible'
              className='space-y-6'>
              <motion.div variants={itemVariants}>
                <ImageCard invoice={invoice} />
              </motion.div>

              <motion.div variants={itemVariants}>
                <MerchantCard merchant={merchant} />
              </motion.div>

              <motion.div variants={itemVariants}>
                <SharingCard invoice={invoice} />
              </motion.div>

              <motion.div variants={itemVariants}>
                {/* <SavingsTipsCard
                      merchantName={merchantName}
                      totalSpent={totalSpent}
                      currency={currency}
                      isLoadingCurrency={isLoadingCurrency}
                    /> */}
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>
      <DialogContainer />
    </DialogProvider>
  );
}
