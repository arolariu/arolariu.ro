"use client";

import {motion} from "motion/react";
import {useTheme} from "next-themes";
import React, {useCallback, useEffect, useState} from "react";
import {TbMoon, TbSun} from "react-icons/tb";

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
 * The theme switcher button component.
 * This component allows the user to switch between light and dark themes.
 * @returns The theme switcher button that holds the theme switcher logic.
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
