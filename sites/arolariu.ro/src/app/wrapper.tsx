/** @format */
"use client";

import {useFontContext} from "@/contexts/FontContext";
import {ThemeProvider} from "next-themes";

type HtmlWrapperProps = {
  children: React.ReactNode;
  locale: string;
};

/**
 * This component wraps the main HTML content.
 * This is done to ensure that the font is applied to the entire page.
 * @returns The HTML wrapper component.
 */
export default function HtmlWrapper({children, locale}: Readonly<HtmlWrapperProps>): React.JSX.Element {
  const {
    font: {className},
  } = useFontContext();

  return (
    <html
      suppressHydrationWarning
      lang={locale}
      className={className}
      dir='ltr'>
      <body className='bg-white text-black dark:bg-black dark:text-white'>
        <ThemeProvider
          enableSystem
          enableColorScheme
          defaultTheme='system'
          attribute='class'
          themes={["light", "dark"]}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
