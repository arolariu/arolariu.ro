/** @format */

import ThemeSwitcherButton from "@/app/providers";
import { SITE_URL } from "@/constants";
import fetchUser from "@/lib/fetchUser";
import {SignedIn, SignedOut, UserButton} from "@clerk/nextjs";
import Link from "next/link";

export default async function Header() {
	const {isAuthenticated} = await fetchUser();

	return (
		<header className="text-black bg-white dark:bg-black dark:text-white">
			<div className="container flex flex-col flex-wrap items-center p-5 mx-auto md:flex-row">
				<Link href={SITE_URL} className="flex items-center mb-4 font-medium title-font md:mb-0">
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
					<Link href={`${SITE_URL}/domains`} className="mr-5 indicator hover:text-yellow-300">
						Domains
						<sub className="mx-2 badge badge-primary indicator-end">new</sub>
					</Link>
					{!isAuthenticated && (
						<Link href={`${SITE_URL}/auth`} className="mr-5 hover:text-yellow-300">
							Auth
						</Link>
					)}
					{isAuthenticated && (
						<Link href={`${SITE_URL}/my-profile`} className="mr-5 hover:text-yellow-300">
							Profile
						</Link>
					)}
				</nav>

				<div className="2xsm:mt-8 md:mt-0">
					<SignedOut>
						<Link href={`${SITE_URL}/auth`} className="mr-5 hover:text-yellow-300">
							Login
						</Link>
					</SignedOut>
					<SignedIn>
						<UserButton afterSignOutUrl="/" />
					</SignedIn>
					<ThemeSwitcherButton/>
				</div>
			</div>
		</header>
	);
}
