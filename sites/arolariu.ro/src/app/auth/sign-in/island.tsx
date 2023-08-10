/** @format */
"use client";

import {ClientSafeProvider, signIn} from "next-auth/react";
import {FaDiscord, FaGithubSquare, FaGoogle, FaLock} from "react-icons/fa";

const getSVGForProvider = ({providerName}: {providerName: string}) => {
	switch (providerName) {
		case "GitHub":
			return <FaGithubSquare className="m-auto p-2 text-[7.5rem]" />;
		case "Discord":
			return <FaDiscord className="m-auto p-2 text-[7.5rem]" />;
		case "Google":
			return <FaGoogle className="m-auto p-2 text-[7.5rem]" />;
		default:
			return <FaLock className="m-auto p-2 text-[7.5rem]" />;
	}
};

const getProviderDescription = ({providerName}: {providerName: string}) => {
	switch (providerName) {
		case "GitHub":
			return "Sign in using your GitHub account. By selecting this auth method, you acknowledge that you have an active GitHub account.";
		case "Discord":
			return "Sign in using your Discord account. By selecting this auth method, you acknowledge that you have an active Discord account.";
		case "Google":
			return "Sign in using your Google account. By selecting this auth method, you acknowledge that you have an active Google account.";
		default:
			return "Sign in using your account.";
	}
};

export default function SignInIsland({
	provider,
	callbackUrl,
}: {
	provider: ClientSafeProvider;
	callbackUrl: string;
}) {
	return (
		<div
			className="container mx-auto my-4 w-1/2 cursor-pointer rounded-xl border-2 border-dashed text-center hover:border-solid hover:border-black md:grid md:grid-flow-col"
			onClick={() => signIn(provider.id, {callbackUrl: callbackUrl})}>
			<div className="">{getSVGForProvider({providerName: provider.name})}</div>
			<div className="">
				<h1 className="my-4">
					Provider name:{" "}
					<span className="font-mono font-semibold tracking-widest">{provider.name}</span>
				</h1>
				{getProviderDescription({providerName: provider.name})}
			</div>
		</div>
	);
}
