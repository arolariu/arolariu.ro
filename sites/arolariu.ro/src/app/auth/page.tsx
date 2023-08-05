/** @format */

import AuthComponent from "@/app/auth/AuthComponent";
import AuthPageSigninSVG from "@/assets/AuthPageSigninSVG";
import AuthPageSignupSVG from "@/assets/AuthPageSignupSVG";
import {Metadata} from "next";

export const metadata: Metadata = {
	title: "Auth",
	description: "The authentication page for the `arolariu.ro` platform.",
};

export default async function AuthPage() {
	return (
		<section className="body-font dark:text-gray-300">
			<div className="container mx-auto px-5 py-24">
				<div className="mx-4 mb-10 flex flex-wrap text-center">
					<AuthComponent
						title="Become a new member today."
						description="Being part of the `arolariu.ro` domain space allows you to save your profile across all the different domains hosted under the `arolariu.ro` umbrella. You can benefit from seamless synchronization and a unified experience across all the domains."
						callToAction="Sign up."
						callbackAddress="/api/auth/signin?callbackUrl=/auth">
						<AuthPageSignupSVG className="h-full w-full object-cover" />
					</AuthComponent>
					<AuthComponent
						title="Continue as an existing member."
						description="Sign in using your member credentials. Your profile will be kept in sync during this browser session."
						callToAction="Sign in."
						callbackAddress="/api/auth/signin?callbackUrl=/auth">
						<AuthPageSigninSVG className="h-full w-full object-cover" />
					</AuthComponent>
				</div>
			</div>
		</section>
	);
}
