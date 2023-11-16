/** @format */

import Image from "next/image";
import Link from "next/link";

export default async function RenderForbiddenScreen() {
	const sitePath = process.env["SITE_URL"] as string;

	return (
		<section className="container flex flex-col items-center justify-center px-5 py-12 mx-auto">
			<Image src="/images/auth/forbidden.svg" alt="Forbidden SVG" width={"500"} height={"500"} className="object-cover object-center mb-4 rounded md:w-3/6 lg:w-2/6"/>
			<div className="w-full text-center lg:w-2/3">
				<h1 className="inline mb-4 text-3xl font-medium text-transparent bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text sm:text-4xl">
					You&apos;re missing out on the fun!
				</h1>
				<h1 className="inline mb-4 text-4xl font-black sm:text-4xl"> 😎 </h1>
				<p className="my-8 leading-relaxed">
					Unfortunately, this domain service requires you to have an account on our domain.
					<br />
					By creating an account on our platform or signing in with an existing account, you will be
					able to access our whole arsenal of services, including this one.
				</p>
				<div className="flex justify-center">
					<Link
						href={`${sitePath}/auth`}
						className="inline-flex px-6 py-2 text-lg text-white bg-indigo-500 border-0 rounded hover:bg-indigo-600 focus:outline-none">
						Join the <code className="mx-2">arolariu.ro</code> domain.
					</Link>
				</div>
			</div>
		</section>
	);
}
