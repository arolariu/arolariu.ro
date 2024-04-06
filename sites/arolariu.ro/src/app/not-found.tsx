import {type Metadata} from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "arolariu.ro | 404",
  description: "Page not found.",
};

/**
 * The 404 page.
 * @returns The 404 page.
 */
export default async function NotFound() {
  return (
    <div className='container mx-auto my-4 flex flex-col'>
      <h1 className='mx-auto text-3xl font-black'>404 - Page was not found.</h1>
      <section className='mx-auto my-4'>
        <center>It seems that the page that you&apos;ve landed on is not present on the website.</center>
        <hr />
        <div>
          <h2 className='my-4 text-center text-xl font-bold'>Additional information:</h2>
          <code className='container mb-4 flex items-center justify-center text-center'>
            User is
            <br />
            Username: &quot;Unknown username&quot;
          </code>
          <center className='mx-8 block items-center justify-center border-2 border-dotted text-center'>
            TODO: Add base64 representation here.
          </center>
          <small>
            If you think that this page should exist and you&apos;re facing an error, please report this to the site
            administrator.
          </small>
          <div className='container mt-4 flex flex-row'>
            <Link
              href='https://arolariu.ro/'
              className='btn btn-primary mx-auto'>
              Go back to the home page.
            </Link>
            <Link
              href=''
              className='btn btn-secondary mx-auto'>
              Submit false error.
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
