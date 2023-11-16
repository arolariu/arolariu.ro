import { authMiddleware } from "@clerk/nextjs";
 
// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your Middleware
export default authMiddleware({
    publicRoutes: [
        // General areas that are public.
        "/",
        "/auth",
        "/auth/sign-in",
        "/auth/sign-up",
        "/domains",

        // Invoice public routes:
        "/domains/invoices",
        "/domains/invoices/create-invoice",
        "/domains/invoices/view-invoice/:id*",
        "/domains/invoices/view-invoices",
    ]
});
 
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
