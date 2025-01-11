/** @format */
"use client";

import {useFontContext} from "@/contexts/FontContext";

type HtmlWrapperProps = {
  children: React.ReactNode;
  locale: string;
};

/**
 * This component wraps the main HTML content.
 * This is done to ensure that the font is applied to the entire page.
 * @returns The HTML wrapper component.
 */
export const HtmlWrapper = ({children, locale}: Readonly<HtmlWrapperProps>) => {
  const {
    font: {className},
  } = useFontContext();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={className}
      dir='ltr'>
      <body className='bg-white text-black dark:bg-black dark:text-white'>{children}</body>
    </html>
  );
};
