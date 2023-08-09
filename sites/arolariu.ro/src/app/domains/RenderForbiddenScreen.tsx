/** @format */

import CreateAccountSVG from "@/assets/CreateAccountSVG";
import Link from "next/link";

export default async function RenderForbiddenScreen() {
	return (
		<section className="container mx-auto flex flex-col items-center justify-center px-5 py-12">
			<CreateAccountSVG className="mb-4 h-full w-full rounded object-cover object-center md:w-3/6 lg:w-2/6" />
			<div className="w-full text-center lg:w-2/3">
				<h1 className="mb-4 inline bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-3xl font-medium text-transparent sm:text-4xl">
					You&apos;re missing out on the fun!
				</h1>
				<h1 className="mb-4 inline text-4xl font-black sm:text-4xl"> 😎 </h1>
				<p className="my-8 leading-relaxed">
					Unfortunately, this domain service requires you to have an account on our domain.
					<br />
					By creating an account on our platform or signing in with an existing account, you will be
					able to access our whole arsenal of services, including this one.
				</p>
				<div className="flex justify-center">
					<Link
						href="https://arolariu.ro/auth"
						className="inline-flex rounded border-0 bg-indigo-500 px-6 py-2 text-lg text-white hover:bg-indigo-600 focus:outline-none">
						Join the <code className="mx-2">arolariu.ro</code> domain.
					</Link>
				</div>
			</div>
		</section>
	);
}
