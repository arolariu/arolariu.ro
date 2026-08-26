"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {Button} from "@arolariu/components";
import Link from "next/link";
import QRCode from "react-qr-code";
import styles from "../global-not-found.module.scss";

import "@arolariu/components/styles.css";

import "../globals.scss";

/**
 * Localized copy required by {@link NotFoundContent}, resolved server-side
 * via `getTranslations()` before the component ever renders.
 */
export interface NotFoundContentCopy {
  /** Large "404" hero title. */
  title: string;
  /** Hero subtitle explaining the page is missing. */
  subtitle: string;
  /** Heading above the diagnostics QR code. */
  additionalInfo: string;
  /** Prompt shown above the recovery actions. */
  falsePositive: string;
  /** Label for the "submit error report" action, linking home. */
  submitErrorButton: string;
  /** Label for the "return to homepage" action. */
  returnButton: string;
}

/**
 * Props accepted by {@link NotFoundContent}.
 */
export interface NotFoundContentProps {
  /** Pre-serialized JSON payload (userId, user agent, referrer) encoded into the diagnostics QR code. */
  qrCodeData: string;
  /** Already-resolved localized copy for every visible string on the page. */
  copy: NotFoundContentCopy;
}

/**
 * Renders the visible 404 page content — `Header`, hero/QR/action sections,
 * and `Footer` — as a pure, side-effect-free component.
 *
 * @remarks
 * **Rendering Context**: Can be rendered anywhere `Header`/`Footer`'s own
 * requirements (Clerk auth context, `next-themes`, `next-intl`) are already
 * satisfied by an ancestor, e.g. {@link ContextProviders}.
 *
 * Extracted as a named export, separate from the `async` default-exported
 * {@link NotFound} Server Component, so it can be mounted directly — e.g. in
 * Storybook — without requiring `headers()`, `getLocale()`, `getMessages()`,
 * `fetchAaaSUserFromAuthService()`, or `getCookie()`, none of which are
 * available outside a real Next.js request. All request-derived data
 * (QR payload, localized copy) is resolved once by {@link NotFound} and
 * passed in as plain, typed props.
 *
 * @param props - Component props.
 * @param props.qrCodeData - Pre-serialized JSON diagnostics payload for the QR code.
 * @param props.copy - Already-resolved localized strings for every visible section.
 * @returns The 404 page's `Header`, hero/QR/action sections, and `Footer`.
 *
 * @example
 * ```tsx
 * <NotFoundContent
 *   qrCodeData={JSON.stringify({userId: "0000", userAgent: "N/A", referrer: "unknown"})}
 *   copy={{
 *     title: "404",
 *     subtitle: "Page not found",
 *     additionalInfo: "Additional Information",
 *     falsePositive: "Think this is an error?",
 *     submitErrorButton: "Submit Error Report",
 *     returnButton: "Return to Homepage",
 *   }}
 * />
 * ```
 *
 * @see `../global-not-found.tsx` for the full document-shell boundary that resolves props for this content.
 */
export function NotFoundContent({qrCodeData, copy}: Readonly<NotFoundContentProps>): React.JSX.Element {
  return (
    <>
      <Header />
      <div className={styles["pageContainer"]}>
        <section className={styles["heroContent"]}>
          <h1 className={styles["title"]}>{copy.title}</h1>
          <span className={styles["subtitle"]}>{copy.subtitle}</span>
        </section>
        <section className={styles["qrSection"]}>
          <h2 className={styles["qrTitle"]}>{copy.additionalInfo}</h2>
          <QRCode value={qrCodeData} />
        </section>
        <section className={styles["bottomSection"]}>
          <span className={styles["falsePositive"]}>{copy.falsePositive}</span>
          <div className={styles["buttonRow"]}>
            <Button
              asChild
              variant='outline'
              className={styles["actionButtonOutline"]}>
              <Link href='/'>{copy.submitErrorButton}</Link>
            </Button>
            <Button
              asChild
              className={styles["actionButtonDefault"]}>
              <Link href='https://arolariu.ro/'>{copy.returnButton}</Link>
            </Button>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
