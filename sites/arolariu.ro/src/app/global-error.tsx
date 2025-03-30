/** @format */

"use client";

interface GlobalErrorProps {
  error: Error & {digest?: string};
  reset: () => void;
}

export default function GlobalError({error, reset}: Readonly<GlobalErrorProps>) {
  console.error("Global error caught:", error);

  return (
    <html lang='en'>
      <body className='flex min-h-screen flex-col items-center justify-center p-4 text-center'>
        <h2 className='text-2xl font-bold'>Something went wrong!</h2>
        <p className='mt-4 text-lg'>{error.message}</p>
        <button
          className='mt-6 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
          onClick={() => reset()}>
          Try again
        </button>
      </body>
    </html>
  );
}
