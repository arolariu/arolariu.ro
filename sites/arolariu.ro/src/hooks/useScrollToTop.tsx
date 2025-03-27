/** @format */

"use client";

import {AnimatePresence, motion} from "motion/react";
import {useCallback, useEffect, useState} from "react";
import {TbChevronUp} from "react-icons/tb";

/**
 * A component that displays a "scroll to top" button when the user scrolls down the page.
 * The button appears when the user scrolls more than 500 pixels down and disappears when they scroll back up.
 * @returns A React component that renders an animated button in the bottom-right corner of the screen.
 * When clicked, it smoothly scrolls the window back to the top.
 * @example
 * ```tsx
 * function MyPage() {
 *   return (
 *     <div>
 *       <Content />
 *       <ScrollToTop />
 *     </div>
 *   );
 * }
 * ```
 */
export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const handleScrollToTop = useCallback(() => {
    globalThis.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    const toggleVisibility = () => {
      if (globalThis.scrollY > 500) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    globalThis.addEventListener("scroll", toggleVisibility);
    return () => globalThis.removeEventListener("scroll", toggleVisibility);
  }, []);

  return (
    <AnimatePresence>
      {Boolean(isVisible) && (
        <motion.button
          initial={{opacity: 0, scale: 0.5}}
          animate={{opacity: 1, scale: 1}}
          exit={{opacity: 0, scale: 0.5}}
          transition={{duration: 0.3}}
          onClick={handleScrollToTop}
          className='fixed bottom-8 right-8 z-50 rounded-full bg-primary p-3 text-white shadow-lg transition-colors duration-300 hover:bg-primary/90'
          whileHover={{scale: 1.1}}
          whileTap={{scale: 0.9}}>
          <TbChevronUp className='h-6 w-6' />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
