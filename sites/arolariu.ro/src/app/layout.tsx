/** @format */

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {Caudex} from "next/font/google";

import {SITE_URL} from "@/constants";
import {ClerkProvider} from "@clerk/nextjs";
import {Metadata} from "next";
import {NextFont} from "next/dist/compiled/@next/font";
import {AlternateURLs} from "next/dist/lib/metadata/types/alternative-urls-types";
import {Author, Robots, TemplateString} from "next/dist/lib/metadata/types/metadata-types";
import {OpenGraph} from "next/dist/lib/metadata/types/opengraph-types";
import {PropsWithChildren, Suspense} from "react";
import "./globals.css";
import Loading from "./loading";
import {Providers} from "./providers";

const fontFamily: NextFont = Caudex({
	weight: "700",
	style: "normal",
	subsets: ["latin"],
	preload: true,
});

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: {
		absolute: "arolariu.ro | Alexandru-Razvan Olariu",
		default: "arolariu.ro | Unknown page",
		template: "%s | arolariu.ro",
	} satisfies TemplateString,
	description: "Welcome to `arolariu.ro` - the personal website of Alexandru-Razvan Olariu.",
	applicationName: "arolariu.ro",
	authors: {
		name: "Alexandru-Razvan Olariu",
		url: "https://arolariu.ro",
	} satisfies Author,
	category: "Technology",
	creator: "Alexandru-Razvan Olariu",
	keywords: ["arolariu", "arolariu.ro", "Alexandru-Razvan Olariu", "Technology"],
	alternates: {
		canonical: "https://arolariu.ro",
	} satisfies AlternateURLs,
	robots: {
		follow: true,
		index: true,
	} satisfies Robots,
	openGraph: {
		type: "website",
		url: "https://arolariu.ro",
		countryName: "Romania",
		description: "Welcome to `arolariu.ro` - the personal website of Alexandru-Razvan Olariu.",
		siteName: "arolariu.ro",
		title: "arolariu.ro | Alexandru-Razvan Olariu",
		alternateLocale: "ro_RO",
	} satisfies OpenGraph,
	manifest: "/manifest.json",
};

export default async function RootLayout({children}: Readonly<PropsWithChildren<{}>>) {
	return (
		<ClerkProvider>
			<html lang="en" suppressHydrationWarning className={fontFamily.className}>
				<body className="text-black bg-white dark:bg-black dark:text-white">
					<Providers>
						<Header />
						<Suspense fallback={<Loading />}>{children}</Suspense>
						<Footer />
					</Providers>
				</body>
			</html>
		</ClerkProvider>
	);
}
