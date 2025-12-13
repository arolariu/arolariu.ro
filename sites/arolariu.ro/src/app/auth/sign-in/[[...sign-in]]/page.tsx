import type {Metadata} from "next";
import RenderSignInPage from "./island";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to arolariu.ro",
};

/**
 * The sign in page with enhanced modern design.
 *
 * @remarks
 * **Rendering Context**: Server Component (default in Next.js App Router).
 *
 * **Design Improvements**:
 * - Centered layout with maximum width container
 * - Prominent heading with gradient text effect
 * - Better spacing and padding for mobile/desktop
 * - Backdrop blur effect for depth
 *
 * **Responsive Behavior**:
 * - Mobile: Full width with padding
 * - Tablet/Desktop: Centered with max-width constraint
 *
 * @returns The enhanced sign in page with Clerk authentication component.
 */
export default async function SignInPage(): Promise<React.JSX.Element> {
  return (
    <section className='relative flex min-h-[calc(100vh-200px)] w-full items-center justify-center px-4 py-12 sm:px-6 lg:px-8'>
      <div className='w-full max-w-md space-y-8'>
        <div className='text-center'>
          <h1 className='bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent dark:from-indigo-400 dark:to-purple-400 sm:text-5xl'>
            Welcome Back
          </h1>
          <p className='mt-4 text-lg text-muted-foreground'>
            Sign in with your preferred provider to continue
          </p>
        </div>

        <div className='mt-8'>
          <RenderSignInPage />
        </div>

        <p className='text-center text-sm text-muted-foreground'>
          Protected by enterprise-grade security
        </p>
      </div>
    </section>
  );
}
