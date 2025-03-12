/** @format */

"use client";

import {FakeInvoice, FakeMerchant} from "@/data/mocks/invoices";
import {type Recipe, RecipeComplexity} from "@/types/invoices";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import {AnimatePresence, motion} from "framer-motion";
import {useRef, useState} from "react";
import {TbShoppingCart, TbToolsKitchen} from "react-icons/tb";
import {AnalyticsCard} from "./_components/cards/AnalyticsCard";
import {InvoiceCard} from "./_components/cards/InvoiceCard";
import {InvoiceHeader} from "./_components/InvoiceHeader";
import {SidebarSection} from "./_components/sidebar/SidebarSection";
import {MetadataTab} from "./_components/tabs/MetadataTab";
import {RecipesTab} from "./_components/tabs/RecipesTab";

/**
 * This function renders the view invoice page.
 * @returns The JSX for the view invoice page.
 */
export default function RenderViewInvoiceScreen({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>) {
  // Reference for printing
  const printRef = useRef<HTMLDivElement>(null);

  // Invoice data (mocked for this example)
  const invoice = FakeInvoice;

  // Merchant data
  const merchant = FakeMerchant;

  const [selectedDialogMode, setSelectedDialogMode] = useState<"add" | "edit" | "view">("view");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe>({
    name: "",
    ingredients: [],
    instructions: "",
    preparationTime: -1,
    cookingTime: -1,
    description: "",
    duration: "0",
    complexity: RecipeComplexity.Unknown,
    referenceForMoreDetails: "",
  } satisfies Recipe);
  const [selectedMetadata, setSelectedMetadata] = useState<Record<string, string>>({
    name: "",
    value: "",
  } satisfies Record<string, string>);

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
    <section
      className='container mx-auto py-12'
      ref={printRef}>
      {/* Header */}
      <InvoiceHeader
        invoice={invoice}
        onCurrencyChange={() => {}}
        onPrint={() => {}}
        onToggleFavorite={() => {}}
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
                <TabsTrigger value='recipes'>
                  <TbToolsKitchen className='mr-2 h-4 w-4' />
                  Possible Recipes
                </TabsTrigger>
                <TabsTrigger value='metadata'>
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

      {/* Analyze Invoice Button */}

      {/* All Dialogs */}
      {/* <DialogContainer
          invoice={invoice}
          merchant={merchant}
          selectedMode={selectedDialogMode}
          selectedRecipe={selectedRecipe}
          selectedMetadata={selectedMetadata}
        /> */}
    </section>
  );
}
