import {type Metadata} from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The Platform",
  description: "Learn more about the platform that you are currently on.",
};

/**
 * The platform page.
 * @returns The platform page
 */
export default async function PlatformPage() {
  return (
    <>
      <section>
        <h1 className='my-8 font-bold 2xsm:text-2xl xsm:text-3xl md:text-4xl'>
          What is <code>arolariu.ro</code>?
        </h1>
        <div className='mx-auto my-12'>
          <span className='inline-block h-2 w-60 rounded-full bg-blue-500' />
          <span className='mx-1 inline-block h-2 w-6 rounded-full bg-blue-500' />
          <span className='inline-block h-2 w-3 rounded-full bg-blue-500' />
        </div>
        <article className='2xsm:p-2 2xsm:text-lg lg:text-xl 2xl:p-16 2xl:text-2xl'>
          The <code>arolariu.ro</code> platform is a personal project made by{" "}
          <Link
            href='/about/the-author'
            className='text-blue-500'>
            <em>Alexandru-Razvan Olariu.</em>
          </Link>
          <br />
          <br />
          The platform is built using the latest stable iterations of different technologies such as Next.JS, React, and
          TailwindCSS; according to several design principles and best practices, such as the use of atomic design, the
          use of a mobile-first approach, and the use of a component-based architecture. The platform is also built with
          accessibility in mind, and it is designed to be as accessible as possible.
          <br />
          <br />
          In order for the platform to grow and evolve, it is built with a modular architecture in mind, and it is
          designed to be easily extensible and maintainable. The platform is also built with a focus on performance, and
          it is designed to be as performant as possible. This is thanks to the use of modern web technologies and the
          use of a modern front-end framework such as Next.JS.
          <br />
          <br />
          The API service that powers the platform and the adjacent services hosted under the <code>
            *.arolariu.ro
          </code>{" "}
          domain umbrella is built using the latest iteration of .NET LTS. The API can be accessed on{" "}
          <Link
            href='https://api.arolariu.ro'
            target='_blank'
            rel='noopener'
            className='text-blue-500'>
            <code>api.arolariu.ro</code>
          </Link>
          .
        </article>
      </section>
      <section className='my-16 pb-16'>
        {/* Technology overview */}
        <h2 className='mb-4 font-bold 2xsm:text-2xl md:text-3xl'>Technology overview</h2>
        <article className='2xsm:px-2 2xsm:text-lg lg:text-xl 2xl:px-16 2xl:text-2xl'>
          The platform is built using the latest stable iterations of different technologies. The table below provides
          an overview of the technologies used to build the platform. It might not be exhaustive, but it provides a good
          starting point for understanding the technologies used to build the platform.
          <br />
          <br />
          <table className='table table-pin-cols table-auto text-center 2xsm:table-xs md:table-lg'>
            <caption className='my-4 caption-top text-left 2xsm:text-lg'>
              Technologies used to build this platform:
            </caption>
            <thead>
              <tr className='font-bold text-black dark:text-white '>
                <th className='bg-white dark:bg-black'>Technology</th>
                <th className='bg-white dark:bg-black'>Usage scenario</th>
              </tr>
            </thead>
            <tbody className='xl:text-left'>
              <tr>
                <td>
                  Next.JS micro-frontend <br />
                  (version 14)
                </td>
                <td>
                  Next.JS is used as the micro frontend framework of choice, which utilizes React under the hood.
                  Next.JS is a powerful and flexible framework that allows for the creation of modern web applications.
                  The framework was chosen for its flexibility, performance, and ease of use.
                </td>
              </tr>
              <tr>
                <td>
                  React <br />
                  (version 18)
                </td>
                <td>
                  Having considered other front-end technologies, React was chosen for its flexibility, performance, and
                  ease of use. React has a large and active community, and it is a powerful and flexible library that
                  allows for the creation of modern web applications. The library is used to build the user interface of
                  the platform.
                </td>
              </tr>
              <tr>
                <td>
                  Zustand <br />
                  (client-side state management)
                </td>
                <td>
                  For client-side state management, Zustand was chosen for its simplicity and ease of use. Zustand is a
                  small, fast, and scalable state management library that allows for quick and easy state management in
                  React applications. Zustand is based on the use of hooks, and it is designed to be as simple and easy
                  to use as possible.
                </td>
              </tr>
              <tr>
                <td>
                  TailwindCSS <br />
                  (CSS framework)
                </td>
                <td>
                  {" "}
                  TailwindCSS was chosen for its flexibility and ease of use. TailwindCSS is a utility-first CSS
                  framework that solves many of the problems associated with traditional CSS frameworks. TailwindCSS
                  takes a different approach to styling web applications by providing a set of utility classes that can
                  be used to style the user interface of the platform. It is designed with a mobile-first approach in
                  mind, and it is designed to be as accessible as possible.
                </td>
              </tr>
              <tr>
                <td>
                  Progressive Web App <br />
                  (PWA)
                </td>
                <td>
                  {" "}
                  The platform is built as a Progressive Web App (PWA). A PWA is a modern web application that is built
                  using the latest web technologies and needs to work on any device, any platform, and any browser.
                  PWA&apos;s are designed to be as fast and reliable as possible. They are launchable from the home
                  screen, and they are designed to be as accessible as possible.{" "}
                </td>
              </tr>
              <tr>
                <td>
                  Docker <br />
                  (containerization)
                </td>
                <td>
                  {" "}
                  Docker is used to containerize the platform and the adjacent services. Docker is a powerful and
                  flexible containerization platform that allows for the creation of lightweight and portable
                  containers. The containers are then deployed to a high-availability service plan, which allows for the
                  platform to be highly available and scalable, both in terms of horizontal and vertical scaling.
                </td>
              </tr>
              <tr>
                <td>Open Telemetry (OTel)</td>
                <td>
                  {" "}
                  The platform is instrumented with Open Telemetry, which allows for the collection of telemetry data
                  from the platform and the adjacent services. Open Telemetry is a suite of tools and libraries that
                  offer a complete solution for observability in modern web applications. The three pillars of
                  observability, namely metrics, logs, and traces, are all covered by Open Telemetry.
                </td>
              </tr>
              <tr>
                <td>
                  GitHub Actions <br />
                  (CI/CD)
                </td>
                <td>
                  {" "}
                  GitHub Actions is used for continuous integration and continuous deployment. GitHub Actions is a
                  powerful and flexible CI/CD platform that allows for the automation of the build, test, and deployment
                  process. The platform is built with a focus on automation, and GitHub Actions is used to automate the
                  build, test, and deployment process.
                </td>
              </tr>
              <tr>
                <td>
                  Pulumi <br />
                  (Infrastructure as Code)
                </td>
                <td>
                  Pulumi is used for Infrastructure as Code. It is a powerful and flexible Infrastructure as Code
                  platform that allows for the creation and management of infrastructure using familiar programming
                  languages such as TypeScript, JavaScript, Python, and Go. Pulumi is used to create and manage the
                  infrastructure that powers the platform and the adjacent services.
                </td>
              </tr>
            </tbody>
          </table>
        </article>
      </section>
    </>
  );
}
