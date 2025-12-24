"use client";

import type {Invoice, Merchant} from "@/types/invoices";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import {motion, type Variants} from "motion/react";
import {TbShoppingCart, TbToolsKitchen} from "react-icons/tb";
import DialogContainer from "../../_contexts/DialogContainer";
import {DialogProvider} from "../../_contexts/DialogContext";
import ImageCard from "./_components/cards/ImageCard";
import InvoiceCard from "./_components/cards/InvoiceCard";
import MerchantCard from "./_components/cards/MerchantCard";
import SharingCard from "./_components/cards/SharingCard";
import InvoiceHeader from "./_components/InvoiceHeader";
import MetadataTab from "./_components/tabs/MetadataTab";
import RecipesTab from "./_components/tabs/RecipesTab";
import {EditInvoiceContextProvider} from "./_context/EditInvoiceContext";

type Props = Readonly<{
  readonly invoice: Invoice;
  readonly merchant: Merchant;
}>;

/**
 * Renders the interactive invoice editing screen with tabbed navigation and dialog-based editing.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive at file top).
 *
 * **Why Client Component?**
 * - Uses Framer Motion for staggered animations and micro-interactions
 * - Manages dialog state via `DialogProvider` context
 * - Requires interactive tab switching and hover effects
 *
 * **Layout Structure**:
 * - **Header**: Editable invoice name, print button (via `InvoiceHeader`)
 * - **Main Content** (2/3 width on desktop):
 *   - Invoice details card with items table
 *   - Tabbed interface for recipes and metadata
 *   - Spending analytics with charts
 * - **Sidebar** (1/3 width on desktop):
 *   - Receipt image preview with zoom
 *   - Merchant information and navigation
 *   - Sharing controls and user access management
 *
 * **Dialog System**: Wraps content in `DialogProvider` and renders `DialogContainer`
 * at the bottom. All editing operations (items, merchant, sharing, metadata) use
 * dialog-based UX for focused editing without page navigation.
 *
 * **Animation**: Uses Framer Motion `containerVariants` and `itemVariants` for
 * coordinated staggered entrance animations with spring physics.
 *
 * **Domain Context**: Part of the invoices bounded context (RFC 2001). Provides
 * the primary interface for invoice modification after initial creation.
 *
 * @param props - Component properties containing pre-fetched invoice and merchant data
 * @returns Client-rendered JSX element containing the full invoice editing interface
 *
 * @example
 * ```tsx
 * // Used in page.tsx after server-side data fetching:
 * <RenderEditInvoiceScreen invoice={invoice} merchant={merchant} />
 * ```
 *
 * @see {@link DialogProvider} - Context provider for dialog state management
 * @see {@link DialogContainer} - Renders active dialog based on context state
 * @see RFC 2001 - Domain-Driven Design Architecture (invoices bounded context)
 */
export default function RenderEditInvoiceScreen(props: Readonly<Props>): React.JSX.Element {
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
      <EditInvoiceContextProvider
        invoice={invoice}
        merchant={merchant}>
        <section className='container mx-auto py-12'>
          {/* Header */}
          <InvoiceHeader />

          <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
            <motion.div
              variants={containerVariants}
              initial='hidden'
              animate='visible'
              className='space-y-6 md:col-span-2'>
              <InvoiceCard />

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
      </EditInvoiceContextProvider>
      <DialogContainer />
    </DialogProvider>
  );
}
