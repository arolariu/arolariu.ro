import {MantineProvider, type MantineTheme} from "@mantine/core";
import {ThemeProvider} from "next-themes";
import {type ReactNode} from "react";

/**
 * The providers component.
 * @param param0 The children components.
 * @returns The providers component.
 */
export function Providers({children}: Readonly<{children: ReactNode}>) {
  return (
    <ThemeProvider
      attribute='data-mantine-color-scheme'
      themes={["light", "dark"]}
      enableSystem={false}>
      <MantineProvider
        theme={
          {
            fontFamily: "Caudex, ",
            fontFamilyMonospace: "Caudex, ",
            headings: {
              fontFamily: "Caudex, ",
              fontWeight: "700",
              textWrap: "wrap",
            },
          } as MantineTheme
        }>
        {children}
      </MantineProvider>
    </ThemeProvider>
  );
}
