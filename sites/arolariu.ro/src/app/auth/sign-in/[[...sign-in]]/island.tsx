"use client";

import {SignIn} from "@clerk/nextjs";
import {motion} from "motion/react";

/**
 * The sign in client component with enhanced visual presentation.
 *
 * @remarks
 * **Rendering Context**: Client Component wrapping Clerk's SignIn.
 *
 * **Animation Features**:
 * - Fade-in entrance animation
 * - Smooth scale-up effect
 * - Spring physics for natural movement
 *
 * **Styling**:
 * - Centered layout
 * - Shadow and border effects
 * - Responsive design
 * - Dark mode support
 *
 * @returns The animated sign in component with Clerk authentication.
 */
export default function RenderSignInPage(): React.JSX.Element {
  return (
    <motion.div
      initial={{opacity: 0, y: 20, scale: 0.95}}
      animate={{opacity: 1, y: 0, scale: 1}}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 15,
        duration: 0.5,
      }}
      className='mx-auto flex justify-center'>
      <div className='border-border/50 bg-card/50 hover:border-border hover:shadow-primary/10 w-full rounded-2xl border p-2 shadow-2xl backdrop-blur-sm transition-all duration-300 sm:p-4'>
        <SignIn />
      </div>
    </motion.div>
  );
}
