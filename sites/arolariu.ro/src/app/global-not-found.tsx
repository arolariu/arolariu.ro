import {NotFoundContent, type NotFoundContentCopy} from "@/app/_components/GlobalNotFoundContent";
import {getCookie} from "@/lib/actions/cookies";
import {fetchAaaSUserFromAuthService} from "@/lib/actions/user/fetchUser";
import type {Metadata} from "next";
import type {AbstractIntlMessages} from "next-intl";
import {getTranslations} from "next-intl-selector/server";
import {getLocale, getMessages} from "next-intl/server";
import {headers} from "next/headers";
import styles from "./global-not-found.module.scss";
import ContextProviders from "./providers";
import Tracking from "./tracking";

export const metadata: Metadata = {
  title: "arolariu.ro | 404",
  description: "Page not found.",
};

/**
 * The 404 page.
 *
 * @remarks
 * Resolves request headers, locale, i18n messages, the current AaaS user,
 * and the `eula-accepted` cookie, then renders {@link NotFoundContent} with
 * the derived QR payload and localized copy inside the unchanged
 * `<html>`/`<body>` document shell and {@link ContextProviders} tree.
 *
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

  const copy: NotFoundContentCopy = {
    title: t((m) => m.app.errors.notFound.title),
    subtitle: t((m) => m.app.errors.notFound.subtitle),
    additionalInfo: t((m) => m.app.errors.notFound.additionalInfo),
    falsePositive: t((m) => m.app.errors.notFound.falsePositive),
    submitErrorButton: t((m) => m.app.errors.notFound.buttons.submitErrorButton),
    returnButton: t((m) => m.app.errors.notFound.buttons.returnButton),
  };

  return (
    <html
      suppressHydrationWarning
      lang={locale}
      dir='ltr'>
      <body className={styles["body"]}>
        <ContextProviders
          locale={locale}
          messages={messages as unknown as AbstractIntlMessages}>
          <NotFoundContent
            qrCodeData={qrCodeData}
            copy={copy}
          />
          {Boolean(eulaCookie) && <Tracking />}
        </ContextProviders>
      </body>
    </html>
  );
}
