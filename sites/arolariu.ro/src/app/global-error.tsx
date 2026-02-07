"use client";

// @ts-ignore -- css file has no typings.
import "@arolariu/components/styles.css";

// @ts-ignore -- scss file has no typings.
import "./globals.scss";

// @ts-ignore -- scss file has no typings.
import "@/styles/main.scss";

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
import Link from "next/link";
import {useCallback, useState} from "react";
import {TbAlertTriangle, TbClipboard, TbClipboardCheck, TbHome, TbRefresh} from "react-icons/tb";
import QRCode from "react-qr-code";
import styles from "./global-error.module.scss";
import ContextProviders from "./providers";
import Tracking from "./tracking";

interface GlobalErrorProps {
  error: Error & {digest?: string};
  reset: () => void;
}

/**
 * Global error boundary component for the application.
 *
 * This component displays a comprehensive error page when an unhandled error occurs
 * at the application root level. It provides:
 * - User-friendly error messaging with professional UI
 * - Telemetry integration for error tracking and debugging
 * - Diagnostic tools (QR code, error ID, technical details)
 * - Recovery options (Try Again, Return Home)
 * - Full layout consistency with Header/Footer
 *
 * @param error - The error object containing information about what went wrong
 * @param error.message - Human-readable error message
 * @param error.digest - Next.js error identifier for tracking
 * @param error.stack - Stack trace for debugging
 * @param reset - Function to reset the error boundary and retry the operation
 * @returns A full HTML document with error information and recovery options
 *
 * @see {@link https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errorjs}
 * @see {@link https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary}
 *
 * @example
 * // This component is automatically used by Next.js when an error occurs
 * // at the root level of the application. It requires full HTML structure.
 */
export default function GlobalError({error, reset}: Readonly<GlobalErrorProps>): React.JSX.Element {
  const [isCopied, setIsCopied] = useState<boolean>(false);
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
      console.error("Failed to copy error ID:", clipboardError);
    }
  }, [error.digest]);

  /**
   * Handles the reset action with telemetry tracking.
   * Calls the provided reset function to attempt recovery.
   */
  const handleReset = useCallback((): void => {
    reset();
  }, [reset]);

  return (
    <html
      lang='en'
      suppressHydrationWarning>
      <head>
        <title>Application Error - AROLARIU.RO</title>
        <meta
          name='robots'
          content='noindex, nofollow'
        />
        <meta
          name='description'
          content='An unexpected error occurred. Our team has been notified.'
        />
      </head>
      <body className={styles["body"]}>
        <ContextProviders locale='en'>
          <Header />

          <main className={styles["pageContainer"]}>
            {/* Hero Section - Error Icon */}
            <section className={styles["heroSection"]}>
              <div className={styles["iconCircle"]}>
                <TbAlertTriangle className={styles["heroIcon"]} />
              </div>
              <h1 className={styles["heroTitle"]}>Something Went Wrong</h1>
              <p className={styles["heroSubtitle"]}>An unexpected error occurred. Our team has been automatically notified.</p>
            </section>

            {/* Error Details Card */}
            <Card className={styles["errorCard"]}>
              <CardHeader>
                <CardTitle className={styles["cardTitleWrapper"]}>
                  <TbAlertTriangle className={styles["cardTitleIcon"]} />
                  Error Details
                </CardTitle>
                <CardDescription>
                  {error.digest ? (
                    <>
                      Error ID: <code className={styles["errorCode"]}>{error.digest}</code>
                    </>
                  ) : (
                    "An error occurred while processing your request."
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent className={styles["contentSpacing"]}>
                {/* Error Message Alert */}
                <Alert variant='destructive'>
                  <AlertTitle className={styles["alertTitleInner"]}>
                    <TbAlertTriangle className={styles["alertIcon"]} />
                    What happened?
                  </AlertTitle>
                  <AlertDescription className={styles["alertDescription"]}>
                    <p className={styles["errorMessage"]}>{error.message || "An unknown error occurred."}</p>
                  </AlertDescription>
                </Alert>

                {/* What to do section */}
                <div className={styles["infoBox"]}>
                  <h3 className={styles["infoTitle"]}>What can you do?</h3>
                  <ul className={styles["infoList"]}>
                    <li>• Try refreshing the page using the button below</li>
                    <li>• Go back to the home page and start over</li>
                    <li>• Contact support if the problem persists</li>
                  </ul>
                </div>

                {/* QR Code with Diagnostic Data */}
                {Boolean(errorContext) && (
                  <div className={styles["qrSection"]}>
                    <p className={styles["qrLabel"]}>Scan for diagnostic information:</p>
                    <QRCode
                      value={errorContext}
                      size={128}
                      className={styles["qrCode"]}
                    />
                  </div>
                )}

                {/* Technical Details (Collapsible) */}
                <details className={styles["technicalDetails"]}>
                  <summary className={styles["technicalSummary"]}>Technical Information (for developers)</summary>
                  <div className={styles["technicalContent"]}>
                    <pre className={styles["preBlock"]}>
                      <code>{errorContext || "Loading diagnostic information..."}</code>
                    </pre>
                    {Boolean(error.stack) && (
                      <>
                        <h4 className={styles["stackTitle"]}>Stack Trace:</h4>
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
                  Try Again
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
                    Return to Home
                  </Link>
                </Button>

                {/* Tertiary Action - Copy Error ID */}
                {Boolean(error.digest) && (
                  <Button
                    onClick={handleCopyErrorId}
                    variant='ghost'
                    size='default'
                    className={styles["actionButton"]}
                    title='Copy Error ID'>
                    {isCopied ? (
                      <>
                        <TbClipboardCheck className={styles["buttonIcon"]} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <TbClipboard className={styles["buttonIcon"]} />
                        Copy Error ID
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>

            {/* Additional Help Section */}
            <section className={styles["helpSection"]}>
              <p className={styles["helpText"]}>
                If this problem continues, please contact us at{" "}
                <a
                  href='mailto:support@arolariu.ro'
                  className={styles["helpLink"]}>
                  admin@arolariu.ro
                </a>
                {Boolean(error.digest) && (
                  <>
                    {" "}
                    and include the error ID: <code className={styles["helpErrorCode"]}>{error.digest}</code>
                  </>
                )}
              </p>
            </section>
          </main>
          <Footer />
          <Tracking />
        </ContextProviders>
      </body>
    </html>
  );
}
