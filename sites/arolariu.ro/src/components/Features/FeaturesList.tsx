/** @format */

import Link from "next/link";
import {SiCsharp, SiGithubactions, SiMicrosoftazure, SiNextdotjs, SiOpentelemetry, SiSvelte} from "react-icons/si";
import Feature from "./Feature";

/**
 * The features list component.
 * @returns A list of features.
 */
export default function FeaturesList() {
  return (
    <section className='mx-auto max-w-screen-xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16'>
      <h2 className='text-center text-3xl font-bold sm:text-4xl'>Key Features</h2>
      <p className='mt-4 text-center text-gray-500'>
        The `arolariu.ro` platform is built using the latest stable technologies.
      </p>

      <div className='mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'>
        <Feature
          link='https://nextjs.org'
          title='Next.JS v14'
          description='The platform is built using NextJS - the most popular React framework for production.'>
          <SiNextdotjs className='inline h-10 w-10' />
        </Feature>

        <Feature
          link='https://portal.azure.com'
          title='Microsoft Azure'
          description='The Microsoft Azure cloud is used to host the platform and all of its services. This ensures that the platform is always available and that it can scale on demand.'>
          <SiMicrosoftazure className='inline h-10 w-10' />
        </Feature>

        <Feature
          link='https://learn.microsoft.com/en-us/dotnet'
          title='.NET 8 Ecosystem'
          description='The backend services are built using the latest LTS version of .NET 8'>
          <SiCsharp className='inline h-10 w-10' />
        </Feature>

        <Feature
          link='https://svelte.dev'
          title='Svelte'
          description='The `cv.arolariu.ro` platform is built exclusively using Svelte and SvelteKit (v5).'>
          <SiSvelte className='inline h-10 w-10' />
        </Feature>

        <Feature
          link='https://opentelemetry.io'
          title='OpenTelemetry'
          description='Everything is instrumented using OpenTelemetry. This allows for a unified telemetry experience across the board. (3PO: metrics, logs, traces)'>
          <SiOpentelemetry className='inline h-10 w-10' />
        </Feature>

        <Feature
          link='https://github.com/features/actions'
          title='GitHub Actions (DevOps)'
          description='The DevOps experience is powered by GitHub Actions. (CI/CD, Testing, etc.)'>
          <SiGithubactions className='inline h-10 w-10' />
        </Feature>
      </div>
      <Link
        href='/about'
        className='mx-auto mt-8 block text-center'>
        <button
          type='button'
          className='text-md btn btn-primary text-white'>
          Interesting? Click here to learn more...
        </button>
      </Link>
    </section>
  );
}
