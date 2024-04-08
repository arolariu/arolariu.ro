import {type PropsWithChildren} from "react";

export default async function AboutRootLayout({children}: Readonly<PropsWithChildren<{}>>) {
  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center px-5 pt-24 text-center'>
      {children}
      <section className='my-16 pb-32'>
        <h2 className='text-3xl font-bold'>Thank you.</h2>
      </section>
    </main>
  );
}
