import {fetchAaaSUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import {redirect} from "next/navigation";
import RenderCreateInvoiceScreen from "./island";
import styles from "./page.module.scss";

/**
 * Generates SEO metadata for the create invoice page.
 *
 * @returns Promise resolving to page metadata
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Invoices.CreateInvoice.metadata");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Create invoice page - allows authenticated users to create new invoices from existing scans.
 *
 * @remarks
 * This page implements a multi-step wizard workflow:
 * 1. Select scans from available READY scans
 * 2. Enter invoice details (name, category, payment info, date)
 * 3. Review and confirm invoice creation
 *
 * **Authentication:**
 * Requires authentication since invoices are user-owned entities.
 * Unauthenticated users are redirected to sign-in with return URL.
 *
 * **Data Flow:**
 * - Fetches available scans from Zustand store (IndexedDB-persisted)
 * - Creates invoice via server action with selected scans
 * - Optionally triggers AI analysis post-creation
 * - Redirects to view-invoice page on success
 *
 * @returns Promise resolving to the page JSX element
 */
export default async function CreateInvoicePage(): Promise<React.JSX.Element> {
  const {isAuthenticated} = await fetchAaaSUserFromAuthService();

  if (!isAuthenticated) {
    redirect("/auth/sign-in?redirect_url=/domains/invoices/create-invoice");
  }

  return (
    <div className={styles["page"]}>
      <RenderCreateInvoiceScreen />
    </div>
  );
}
