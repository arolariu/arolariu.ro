/** @format */

import RenderDynamicProfilePage from "@/components/my-profile/RenderDynamicProfilePage";
import {authOptions} from "@/lib/authOptions";
import {Metadata} from "next";
import {getServerSession} from "next-auth";
import {redirect} from "next/navigation";

export const metadata: Metadata = {
	title: "My Profile",
	description: "My profile page on arolariu.ro",
};

export default async function ProfilePage() {
	const session = await getServerSession(authOptions);

	if (session == null) {
		return redirect("/");
	} else {
		return (
			<main className="container flex mx-auto">
				<RenderDynamicProfilePage session={session} />
			</main>
		);
	}
}
