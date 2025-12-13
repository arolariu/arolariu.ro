import type {Metadata} from "next";
import RenderSignUpPage from "./island";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Sign up to arolariu.ro",
};

/**
 * The sign up page with enhanced modern design.
 *
 * @remarks
 * **Rendering Context**: Server Component (default in Next.js App Router).
 *
 * **Design Improvements**:
 * - Centered layout with maximum width container
 * - Eye-catching gradient heading
 * - Clean, modern spacing
 * - Responsive design for all screen sizes
 *
 * **Value Proposition**:
 * - Clear call to action
 * - Emphasis on quick registration
 * - Professional appearance
 *
 * @returns The enhanced sign up page with Clerk authentication component.
 */
export default async function SignUpPage(): Promise<React.JSX.Element> {
  return (
    <section className='relative flex min-h-[calc(100vh-200px)] w-full items-center justify-center px-4 py-12 sm:px-6 lg:px-8'>
      <div className='w-full max-w-md space-y-8'>
        <div className='text-center'>
          <h1 className='bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl dark:from-blue-400 dark:to-cyan-400'>
            Join Us Today
          </h1>
          <p className='text-muted-foreground mt-4 text-lg'>Create your account in seconds with your preferred provider</p>
        </div>

        <div className='mt-8'>
          <RenderSignUpPage />
        </div>

        <div className='text-muted-foreground space-y-2 text-center text-sm'>
          <p>Quick and secure registration</p>
          <p>No credit card required</p>
        </div>
      </div>
    </section>
  );
}
