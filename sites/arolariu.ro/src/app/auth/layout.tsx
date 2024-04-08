import {PropsWithChildren} from "react";

export default async function AuthRootLayout({children}: Readonly<PropsWithChildren<{}>>) {
  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-4 px-5 py-24 text-center lg:flex-row lg:gap-8'>
      {children}
    </main>
  );
}
