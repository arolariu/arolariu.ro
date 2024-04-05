import {SignIn} from "@clerk/nextjs";
import {type Metadata} from "next";

export const metadata: Metadata = {
	title: "Sign In",
	description: "Sign in to arolariu.ro",
};

/**
 * The sign in page.
 * @returns The sign in page.
 */
export default async function Page() {
	return (
		<main className="flex flex-col 2xsm:p-2 sm:p-4 md:p-8 2xsm:mt-16 md:mt-0">
			<h1 className="my-4 text-2xl font-extrabold text-center">
				Sign in by reusing your account from one of the following providers:
			</h1>
			<div className="mx-auto">
				<SignIn />
			</div>
			<small className="py-16 mb-8 text-lg font-semibold text-center">
				We do not offer the possibility to create an account via an e-mail / password combination at this moment.
			</small>
		</main>
	);
}
