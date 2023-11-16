/** @format */

import fetchUser from "@/lib/fetchUser";
import {SignedIn, SignedOut, UserButton} from "@clerk/nextjs";
import Link from "next/link";

export default async function Header() {
	const {isAuthenticated} = await fetchUser();
	const sitePath = process.env["SITE_URL"] as string;

	return (
		<header className="dark:text-white">
			<div className="container flex flex-col flex-wrap items-center p-5 mx-auto md:flex-row">
				<Link href={sitePath} className="flex items-center mb-4 font-medium title-font md:mb-0">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						stroke="currentColor"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2"
						className="w-10 h-10 p-2 bg-indigo-500 rounded-full"
						viewBox="0 0 24 24">
						<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
					</svg>
					<span className="ml-3 text-xl">arolariu.ro</span>
				</Link>
				<nav className="flex flex-wrap items-center justify-center text-base md:ml-auto md:mr-auto">
					<Link href={`${sitePath}/domains`} className="mr-5 indicator hover:text-yellow-300">
						Domains
						<sub className="mx-2 badge badge-primary indicator-end">new</sub>
					</Link>
					{isAuthenticated && (
						<Link href={`${sitePath}/my-profile`} className="mr-5 hover:text-yellow-300">
							Profile
						</Link>
					)}
				</nav>

				<div>
					<SignedOut>
						<Link href={`${sitePath}/auth`} className="mr-5 hover:text-yellow-300">
							Login
						</Link>
					</SignedOut>
					<SignedIn>
						<UserButton afterSignOutUrl="/" />
					</SignedIn>
				</div>
			</div>
		</header>
	);
}
