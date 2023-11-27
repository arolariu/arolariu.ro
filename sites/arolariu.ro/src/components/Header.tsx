/** @format */

import ThemeSwitcherButton from "@/app/providers";
import {SITE_URL} from "@/constants";
import {SignedIn, SignedOut, UserButton} from "@clerk/nextjs";
import Link from "next/link";
import {GiHamburgerMenu} from "react-icons/gi";
import Navigation from "./Navigation";

export default async function Header() {
	return (
		<header className="text-black bg-white dark:bg-black dark:text-white">
			<nav className="navbar">
				<div className="navbar-start">
					<div className="dropdown">
						<GiHamburgerMenu tabIndex={0} className="w-full h-full btn btn-circle btn-ghost lg:hidden" />
						<Navigation className="menu dropdown-content menu-sm lg:ml-[12%]" />
					</div>

					<Link href={SITE_URL} className="flex items-center ml-2 font-medium">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							className="w-10 h-10 p-2 text-white bg-indigo-500 rounded-full"
							viewBox="0 0 24 24">
							<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
						</svg>
						<span className="ml-3 text-xl">arolariu.ro</span>
					</Link>
				</div>

				<div className="hidden navbar-center lg:flex">
					<Navigation className="menu menu-horizontal" />
				</div>

				<div className="navbar-end">
					<SignedOut>
						<Link href={`${SITE_URL}/auth`} className="mr-5 hover:text-yellow-300">
							Login
						</Link>
					</SignedOut>
					<SignedIn>
						<UserButton afterSignOutUrl="/" />
					</SignedIn>
					<ThemeSwitcherButton />
				</div>
			</nav>
		</header>
	);
}
