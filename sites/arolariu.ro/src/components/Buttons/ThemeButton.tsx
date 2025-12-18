"use client";

/**
 * @fileoverview Animated theme toggle button (light/dark) for the website header.
 * @module components/Buttons/ThemeButton
 *
 * @remarks
 * **Rendering context**: Client Component (`"use client"`) because it relies on:
 * - `next-themes` (`useTheme`) which reads/writes theme state in the browser.
 * - React hooks (`useEffect`, `useState`, `useCallback`).
 *
 * **Hydration**: This component intentionally waits until mount before rendering,
 * to avoid theme mismatches between SSR output and client hydration.
 */

import {motion} from "motion/react";
import {useTheme} from "next-themes";
import {useCallback, useEffect, useState} from "react";
import {TbMoon, TbSun} from "react-icons/tb";

/**
 * Renders the moon icon with a small animation.
 *
 * @remarks
 * Extracted as a standalone component so the parent button can switch icons
 * without duplicating animation props.
 *
 * @returns Animated moon icon.
 */
const MoonIcon = (): React.JSX.Element => (
  <motion.div
    className='absolute inset-0 flex items-center justify-center'
    initial={false}
    animate={{
      scale: 1,
      opacity: 1,
    }}
    transition={{duration: 0.2}}>
    <TbMoon className='h-6 w-6 text-zinc-800 dark:text-zinc-200' />
  </motion.div>
);

/**
 * Renders the sun icon with a small animation.
 *
 * @remarks
 * Extracted as a standalone component so the parent button can switch icons
 * without duplicating animation props.
 *
 * @returns Animated sun icon.
 */
const SunIcon = (): React.JSX.Element => (
  <motion.div
    className='absolute inset-0 flex items-center justify-center'
    initial={false}
    animate={{
      scale: 1,
      opacity: 1,
    }}
    transition={{duration: 0.2}}>
    <TbSun className='h-6 w-6 text-zinc-800 dark:text-zinc-200' />
  </motion.div>
);

/**
 * Renders an animated button that toggles between light and dark themes.
 *
 * @remarks
 * **Why the `mounted` guard?** `next-themes` resolves the active theme on the
 * client, so rendering before mount can produce a UI mismatch.
 *
 * **Accessibility**: Uses `aria-label="Toggle theme"` for screen readers.
 *
 * @returns A theme toggle button, or a falsy placeholder before mount.
 *
 * @example
 * ```tsx
 * import ThemeButton from "@/components/Buttons/ThemeButton";
 *
 * export function HeaderActions(): React.JSX.Element {
 *   return <ThemeButton />;
 * }
 * ```
 */
export default function ThemeButton(): React.JSX.Element {
  const [mounted, setMounted] = useState<boolean>(false);
  const {theme, setTheme} = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSetTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setTheme is a stable function.
  }, [theme]);

  if (!mounted) {
    return false as unknown as React.JSX.Element;
  }

  return (
    <motion.button
      className='relative h-10 w-10 cursor-pointer rounded-full border-2 border-zinc-800 transition-colors duration-300 hover:bg-zinc-100 dark:border-zinc-200 dark:hover:bg-zinc-800'
      onClick={handleSetTheme}
      aria-label='Toggle theme'
      whileTap={{scale: 0.95}}>
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </motion.button>
  );
}
