/** @format */

import SignInIsland from "@/app/auth/sign-in/island";
import {authOptions} from "@/lib/authOptions";
import {Metadata} from "next";
import {getServerSession} from "next-auth/next";
import {ClientSafeProvider, getProviders} from "next-auth/react";
import {redirect} from "next/navigation";

interface SignInPageProps {
	searchParams: {
		callbackUrl: string;
	};
}

export const metadata: Metadata = {
	title: "Sign In",
	description: "Sign in to arolariu.ro",
};

export default async function SignIn({searchParams}: SignInPageProps) {
	const session = await getServerSession(authOptions);
	const providers = await getProviders();
	const providersList: ClientSafeProvider[] = Object.values(providers as any);

	if (session?.user || session?.expires != null) {
		return redirect("/");
	} else {
		return (
			<main className="container mx-auto my-8 flex flex-col">
				<h1 className="my-4 text-center text-2xl font-extrabold">
					Sign in by reusing your account from one of the following providers:
				</h1>
				{providersList.map((provider) => (
					<SignInIsland
						key={provider.id}
						provider={provider}
						callbackUrl={searchParams.callbackUrl}
					/>
				))}
				<small className="text-center text-lg font-semibold">
					We do not offer the possibility to create an account via an e-mail / password combination
					at this moment.
				</small>
			</main>
		);
	}
}
