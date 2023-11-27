/** @format */

import fetchUser from "@/lib/fetchUser";
import {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
	title: "Auth",
	description: "The authentication page for the `arolariu.ro` platform.",
};

export default async function AuthPage() {
	const {isAuthenticated} = await fetchUser();
	if (isAuthenticated) { return redirect("/"); }

	return (
		<section className="body-font dark:text-gray-300">
			<div className="container px-5 py-24 mx-auto">
				<div className="flex flex-wrap mx-4 mb-10 text-center">
					{/* Sign up component */}
					<div className="container px-8 mb-10 sm:w-1/2">
						<div className="flex items-center justify-center h-64 overflow-hidden rounded-lg">
							<Image src="/images/auth/sign-up.svg" alt="Sign up SVG" width={"300"} height={"500"} className="object-cover"/>
						</div>
						<h2 className="mt-6 mb-3 text-2xl font-medium title-font">Become a new member today.</h2>
						<p className="text-base leading-relaxed">
							Being part of the `arolariu.ro` domain space allows you to save your profile across all the different
							domains hosted under the `arolariu.ro` umbrella. You can benefit from seamless synchronization and a
							unified experience across all the domains.
						</p>
						<Link
							href="/auth/sign-up/"
							className="flex w-full px-5 py-2 mt-6 text-white border-0 rounded focus:outline-none btn btn-primary hover:bg-indigo-600">
							Sign up.
						</Link>
					</div>
					{/* Sign in component */}
					<div className="container px-8 mb-10 sm:w-1/2">
						<div className="flex items-center justify-center h-64 overflow-hidden rounded-lg">
							<Image src="/images/auth/sign-in.svg" alt="Sign in SVG" width={"300"} height={"500"} className="object-cover" />
						</div>
						<h2 className="mt-6 mb-3 text-2xl font-medium title-font">Continue as an existing member.</h2>
						<p className="text-base leading-relaxed">
							Sign in using your member credentials. Your profile will be kept in sync during this browser session.
						</p>
						<Link
							href="/auth/sign-in/"
							className="flex w-full px-5 py-2 mt-6 text-white border-0 rounded focus:outline-none btn btn-primary hover:bg-indigo-600">
							Sign in.
						</Link>
					</div>
				</div>
			</div>
		</section>
	);
}
