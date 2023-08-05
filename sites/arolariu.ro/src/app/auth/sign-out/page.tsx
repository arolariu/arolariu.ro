/** @format */

import SignOutIsland from "@/app/auth/sign-out/island";
import {authOptions} from "@/lib/authOptions";
import {Metadata} from "next";
import {getServerSession} from "next-auth/next";
import {redirect} from "next/navigation";

interface SignOutPageProps {
	searchParams: {callbackUrl: string};
}

export const metadata: Metadata = {
	title: "Sign Out",
	description: "Sign out from arolariu.ro",
};

export default async function SignOut({searchParams}: SignOutPageProps) {
	const session = await getServerSession(authOptions);

	if (session == null) {
		return redirect("/");
	} else {
		return (
			<main className="container mx-auto my-8 flex flex-col">
				<SignOutIsland callbackUrl={searchParams.callbackUrl} />
			</main>
		);
	}
}
