/** @format */

"use client";

import {Button} from "@arolariu/components";
import {motion} from "motion/react";
import {TbExternalLink} from "react-icons/tb";

/**
 * This component showcases the technology stack used in the platform.
 * It highlights the modern architecture and the technologies employed.
 * @returns The technology showcase section of the homepage, CSR'ed.
 */
export function TechnologiesSection() {
  return (
    <section className='relative py-20'>
      <div className='absolute inset-0 bg-gradient-to-b from-background via-blue-950 to-background backdrop-blur-sm' />
      <div className='container relative z-10 mx-auto px-4'>
        <div className='grid grid-cols-1 items-center gap-16 lg:grid-cols-2'>
          <motion.div
            initial={{opacity: 0, x: -30}}
            whileInView={{opacity: 1, x: 0}}
            viewport={{once: true}}
            transition={{duration: 0.8}}>
            <div className='mb-4 inline-block rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm text-primary'>
              Modern Architecture
            </div>
            <h2 className='mb-6 text-3xl font-bold md:text-4xl'>Built for the Future</h2>
            <p className='mb-6 text-lg text-muted-foreground'>
              This platform leverages the latest in web technology, combining Next.js for the frontend with .NET for robust backend
              services, all deployed on Microsoft Azure.
            </p>
            <ul className='mb-8 space-y-4'>
              <li className='flex items-start'>
                <div className='mr-3 mt-1 text-primary'>
                  <svg
                    className='h-5 w-5'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                </div>
                <p>Serverless architecture for optimal scaling and performance</p>
              </li>
              <li className='flex items-start'>
                <div className='mr-3 mt-1 text-primary'>
                  <svg
                    className='h-5 w-5'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                </div>
                <p>Full-stack TypeScript for type safety across the entire application</p>
              </li>
              <li className='flex items-start'>
                <div className='mr-3 mt-1 text-primary'>
                  <svg
                    className='h-5 w-5'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                </div>
                <p>Comprehensive telemetry and monitoring with OpenTelemetry</p>
              </li>
            </ul>
            <Button>
              Explore Architecture <TbExternalLink className='ml-2 h-4 w-4' />
            </Button>
          </motion.div>

          <motion.div
            initial={{opacity: 0, scale: 0.9}}
            whileInView={{opacity: 1, scale: 1}}
            viewport={{once: true}}
            transition={{duration: 0.8}}
            className='relative'>
            <div className='relative rounded-lg border border-primary/20 bg-card/30 p-2 shadow-xl backdrop-blur-sm'>
              <div className='absolute -top-3 left-4 bg-background px-2 py-1 text-xs font-medium'>architecture.tsx</div>
              <pre className='language-typescript overflow-x-auto p-4 text-sm'>
                <code className='text-foreground'>
                  {`// Modern architecture pattern
const platform = {
  frontend: {
    framework: "Next.js 14",
    styling: "TailwindCSS",
    stateManagement: "React Context + Hooks",
    dataFetching: "Relay GraphQL"
  },
  backend: {
    language: "C#",
    framework: ".NET 8",
    api: "ASP.NET Minimal APIs",
    database: "Azure SQL"
  },
  deployment: {
    platform: "Azure App Services",
    ci_cd: "GitHub Actions",
    monitoring: "OpenTelemetry",
    scaling: "Auto-scaling enabled"
  }
};`}
                </code>
              </pre>
            </div>

            {/* Decorative elements */}
            <div className='absolute -right-6 -top-6 h-12 w-12 rounded-full bg-primary/30 blur-xl' />
            <div className='absolute -bottom-6 -left-6 h-12 w-12 rounded-full bg-purple-500/30 blur-xl' />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
