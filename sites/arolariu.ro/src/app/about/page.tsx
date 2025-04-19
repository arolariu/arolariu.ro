/** @format */

import {Metadata} from "next";
import RenderAboutScreen from "./island";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn more about the author and the platform.",
};

/**
 * This is the about page.
 * It is a simple page that displays some information about the application.
 */
export default async function AboutPage(): Promise<React.JSX.Element> {
  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center pt-24 text-center'>
      <RenderAboutScreen />
    </main>
  );
}
