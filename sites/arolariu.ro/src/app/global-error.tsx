"use client";

// @ts-ignore -- css file has no typings.
import "@arolariu/components/styles.css";

// @ts-ignore -- scss file has no typings.
import "./globals.scss";

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
import {Locale, useTranslations} from "next-intl";
import Link from "next/link";
import {useCallback, useEffect, useState} from "react";
import {TbAlertTriangle, TbClipboard, TbClipboardCheck, TbHome, TbRefresh} from "react-icons/tb";
import QRCode from "react-qr-code";
import styles from "./global-error.module.scss";
import ContextProviders from "./providers";
import Tracking from "./tracking";

interface GlobalErrorProps {
  error: Error & {digest?: string};
  reset: () => void;
}

const SUPPORTED_LOCALES: ReadonlySet<Locale> = new Set<Locale>(["en", "ro", "fr"]);

function detectLocale(): Locale {
  const browserLocale = globalThis.window.navigator.language.split("-")[0] as Locale;
  return SUPPORTED_LOCALES.has(browserLocale) ? browserLocale : "en";
}

function GlobalErrorDocumentTitle(): null {
  const t = useTranslations("errors.globalError");

  useEffect(() => {
    globalThis.document.title = t("metadata.title");
  }, [t]);

  return null;
}

function GlobalErrorContent({error, reset}: Readonly<GlobalErrorProps>): React.JSX.Element {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const t = useTranslations("errors.globalError");
  const errorContext = JSON.stringify(
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
      console.error(t("copyErrorConsoleMessage"), clipboardError);
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
          <h1 className={styles["heroTitle"]}>{t("hero.title")}</h1>
          <p className={styles["heroSubtitle"]}>{t("hero.subtitle")}</p>
        </section>

        {/* Error Details Card */}
        <Card className={styles["errorCard"]}>
          <CardHeader>
            <CardTitle className={styles["cardTitleWrapper"]}>
              <TbAlertTriangle className={styles["cardTitleIcon"]} />
              {t("details.title")}
            </CardTitle>
            <CardDescription>
              {error.digest ? (
                <>
                  {t("details.errorIdLabel")} <code className={styles["errorCode"]}>{error.digest}</code>
                </>
              ) : (
                t("details.genericDescription")
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className={styles["contentSpacing"]}>
            {/* Error Message Alert */}
            <Alert variant='destructive'>
              <AlertTitle className={styles["alertTitleInner"]}>
                <TbAlertTriangle className={styles["alertIcon"]} />
                {t("details.whatHappenedTitle")}
              </AlertTitle>
              <AlertDescription className={styles["alertDescription"]}>
                <p className={styles["errorMessage"]}>{error.message || t("details.unknownError")}</p>
              </AlertDescription>
            </Alert>

            {/* What to do section */}
            <div className={styles["infoBox"]}>
              <h3 className={styles["infoTitle"]}>{t("actions.whatCanYouDoTitle")}</h3>
              <ul className={styles["infoList"]}>
                <li>{t("actions.step1")}</li>
                <li>{t("actions.step2")}</li>
                <li>{t("actions.step3")}</li>
              </ul>
            </div>

            {/* QR Code with Diagnostic Data */}
            {Boolean(errorContext) && (
              <div className={styles["qrSection"]}>
                <p className={styles["qrLabel"]}>{t("diagnostics.scanLabel")}</p>
                <QRCode
                  value={errorContext}
                  size={128}
                  className={styles["qrCode"]}
                />
              </div>
            )}

            {/* Technical Details (Collapsible) */}
            <details className={styles["technicalDetails"]}>
              <summary className={styles["technicalSummary"]}>{t("diagnostics.technicalSummary")}</summary>
              <div className={styles["technicalContent"]}>
                <pre className={styles["preBlock"]}>
                  <code>{errorContext || t("diagnostics.loading")}</code>
                </pre>
                {Boolean(error.stack) && (
                  <>
                    <h4 className={styles["stackTitle"]}>{t("diagnostics.stackTraceLabel")}</h4>
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
              {t("buttons.tryAgain")}
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
                {t("buttons.returnHome")}
              </Link>
            </Button>

            {/* Tertiary Action - Copy Error ID */}
            {Boolean(error.digest) && (
              <Button
                onClick={handleCopyErrorId}
                variant='ghost'
                size='default'
                className={styles["actionButton"]}
                title={t("buttons.copyErrorIdTitle")}>
                {isCopied ? (
                  <>
                    <TbClipboardCheck className={styles["buttonIcon"]} />
                    {t("buttons.copied")}
                  </>
                ) : (
                  <>
                    <TbClipboard className={styles["buttonIcon"]} />
                    {t("buttons.copyErrorId")}
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Additional Help Section */}
        <section className={styles["helpSection"]}>
          <p className={styles["helpText"]}>
            {t("support.contactPrefix")}{" "}
            <a
              href='mailto:support@arolariu.ro'
              className={styles["helpLink"]}>
              admin@arolariu.ro
            </a>
            {Boolean(error.digest) && (
              <>
                {" "}
                {t("support.includeErrorId")} <code className={styles["helpErrorCode"]}>{error.digest}</code>
              </>
            )}
          </p>
        </section>
      </div>
      <Footer />
      <Tracking />
    </>
  );
}

/**
 * Global error boundary component for the application.
 *
 * @param error - Error object with optional Next.js digest identifier.
 * @param reset - Function that resets the boundary and retries rendering.
 * @returns Full HTML shell with localized global error UX.
 */
export default function GlobalError({error, reset}: Readonly<GlobalErrorProps>): React.JSX.Element {
  const locale = detectLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning>
      <head>
        <meta
          name='robots'
          content='noindex, nofollow'
        />
      </head>
      <body className={styles["body"]}>
        <ContextProviders locale={locale}>
          <GlobalErrorDocumentTitle />
          <GlobalErrorContent
            error={error}
            reset={reset}
          />
        </ContextProviders>
      </body>
    </html>
  );
}
