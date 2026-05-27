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
import {useInvoices} from "../_hooks/invoice";

/**
 * Renders the interactive client island for invoice management with tabs.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` required).
 *
 * **Why Client Component?**
 * - Uses `useInvoices` hook for reactive invoice data
 * - Uses `useTranslations` hook for client-side i18n
 * - Requires `DialogProvider` context for modal/sheet management
 * - Needs tab state management and onClick handlers
 * - Uses Framer Motion for tab transition animations
 *
 * **Loading State**: Shows skeleton UI during initial data fetch from Zustand
 * store. The `useInvoices` hook returns `isLoading: true` while:
 * - IndexedDB hydration is in progress (first render)
 * - Store hasn't marked `hasHydrated: true` yet
 * - Typically completes in 50-200ms on modern devices
 *
 * **Tab Structure**:
 * 1. **Invoices**: Default tab showing table/grid view with search, filters, pagination
 * 2. **Statistics**: Analytics dashboard with charts, spending trends, category breakdowns
 * 3. **Live Analysis**: AI-powered insights using generative models for expense patterns
 *
 * **Context Hierarchy**:
 * - `DialogProvider` wraps all content to enable modal/sheet dialogs
 * - `InvoicesHeader` can trigger "Create Invoice" dialog
 * - `BulkActionsToolbar` can trigger bulk delete/export/share dialogs
 * - `DialogContainer` renders the active dialog with proper stacking
 *
 * **Animation**: Framer Motion provides smooth tab transitions:
 * - Fade in + slide up on tab enter (opacity: 0→1, y: 20→0)
 * - Fade out + slide up on tab exit (opacity: 1→0, y: 0→-20)
 * - 300ms duration for smooth perception
 *
 * **Performance**:
 * - Data fetched once via `useInvoices` and passed to all tab views
 * - No per-tab data fetching (reduces API calls)
 * - Zustand store provides instant access after initial hydration
 * - Motion animations use GPU-accelerated transforms
 *
 * **Internationalization**: Uses `next-intl` for tab labels and UI strings.
 * Translation keys from `pages.invoices.viewInvoices.viewInvoicesIsland` namespace.
 *
 * @returns Interactive JSX with tab navigation, invoice views, and dialog system.
 * During loading, returns skeleton UI with header, tabs, and card placeholders.
 * After loading, returns full invoice management interface with three tab views
 * wrapped in dialog context for modal/sheet operations.
 *
 * @example
 * ```tsx
 * // Rendered by page.tsx after auth check
 * export default async function ViewInvoicesPage() {
 *   const {user} = await fetchAaaSUserFromAuthService();
 *
 *   return (
 *     <div>
 *       <h1>Your Invoices, {user.fullName}</h1>
 *       <Suspense fallback={<LoadingSkeleton />}>
 *         <RenderViewInvoicesScreen /> // This component
 *       </Suspense>
 *     </div>
 *   );
 * }
 *
 * // Flow on first render:
 * // 1. Component mounts, useInvoices returns {invoices: [], isLoading: true}
 * // 2. Skeleton UI displays (header + 3 tabs + 3 cards)
 * // 3. IndexedDB hydration completes (~50-200ms)
 * // 4. useInvoices returns {invoices: [...], isLoading: false}
 * // 5. Full UI renders with default "invoices" tab active
 * // 6. User clicks "statistics" tab → Motion animates transition
 *
 * // Dialog flow:
 * // 1. User clicks "Create Invoice" in InvoicesHeader
 * // 2. DialogProvider updates context state
 * // 3. DialogContainer renders CreateInvoiceDialog modal
 * // 4. User submits form → Dialog closes → Invoices view refreshes
 * ```
 *
 * @see {@link useInvoices} - Hook for Zustand store access and hydration
 * @see {@link DialogProvider} - Context provider for modal/sheet state
 * @see {@link InvoicesHeader} - Header with title and action buttons
 * @see {@link RenderInvoicesView} - Main invoices table/grid view
 * @see {@link RenderStatisticsView} - Analytics dashboard view
 * @see {@link RenderGenerativeView} - AI-powered analysis view
 * @see {@link BulkActionsToolbar} - Floating toolbar for multi-select actions
 * @see {@link DialogContainer} - Renders active modal/sheet dialogs
 * @see RFC 1003 - Internationalization system (next-intl usage)
 * @see RFC 1005 - State management (Zustand patterns)
 * @see RFC 2001 - Domain-Driven Design (invoices bounded context)
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
