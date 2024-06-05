/** @format */

import {type Metadata} from "next";
import Link from "next/link";
import QRCode from "react-qr-code";

export const metadata: Metadata = {
  title: "arolariu.ro | 404",
  description: "Page not found.",
};

/**
 * The 404 page.
 * @returns The 404 page.
 */
export default async function NotFound() {
  // TODO: complete QR code with OTel data.

  return (
    <main className='flex flex-col items-center justify-center justify-items-center px-5 py-24 text-xl 2xsm:text-lg'>
      <section>
        <h1 className='mx-auto pb-8 text-center 2xsm:text-xl md:text-3xl'>404 - Page not found.</h1>
        <p className='text-center'>
          It seems that the page that you&apos;ve landed on is not present on the website. <br />
          If this page should exist, please report this to the site administrator. <br />
        </p>
      </section>
      <hr className='rouned border-2' />
      <section className='my-4 py-4'>
        <h2 className='my-4 text-center text-xl font-bold'>Additional Information:</h2>
        <QRCode value='Lorem ipsum dolor sit amet consectetur adipisicing elit. Necessitatibus soluta libero, minima nulla ipsum blanditiis nesciunt beatae reprehenderit deserunt mollitia, eos repudiandae maiores, cumque delectus veniam deleniti in consequuntur eius. Deleniti totam optio distinctio tempore necessitatibus temporibus soluta excepturi placeat architecto! Vitae consequatur modi eveniet officia nemo. Sequi, beatae eligendi?' />
      </section>
      <section>
        <p className='text-center text-xs'>
          If you think that this page should exist and you&apos;re facing an error, please report this to the site
          administrator.
        </p>
        <div className='mt-4 flex items-center justify-between justify-items-center gap-4 2xsm:flex-col md:flex-row'>
          <Link
            href=''
            className='btn btn-secondary mx-auto'>
            Submit false error.
          </Link>
          <Link
            href='https://arolariu.ro/'
            className='btn btn-primary mx-auto'>
            Go back to the home page.
          </Link>
        </div>
      </section>
    </main>
  );
}
