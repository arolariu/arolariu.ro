/** @format */

"use client";

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
export default function GlobalError({error, reset}: Readonly<GlobalErrorProps>) {
  console.error("Global error caught:", error);

  return (
    <html lang='en'>
      <body className='flex min-h-screen flex-col items-center justify-center p-4 text-center'>
        <h2 className='text-2xl font-bold'>Something went wrong!</h2>
        <p className='mt-4 text-lg'>{error.message}</p>
        <button
          type='button'
          className='mt-6 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
          onClick={() => reset()}>
          Try again
        </button>
        <code>{JSON.stringify(error, null, 2)}</code>
      </body>
    </html>
  );
}
