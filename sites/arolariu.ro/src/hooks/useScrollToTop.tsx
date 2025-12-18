"use client";

/**
 * @fileoverview Animated scroll-to-top button component.
 * @module hooks/useScrollToTop
 *
 * @remarks
 * Despite living under `src/hooks`, this file exports a UI component (not a
 * hook). It is client-only and attaches a scroll listener.
 */

import {AnimatePresence, motion} from "motion/react";
import {useCallback, useEffect, useState} from "react";
import {TbChevronUp} from "react-icons/tb";

/**
 * Displays an animated floating action button that scrolls to top of page.
 *
 * @remarks
 * **Rendering Context**: Client Component (requires "use client" directive).
 *
 * **Visibility Behavior:**
 * - Button hidden by default
 * - Appears when user scrolls more than 500px down the page
 * - Disappears when user scrolls back above 500px threshold
 *
 * **Animation:**
 * - Uses Framer Motion (`motion/react`) for smooth transitions
 * - Fade in/out with scale animation (opacity + scale)
 * - Hover effect: Scales up to 1.1x
 * - Tap effect: Scales down to 0.9x
 * - Entry/exit duration: 300ms
 *
 * **Scroll Behavior:**
 * - Smooth scroll animation (`behavior: "smooth"`)
 * - Scrolls to absolute top (`top: 0`)
 * - Uses native `window.scrollTo` API
 *
 * **Positioning:**
 * - Fixed position in bottom-right corner
 * - 32px from right edge (`right-8`)
 * - 32px from bottom edge (`bottom-8`)
 * - Z-index 50 (above most content)
 *
 * **Accessibility:**
 * - Interactive button element (keyboard accessible)
 * - Icon-only button (consider adding aria-label in production)
 *
 * **Performance:**
 * - Uses `useCallback` for stable scroll handler
 * - Debounced via native scroll event throttling
 * - Cleanup removes event listener on unmount
 *
 * @returns Animated floating action button (FAB) or null when hidden
 *
 * @example
 * ```tsx
 * // Add to layout for site-wide scroll-to-top
 * export default function RootLayout({children}: {children: React.ReactNode}) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <ScrollToTop />
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Add to specific page with long content
 * export default function BlogPost() {
 *   return (
 *     <article>
 *       <LongContent />
 *       <ScrollToTop />
 *     </article>
 *   );
 * }
 * ```
 *
 * @see {@link https://www.framer.com/motion/ Framer Motion Documentation}
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
          className='bg-primary hover:bg-primary/90 fixed right-8 bottom-8 z-50 rounded-full p-3 text-white shadow-lg transition-colors duration-300'
          whileHover={{scale: 1.1}}
          whileTap={{scale: 0.9}}>
          <TbChevronUp className='h-6 w-6' />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
