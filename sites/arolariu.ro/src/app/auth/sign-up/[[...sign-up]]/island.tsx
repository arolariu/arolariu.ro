"use client";

import {SignUp} from "@clerk/nextjs";
import {motion} from "motion/react";

/**
 * The sign up client component with enhanced visual presentation.
 *
 * @remarks
 * **Rendering Context**: Client Component wrapping Clerk's SignUp.
 *
 * **Animation Features**:
 * - Fade-in entrance animation
 * - Smooth scale-up effect
 * - Spring physics for natural movement
 *
 * **Styling**:
 * - Centered layout
 * - Elevated card design
 * - Responsive padding
 * - Dark mode compatibility
 *
 * @returns The animated sign up component with Clerk authentication.
 */
export default function RenderSignUpPage(): React.JSX.Element {
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
        <SignUp />
      </div>
    </motion.div>
  );
}
