/** @format */

import type {Metadata} from "next";
import RenderPrivacyPolicyScreen from "./island";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "The privacy policy page for the `arolariu.ro` platform.",
};

/**
 * The privacy policy page.
 */
export default async function PrivacyPolicyPage() {
  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-8 px-12 py-24'>
      <div className='flex flex-col flex-nowrap gap-8 2xsm:w-full md:w-2/3'>
        <section>
          <h1 className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-center text-3xl font-black text-transparent'>
            Privacy Policy
          </h1>
          <p className='text-center'>Last updated: 2024-01-01</p>
        </section>
        <RenderPrivacyPolicyScreen />
      </div>
    </main>
  );
}
