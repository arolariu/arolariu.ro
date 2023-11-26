"use client";

import {ThemeProvider, useTheme} from "next-themes";
import {ReactNode, useEffect, useState} from "react";

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
		<select value={theme} onChange={(e) => setTheme(e.target.value)} title="Theme switcher element">
			<option value="light">Light</option>
			<option value="dark">Dark</option>
		</select>
	);
};

export default ThemeSwitcherButton;
