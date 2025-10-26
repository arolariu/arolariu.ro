"use client";

// @ts-ignore -- css file has no typings.
import "@arolariu/components/styles.css";

// @ts-ignore -- css file has no typings.
import "./globals.css";

interface GlobalErrorProps {
  error: Error & {digest?: string};
  reset: () => void;
}

/**
 * This component is used to display a global error message when an error occurs in the application.
 * It provides a button to reset the error state and try again.
 * @param error The error object containing information about the error that occurred.
 * @param reset A function to reset the error state and retry the operation.
 * @returns A JSX element representing the global error message and retry button.
 */
export default function GlobalError({error, reset}: Readonly<GlobalErrorProps>): React.JSX.Element {
  return (
    <html lang='en'>
      <head>
        <title>Application Error - AROLARIU.RO</title>
      </head>
      <body className='bg-white text-black dark:bg-black dark:text-white'>
        <section className='px-12 py-24'>
          <p>{error.message}</p>
          <button
            type='button'
            onClick={reset}>
            Try Again
          </button>
        </section>
      </body>
    </html>
  );
}
