import {ClerkProvider} from "@clerk/nextjs";
import {MantineProvider, MantineTheme} from "@mantine/core";
import {ThemeProvider} from "next-themes";
import {ReactNode} from "react";

export function Providers({children}: Readonly<{children: ReactNode}>) {
	return (
		<ClerkProvider>
			<ThemeProvider attribute="data-mantine-color-scheme" themes={["light", "dark"]} enableSystem={false}>
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
		</ClerkProvider>
	);
}
