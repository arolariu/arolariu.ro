"use client";

import {ThemeProvider, useTheme} from "next-themes";
import {ReactNode, useEffect, useState} from "react";
import { FaMoon, FaSun } from "react-icons/fa";

export function Providers({children}: Readonly<{children: ReactNode}>) {
	return (
		<ThemeProvider attribute="class" themes={["light", "dark"]} enableSystem={false}>
			{children}
		</ThemeProvider>
	);
}

const ThemeSwitcherButton = () => {
	const [mounted, setMounted] = useState<boolean>(false);
	const {theme, setTheme} = useTheme();

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;

	return (
		<div title="Theme switcher element" className="text-yellow-500">
			{theme === "dark" && <button type="button" onClick={() => setTheme("light")}><FaSun  className="mt-1 mr-2 text-2xl text-center"/> </button>}
			{theme === "light" && <button type="button" onClick={() => setTheme("dark")}><FaMoon className="mt-1 mr-2 text-2xl text-center"/></button>}
		</div>
	);
};

export default ThemeSwitcherButton;
