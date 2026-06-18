import type {Decorator} from "@storybook/react";
import {__setStorybookSignedOut} from "../../../../../../.storybook/mocks/clerkNextjs";

/**
 * Decorator that forces the mock Clerk auth into a signed-in or signed-out state
 * for the duration of a story.
 *
 * @remarks
 * Imports the toggle directly from the Storybook Clerk mock. Vite resolves both
 * this relative import and the `@clerk/nextjs` alias to the same module instance,
 * so the state set here is observed by components calling `useAuth`/`useUser`.
 *
 * @param signedOut - When true, the story renders as a signed-out user.
 * @returns A Storybook decorator.
 */
export function withAuthState(signedOut: boolean): Decorator {
	return function AuthStateDecorator(Story) {
		__setStorybookSignedOut(signedOut);
		return <Story />;
	};
}
