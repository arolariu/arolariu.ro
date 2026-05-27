import {fetchAaaSUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale} from "next-intl/server";
import {getTranslations} from "next-intl-selector/server";
import {redirect} from "next/navigation";
import RenderViewScansScreen from "./island";
import styles from "./page.module.scss";

/** Generates SEO metadata for the view scans page. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t((m) => m.pages.invoices.viewScans.metadata.title),
    description: t((m) => m.pages.invoices.viewScans.metadata.description),
  });
}

/**
 * View scans page - displays uploaded scans and allows invoice creation.
 *
 * @remarks
 * This page requires authentication since scans are user-specific.
 * Unauthenticated users are redirected to sign-in.
 */
export default async function ViewScansPage(_props: Readonly<PageProps<"/domains/invoices/view-scans">>): Promise<React.JSX.Element> {
  const {isAuthenticated} = await fetchAaaSUserFromAuthService();

  if (!isAuthenticated) {
    redirect("/auth/sign-in?redirect_url=/domains/invoices/view-scans");
  }

  return (
    <div className={styles["page"]}>
      <RenderViewScansScreen />
    </div>
  );
}
