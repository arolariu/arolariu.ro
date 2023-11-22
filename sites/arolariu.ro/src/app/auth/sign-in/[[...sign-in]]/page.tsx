/** @format */

import {SignIn} from "@clerk/nextjs";
import {Metadata} from "next";

export const metadata: Metadata = {
	title: "Sign In",
	description: "Sign in to arolariu.ro",
};

export default async function Page() {
	return (
		<main className="container flex flex-col mx-auto my-8">
			<h1 className="my-4 text-2xl font-extrabold text-center">
				Sign in by reusing your account from one of the following providers:
			</h1>
			<div className="mx-auto">
				<SignIn />
			</div>
			<small className="text-lg font-semibold text-center">
				We do not offer the possibility to create an account via an e-mail / password combination at this moment.
			</small>
		</main>
	);
}
