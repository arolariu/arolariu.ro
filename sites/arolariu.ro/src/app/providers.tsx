/** @format */
"use client";

import {ThemeProvider} from "next-themes";
import React from "react";
import {WebVitals as VitalsProvider} from "./web-vitals";

/**
 * This function provides the context for the app.
 * @returns The context providers for the app.
 */
export default function ContextProviders({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <ThemeProvider
      attribute='class'
      themes={["light", "dark"]}
      enableSystem>
      <VitalsProvider />
      {children}
    </ThemeProvider>
  );
}
