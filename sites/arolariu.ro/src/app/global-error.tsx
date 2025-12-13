"use client";

// @ts-ignore -- css file has no typings.
import "@arolariu/components/styles.css";

// @ts-ignore -- css file has no typings.
import "./globals.css";

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
import {useState} from "react";
import {TbAlertTriangle, TbClipboard, TbClipboardCheck, TbHome, TbRefresh} from "react-icons/tb";
import QRCode from "react-qr-code";
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
  const handleCopyErrorId = async (): Promise<void> => {
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
  };

  /**
   * Handles the reset action with telemetry tracking.
   * Calls the provided reset function to attempt recovery.
   */
  const handleReset = (): void => {
    reset();
  };

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
      <body className='bg-white text-black dark:bg-black dark:text-white'>
        <ContextProviders locale='en'>
          <Header />

          <main className='container mx-auto flex min-h-screen flex-col items-center justify-center px-5 py-24'>
            {/* Hero Section - Error Icon */}
            <section className='mb-8 text-center'>
              <div className='mb-4 inline-flex items-center justify-center rounded-full bg-red-100 p-6 dark:bg-red-900/20'>
                <TbAlertTriangle className='h-16 w-16 text-red-600 dark:text-red-400' />
              </div>
              <h1 className='mb-2 text-4xl font-bold text-red-600 dark:text-red-400'>Something Went Wrong</h1>
              <p className='text-lg text-gray-600 dark:text-gray-400'>
                An unexpected error occurred. Our team has been automatically notified.
              </p>
            </section>

            {/* Error Details Card */}
            <Card className='w-full max-w-2xl'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <TbAlertTriangle className='h-5 w-5 text-red-600 dark:text-red-400' />
                  Error Details
                </CardTitle>
                <CardDescription>
                  {error.digest ? (
                    <>
                      Error ID: <code className='rounded bg-gray-100 px-2 py-1 text-sm dark:bg-gray-800'>{error.digest}</code>
                    </>
                  ) : (
                    "An error occurred while processing your request."
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent className='space-y-4'>
                {/* Error Message Alert */}
                <Alert variant='destructive'>
                  <AlertTitle className='flex items-center gap-2'>
                    <TbAlertTriangle className='h-4 w-4' />
                    What happened?
                  </AlertTitle>
                  <AlertDescription className='mt-2'>
                    <p className='font-mono text-sm'>{error.message || "An unknown error occurred."}</p>
                  </AlertDescription>
                </Alert>

                {/* What to do section */}
                <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900'>
                  <h3 className='mb-2 font-semibold'>What can you do?</h3>
                  <ul className='space-y-1 text-sm text-gray-600 dark:text-gray-400'>
                    <li>• Try refreshing the page using the button below</li>
                    <li>• Go back to the home page and start over</li>
                    <li>• Contact support if the problem persists</li>
                  </ul>
                </div>

                {/* QR Code with Diagnostic Data */}
                {Boolean(errorContext) && (
                  <div className='flex flex-col items-center space-y-2 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-black'>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>Scan for diagnostic information:</p>
                    <QRCode
                      value={errorContext}
                      size={128}
                      className='rounded border-2 border-gray-200 p-2 dark:border-gray-800'
                    />
                  </div>
                )}

                {/* Technical Details (Collapsible) */}
                <details className='rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-black'>
                  <summary className='cursor-pointer p-4 font-semibold hover:bg-gray-50 dark:hover:bg-gray-900'>
                    Technical Information (for developers)
                  </summary>
                  <div className='border-t border-gray-200 p-4 dark:border-gray-800'>
                    <pre className='overflow-x-auto text-xs text-gray-600 dark:text-gray-400'>
                      <code>{errorContext || "Loading diagnostic information..."}</code>
                    </pre>
                    {Boolean(error.stack) && (
                      <>
                        <h4 className='mt-4 mb-2 font-semibold'>Stack Trace:</h4>
                        <pre className='overflow-x-auto text-xs text-gray-600 dark:text-gray-400'>
                          <code>{error.stack}</code>
                        </pre>
                      </>
                    )}
                  </div>
                </details>
              </CardContent>

              <CardFooter className='flex flex-col gap-4 sm:flex-row'>
                {/* Primary Action - Try Again */}
                <Button
                  onClick={handleReset}
                  variant='default'
                  size='default'
                  className='w-full sm:w-auto'>
                  <TbRefresh className='mr-2 h-4 w-4' />
                  Try Again
                </Button>

                {/* Secondary Action - Return Home */}
                <Button
                  variant='outline'
                  size='default'
                  className='w-full sm:w-auto'
                  asChild>
                  <Link
                    href='/'
                    onClick={handleReset}>
                    <TbHome className='mr-2 h-4 w-4' />
                    Return to Home
                  </Link>
                </Button>

                {/* Tertiary Action - Copy Error ID */}
                {Boolean(error.digest) && (
                  <Button
                    onClick={handleCopyErrorId}
                    variant='ghost'
                    size='default'
                    className='w-full sm:w-auto'
                    title='Copy Error ID'>
                    {isCopied ? (
                      <>
                        <TbClipboardCheck className='mr-2 h-4 w-4' />
                        Copied!
                      </>
                    ) : (
                      <>
                        <TbClipboard className='mr-2 h-4 w-4' />
                        Copy Error ID
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>

            {/* Additional Help Section */}
            <section className='mt-8 text-center'>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                If this problem continues, please contact us at{" "}
                <a
                  href='mailto:support@arolariu.ro'
                  className='text-indigo-600 underline hover:text-indigo-700 dark:text-indigo-400'>
                  admin@arolariu.ro
                </a>
                {Boolean(error.digest) && (
                  <>
                    {" "}
                    and include the error ID: <code className='rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800'>{error.digest}</code>
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
