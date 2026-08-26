"use client";

import "@arolariu/components/styles.css";

import "../globals.scss";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import Link from "next/link";
import {useCallback, useState} from "react";
import {TbAlertTriangle, TbClipboard, TbClipboardCheck, TbHome, TbRefresh} from "react-icons/tb";
import QRCode from "react-qr-code";
import styles from "../global-error.module.scss";

/**
 * Props accepted by {@link GlobalErrorContent}.
 */
export interface GlobalErrorContentProps {
  /** The thrown error, optionally carrying a Next.js digest identifier. */
  readonly error: Error & {readonly digest?: string};
  /** Callback that attempts to re-render the segment that errored. */
  readonly reset: () => void;
}

/**
 * Renders the localized global error UX content (hero, error details card,
 * diagnostics QR code, and recovery actions) without the surrounding
 * `<html>`/`<body>` document shell.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"`, inherited from the module).
 *
 * Extracted as a named export so it can be mounted directly — e.g. in Storybook —
 * without requiring the full document shell rendered by Next.js' global error
 * convention. Consumers must still provide the same context this content relies
 * on at runtime (`ClerkProvider` via `Header`, `next-themes`, and `next-intl`).
 *
 * @param props - Component props.
 * @param props.error - The thrown error, optionally carrying a Next.js `digest` identifier.
 * @param props.reset - Callback that attempts to re-render the segment that errored.
 * @returns The error hero, details card, diagnostics QR code, and recovery actions.
 *
 * @example
 * ```tsx
 * <ContextProviders locale='en'>
 *   <GlobalErrorContent
 *     error={new Error("Something broke")}
 *     reset={() => location.reload()}
 *   />
 * </ContextProviders>
 * ```
 *
 * @see `../global-error.tsx` for the full document-shell boundary that renders this content.
 */
export function GlobalErrorContent({error, reset}: GlobalErrorContentProps): React.JSX.Element {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const t = useTranslations();
  const errorContext = String(
    JSON.stringify(
      {
        errorId: error.digest ?? "NO_DIGEST",
        errorMessage: error.message,
        timestamp: new Date().toISOString(),
        userAgent: globalThis.window.navigator.userAgent,
        url: globalThis.window.location.href,
        locale: globalThis.window.navigator.language,
      },
      null,
      2,
    ),
  );

  /**
   * Handles copying the error digest to clipboard for support purposes.
   * Provides visual feedback via icon change and temporary state.
   */
  const handleCopyErrorId = useCallback(async (): Promise<void> => {
    const errorId = error.digest ?? "NO_ERROR_ID";

    try {
      await globalThis.navigator.clipboard.writeText(errorId);
      setIsCopied(true);

      // Reset icon after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (clipboardError) {
      console.error(
        t((m) => m.app.errors.globalError.copyErrorConsoleMessage),
        clipboardError,
      );
    }
  }, [error.digest, t]);

  /**
   * Handles the reset action with telemetry tracking.
   * Calls the provided reset function to attempt recovery.
   */
  const handleReset = useCallback((): void => {
    reset();
  }, [reset]);

  return (
    <>
      <Header />

      <div className={styles["pageContainer"]}>
        {/* Hero Section - Error Icon */}
        <section className={styles["heroSection"]}>
          <div className={styles["iconCircle"]}>
            <TbAlertTriangle className={styles["heroIcon"]} />
          </div>
          <h1 className={styles["heroTitle"]}>{t((m) => m.app.errors.globalError.hero.title)}</h1>
          <p className={styles["heroSubtitle"]}>{t((m) => m.app.errors.globalError.hero.subtitle)}</p>
        </section>

        {/* Error Details Card */}
        <Card className={styles["errorCard"]}>
          <CardHeader>
            <CardTitle className={styles["cardTitleWrapper"]}>
              <TbAlertTriangle className={styles["cardTitleIcon"]} />
              {t((m) => m.app.errors.globalError.details.title)}
            </CardTitle>
            <CardDescription>
              {error.digest ? (
                <>
                  {t((m) => m.app.errors.globalError.details.errorIdLabel)} <code className={styles["errorCode"]}>{error.digest}</code>
                </>
              ) : (
                t((m) => m.app.errors.globalError.details.genericDescription)
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className={styles["contentSpacing"]}>
            {/* Error Message Alert */}
            <Alert variant='destructive'>
              <AlertTitle className={styles["alertTitleInner"]}>
                <TbAlertTriangle className={styles["alertIcon"]} />
                {t((m) => m.app.errors.globalError.details.whatHappenedTitle)}
              </AlertTitle>
              <AlertDescription className={styles["alertDescription"]}>
                <p className={styles["errorMessage"]}>{error.message || t((m) => m.app.errors.globalError.details.unknownError)}</p>
              </AlertDescription>
            </Alert>

            {/* What to do section */}
            <div className={styles["infoBox"]}>
              <h3 className={styles["infoTitle"]}>{t((m) => m.app.errors.globalError.actions.whatCanYouDoTitle)}</h3>
              <ul className={styles["infoList"]}>
                <li>{t((m) => m.app.errors.globalError.actions.step1)}</li>
                <li>{t((m) => m.app.errors.globalError.actions.step2)}</li>
                <li>{t((m) => m.app.errors.globalError.actions.step3)}</li>
              </ul>
            </div>

            {/* QR Code with Diagnostic Data */}
            <div className={styles["qrSection"]}>
              <p className={styles["qrLabel"]}>{t((m) => m.app.errors.globalError.diagnostics.scanLabel)}</p>
              <QRCode
                value={errorContext}
                size={128}
                className={styles["qrCode"]}
              />
            </div>

            {/* Technical Details (Collapsible) */}
            <details className={styles["technicalDetails"]}>
              <summary className={styles["technicalSummary"]}>{t((m) => m.app.errors.globalError.diagnostics.technicalSummary)}</summary>
              <div className={styles["technicalContent"]}>
                <pre className={styles["preBlock"]}>
                  <code>{errorContext}</code>
                </pre>
                {Boolean(error.stack) && (
                  <>
                    <h4 className={styles["stackTitle"]}>{t((m) => m.app.errors.globalError.diagnostics.stackTraceLabel)}</h4>
                    <pre className={styles["preBlock"]}>
                      <code>{error.stack}</code>
                    </pre>
                  </>
                )}
              </div>
            </details>
          </CardContent>

          <CardFooter className={styles["cardFooterInner"]}>
            {/* Primary Action - Try Again */}
            <Button
              onClick={handleReset}
              variant='default'
              size='default'
              className={styles["actionButton"]}>
              <TbRefresh className={styles["buttonIcon"]} />
              {t((m) => m.app.errors.globalError.buttons.tryAgain)}
            </Button>

            {/* Secondary Action - Return Home */}
            <Button
              variant='outline'
              size='default'
              className={styles["actionButton"]}
              asChild>
              <Link
                href='/'
                onClick={handleReset}>
                <TbHome className={styles["buttonIcon"]} />
                {t((m) => m.app.errors.globalError.buttons.returnHome)}
              </Link>
            </Button>

            {/* Tertiary Action - Copy Error ID */}
            {Boolean(error.digest) && (
              <Button
                onClick={handleCopyErrorId}
                variant='ghost'
                size='default'
                className={styles["actionButton"]}
                title={t((m) => m.app.errors.globalError.buttons.copyErrorIdTitle)}>
                {isCopied ? (
                  <>
                    <TbClipboardCheck className={styles["buttonIcon"]} />
                    {t((m) => m.app.errors.globalError.buttons.copied)}
                  </>
                ) : (
                  <>
                    <TbClipboard className={styles["buttonIcon"]} />
                    {t((m) => m.app.errors.globalError.buttons.copyErrorId)}
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Additional Help Section */}
        <section className={styles["helpSection"]}>
          <p className={styles["helpText"]}>
            {t((m) => m.app.errors.globalError.support.contactPrefix)}{" "}
            <a
              href='mailto:support@arolariu.ro'
              className={styles["helpLink"]}>
              admin@arolariu.ro
            </a>
            {Boolean(error.digest) && (
              <>
                {" "}
                {t((m) => m.app.errors.globalError.support.includeErrorId)} <code className={styles["helpErrorCode"]}>{error.digest}</code>
              </>
            )}
          </p>
        </section>
      </div>
      <Footer />
    </>
  );
}
