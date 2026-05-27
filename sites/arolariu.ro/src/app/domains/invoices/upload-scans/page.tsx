import {fetchAaaSUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale} from "next-intl/server";
import {getTranslations} from "next-intl-selector/server";
import {redirect} from "next/navigation";
import RenderUploadScansScreen from "./island";
import styles from "./page.module.scss";

/**
 * Generates SEO metadata for the scan upload page.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t((m) => m["IMS--UploadScans"].metadata.title),
    description: t((m) => m["IMS--UploadScans"].metadata.description),
  });
}

/**
 * Upload scans page - allows users to upload scans without creating invoices.
 *
 * @remarks
 * This page requires authentication since scans are stored with user metadata.
 * Unauthenticated users are redirected to sign-in.
 */
export default async function UploadScansPage(_props: Readonly<PageProps<"/domains/invoices/upload-scans">>): Promise<React.JSX.Element> {
  const {isAuthenticated} = await fetchAaaSUserFromAuthService();

  if (!isAuthenticated) {
    redirect("/auth/sign-in?redirect_url=/domains/invoices/upload-scans");
  }

  return (
    <div className={styles["page"]}>
      <RenderUploadScansScreen />
    </div>
  );
}
