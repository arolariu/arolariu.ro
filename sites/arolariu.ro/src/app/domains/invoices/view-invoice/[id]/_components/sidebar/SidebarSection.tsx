/** @format */

"use client";

import {Invoice, Merchant} from "@/types/invoices";
import {motion} from "motion/react";
import {ImageCard} from "../cards/ImageCard";
import MerchantCard from "../cards/MerchantCard";
import {SharingCard} from "../cards/SharingCard";

type Props = {
  invoice: Invoice;
  merchant: Merchant;
};

/**
 * The sidebar section of the invoice view page.
 * This section contains the image card, merchant card, and sharing card.
 * It is animated using Framer Motion.
 * @returns The sidebar section component, CSR'ed.
 */
export function SidebarSection({invoice, merchant}: Readonly<Props>) {
  // Animation variants for the sidebar section
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
  );
}
