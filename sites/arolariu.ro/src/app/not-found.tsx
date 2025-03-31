/** @format */

import {fetchUser} from "@/lib/actions/user/fetchUser";
import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import {headers} from "next/headers";
import Link from "next/link";
import QRCode from "react-qr-code";

export const metadata: Metadata = {
  title: "arolariu.ro | 404",
  description: "Page not found.",
};

/**
 * The 404 page.
 * @returns The 404 page.
 */
export default async function NotFound(): Promise<React.JSX.Element> {
  const {user} = await fetchUser();
  const headersList = await headers();
  const t = await getTranslations("errors.404");

  const qrCodeData = JSON.stringify({
    userId: user?.id ?? "0000",
    userAgent: headersList.get("user-agent") ?? "N/A",
    referrer: headersList.get("referer") ?? "unknown",
  });

  return (
    <main className='flex flex-col items-center justify-center justify-items-center px-5 py-24 text-xl 2xsm:text-lg'>
      <section className='flex w-1/2 flex-col items-center justify-center justify-items-center text-center'>
        <h1 className='mx-auto pb-8 2xsm:text-xl md:text-3xl'>{t("title")}</h1>
        <span className='text-balance'>{t("subtitle")}</span>
      </section>
      <section className='my-4 py-4'>
        <h2 className='my-4 text-center text-xl font-bold'>{t("additionalInfo")}</h2>
        <QRCode value={qrCodeData} />
      </section>
      <section>
        <span className='text-center text-xs'>{t("falsePositive")}</span>
        <div className='mt-4 flex items-center justify-between justify-items-center gap-4 2xsm:flex-col md:flex-row'>
          <Link
            href=''
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
  );
}
