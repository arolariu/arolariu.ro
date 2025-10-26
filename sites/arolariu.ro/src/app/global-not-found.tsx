import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {getCookie} from "@/lib/actions/cookies";
import {fetchUser} from "@/lib/actions/user/fetchUser";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import {headers} from "next/headers";
import Link from "next/link";
import QRCode from "react-qr-code";
import ContextProviders from "./providers";
import Tracking from "./tracking";

// @ts-ignore -- css file has no typings.
import "@arolariu/components/styles.css";

// @ts-ignore -- css file has no typings.
import "./globals.css";

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
  const {user} = await fetchUser();
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
      <body className='bg-white text-black dark:bg-black dark:text-white'>
        <ContextProviders locale={locale}>
          <Header />
          <main className='2xsm:text-lg flex flex-col items-center justify-center justify-items-center px-5 py-24 text-xl'>
            <section className='flex w-1/2 flex-col items-center justify-center justify-items-center text-center'>
              <h1 className='2xsm:text-xl mx-auto pb-8 md:text-3xl'>{t("title")}</h1>
              <span className='text-balance'>{t("subtitle")}</span>
            </section>
            <section className='my-4 py-4'>
              <h2 className='my-4 text-center text-xl font-bold'>{t("additionalInfo")}</h2>
              <QRCode value={qrCodeData} />
            </section>
            <section>
              <span className='text-center text-xs'>{t("falsePositive")}</span>
              <div className='2xsm:flex-col mt-4 flex items-center justify-between justify-items-center gap-4 md:flex-row'>
                <Link
                  href='/'
                  className='btn btn-secondary mx-auto'>
                  {t("buttons.submitErrorButton")}
                </Link>
                <Link
                  href='https://arolariu.ro/'
                  className='btn btn-primary mx-auto'>
                  {t("buttons.returnButton")}
                </Link>
              </div>
            </section>
          </main>
          <Footer />
          {Boolean(eulaCookie) && <Tracking />}
        </ContextProviders>
      </body>
    </html>
  );
}
