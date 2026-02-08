import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {getCookie} from "@/lib/actions/cookies";
import {fetchAaaSUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {Button} from "@arolariu/components";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import {headers} from "next/headers";
import Link from "next/link";
import QRCode from "react-qr-code";
import styles from "./global-not-found.module.scss";
import ContextProviders from "./providers";
import Tracking from "./tracking";

// @ts-ignore -- css file has no typings.
import "@arolariu/components/styles.css";

// @ts-ignore -- scss file has no typings.
import "./globals.scss";

export const metadata: Metadata = {
  title: "arolariu.ro | 404",
  description: "Page not found.",
};

/**
 * The 404 page.
 * @returns The 404 page.
 */
export default async function NotFound(): Promise<React.JSX.Element> {
  const headersList = await headers();
  const locale = await getLocale();
  const {user} = await fetchAaaSUserFromAuthService();
  const t = await getTranslations("errors.404");
  const eulaCookie = await getCookie("eula-accepted");

  const qrCodeData = JSON.stringify({
    userId: user?.id ?? "0000",
    userAgent: headersList.get("user-agent") ?? "N/A",
    referrer: headersList.get("referer") ?? "unknown",
  });

  return (
    <html
      suppressHydrationWarning
      lang={locale}
      dir='ltr'>
      <body className={styles["body"]}>
        <ContextProviders locale={locale}>
          <Header />
          <div className={styles["pageContainer"]}>
            <section className={styles["heroContent"]}>
              <h1 className={styles["title"]}>{t("title")}</h1>
              <span className={styles["subtitle"]}>{t("subtitle")}</span>
            </section>
            <section className={styles["qrSection"]}>
              <h2 className={styles["qrTitle"]}>{t("additionalInfo")}</h2>
              <QRCode value={qrCodeData} />
            </section>
            <section className={styles["bottomSection"]}>
              <span className={styles["falsePositive"]}>{t("falsePositive")}</span>
              <div className={styles["buttonRow"]}>
                <Button
                  asChild
                  variant='outline'
                  className={styles["actionButton"]}>
                  <Link href='/'>{t("buttons.submitErrorButton")}</Link>
                </Button>
                <Button
                  asChild
                  className={styles["actionButton"]}>
                  <Link href='https://arolariu.ro/'>{t("buttons.returnButton")}</Link>
                </Button>
              </div>
            </section>
          </div>
          <Footer />
          {Boolean(eulaCookie) && <Tracking />}
        </ContextProviders>
      </body>
    </html>
  );
}
