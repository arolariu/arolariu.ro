/** @format */
"use client";

import {
  FluentProvider,
  RendererProvider,
  SSRProvider,
  createDOMRenderer,
  renderToStyleElements,
  teamsDarkTheme,
} from "@fluentui/react-components";
import {ThemeProvider} from "next-themes";
import {useServerInsertedHTML} from "next/navigation";
import React from "react";
import {WebVitals as VitalsProvider} from "./web-vitals";

/**
 * This function provides the context for the app.
 * @returns The context providers for the app.
 */
export default function ContextProviders({children}: Readonly<{children: React.ReactNode}>) {
  const [renderer] = React.useState(() => createDOMRenderer());
  const didRenderRef = React.useRef(false);

  useServerInsertedHTML(() => {
    if (didRenderRef.current) {
      return;
    }
    didRenderRef.current = true;
    return <>{renderToStyleElements(renderer)}</>;
  });

  return (
    <RendererProvider renderer={renderer}>
      <SSRProvider>
        <FluentProvider theme={teamsDarkTheme}>
          <ThemeProvider
            attribute='class'
            themes={["light", "dark"]}
            enableSystem={false}>
            <VitalsProvider />
            {children}
          </ThemeProvider>
        </FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}
