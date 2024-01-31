import {authMiddleware} from "@clerk/nextjs";

export default authMiddleware({
	publicRoutes: [
		// General areas that are public.
		"/",

		// About routes:
		"/about",
		"/about/the-platform",
		"/about/the-author",

		// Auth routes:
		"/auth",
		"/auth/sign-in",
		"/auth/sign-up",

		// Domains public routes:
		"/domains",
		"/domains/invoices",
		"/domains/invoices/create-invoice",
		"/domains/invoices/view-invoice/:id",
		"/domains/invoices/view-invoices",

		// Events public routes:
		"/events",

		// Account public routes:
		"/accounts",
		"/accounts/:account",

		// Blog public routes:
		"/blog",
		"/blog/:slug",

		// ToS and Privacy Policy
		"/terms-of-service",
		"/privacy-policy",
	],
});

export const config = {
	matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
