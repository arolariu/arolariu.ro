import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {getCookie} from "@/lib/actions/cookies";
import {fetchAaaSUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {Button} from "@arolariu/components";
import type {Metadata} from "next";
import type {AbstractIntlMessages} from "next-intl";
import {getLocale, getMessages} from "next-intl/server";
import {getTranslations} from "next-intl-selector/server";
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
  const messages = await getMessages();
  const {user} = await fetchAaaSUserFromAuthService();
  const t = await getTranslations();
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
        <ContextProviders
          locale={locale}
          messages={messages as unknown as AbstractIntlMessages}>
          <Header />
          <div className={styles["pageContainer"]}>
            <section className={styles["heroContent"]}>
              <h1 className={styles["title"]}>{t((m) => m.app.errors.notFound.title)}</h1>
              <span className={styles["subtitle"]}>{t((m) => m.app.errors.notFound.subtitle)}</span>
            </section>
            <section className={styles["qrSection"]}>
              <h2 className={styles["qrTitle"]}>{t((m) => m.app.errors.notFound.additionalInfo)}</h2>
              <QRCode value={qrCodeData} />
            </section>
            <section className={styles["bottomSection"]}>
              <span className={styles["falsePositive"]}>{t((m) => m.app.errors.notFound.falsePositive)}</span>
              <div className={styles["buttonRow"]}>
                <Button
                  asChild
                  variant='outline'
                  className={styles["actionButtonOutline"]}>
                  <Link href='/'>{t((m) => m.app.errors.notFound.buttons.submitErrorButton)}</Link>
                </Button>
                <Button
                  asChild
                  className={styles["actionButtonDefault"]}>
                  <Link href='https://arolariu.ro/'>{t((m) => m.app.errors.notFound.buttons.returnButton)}</Link>
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
