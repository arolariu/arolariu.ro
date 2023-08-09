/** @format */

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {Inter} from "next/font/google";

import {Metadata} from "next";
import {AlternateURLs} from "next/dist/lib/metadata/types/alternative-urls-types";
import {Author, Robots, TemplateString} from "next/dist/lib/metadata/types/metadata-types";
import {OpenGraph} from "next/dist/lib/metadata/types/opengraph-types";
import {PropsWithChildren, Suspense} from "react";
import "./globals.css";
import Loading from "./loading";

const inter = Inter({subsets: ["latin"]});

export const metadata: Metadata = {
	title: {
		absolute: "arolariu.ro | Alexandru-Razvan Olariu",
		default: "arolariu.ro | Unknown page",
		template: "%s | arolariu.ro",
	} as TemplateString,
	description: "Welcome to `arolariu.ro` - the personal website of Alexandru-Razvan Olariu.",
	applicationName: "arolariu.ro",
	authors: {
		name: "Alexandru-Razvan Olariu",
		url: "https://arolariu.ro",
	} as Author,
	category: "Technology",
	creator: "Alexandru-Razvan Olariu",
	keywords: ["arolariu", "arolariu.ro", "Alexandru-Razvan Olariu", "Technology"],
	alternates: {
		canonical: "https://arolariu.ro",
	} as AlternateURLs,
	robots: {
		follow: true,
		index: true,
	} as Robots,
	openGraph: {
		type: "website",
		url: "https://arolariu.ro",
		countryName: "Romania",
		description: "Welcome to `arolariu.ro` - the personal website of Alexandru-Razvan Olariu.",
		siteName: "arolariu.ro",
		title: "arolariu.ro | Alexandru-Razvan Olariu",
		alternateLocale: "ro_RO",
	} as OpenGraph,
	manifest: "/manifest.json",
};

export default async function RootLayout({children}: PropsWithChildren<{}>) {
	return (
		<html lang="en">
			<body className={inter.className}>
				<Header />
				<Suspense fallback={<Loading />}>{children}</Suspense>
				<Footer />
			</body>
		</html>
	);
}
