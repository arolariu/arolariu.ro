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
import {useTranslations} from "next-intl";
import {useTheme} from "next-themes";
import {useCallback, useEffect, useState} from "react";
import {TbMoon, TbSun} from "react-icons/tb";
import styles from "./ThemeButton.module.scss";

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
    className={styles["iconWrapper"]}
    initial={false}
    animate={{
      scale: 1,
      opacity: 1,
    }}
    transition={{duration: 0.2}}>
    <TbMoon className={styles["icon"]} />
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
    className={styles["iconWrapper"]}
    initial={false}
    animate={{
      scale: 1,
      opacity: 1,
    }}
    transition={{duration: 0.2}}>
    <TbSun className={styles["icon"]} />
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
  const t = useTranslations("Common.accessibility");

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
      className={styles["themeButton"]}
      onClick={handleSetTheme}
      aria-label={t("toggleTheme")}
      whileTap={{scale: 0.95}}>
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </motion.button>
  );
}
