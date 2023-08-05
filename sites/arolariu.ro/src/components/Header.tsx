/** @format */

import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth/next";
import Link from "next/link";

export default async function Header() {
	const session = await getServerSession(authOptions);
	return (
		<header className="dark:text-white">
			<div className="container mx-auto flex flex-col flex-wrap items-center p-5 md:flex-row">
				<Link
					href="https://arolariu.ro"
					className="title-font mb-4 flex items-center font-medium md:mb-0"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						stroke="currentColor"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2"
						className="h-10 w-10 rounded-full bg-indigo-500 p-2"
						viewBox="0 0 24 24"
					>
						<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
					</svg>
					<span className="ml-3 text-xl">arolariu.ro</span>
				</Link>
				<nav className="flex flex-wrap items-center justify-center text-base md:ml-auto md:mr-auto">
					<Link
						href="https://arolariu.ro/domains"
						className="indicator mr-5 hover:text-yellow-300"
					>
						Domains
						<sub className="badge badge-primary indicator-end mx-2">new</sub>
					</Link>
					<Link
						href="https://arolariu.ro/statistics"
						className="mr-5 hover:text-yellow-300"
					>
						Statistics
					</Link>
					<Link
						href="https://arolariu.ro/health"
						className="mr-5 hover:text-yellow-300"
					>
						Health
					</Link>
					{session ? (
						<Link
							href="https://arolariu.ro/my-profile"
							className="mr-5 hover:text-yellow-300"
						>
							Profile
						</Link>
					) : undefined}
				</nav>

				<Link
					href={
						session
							? "http://localhost:3000/api/auth/signout?callbackUrl=http://localhost:3000/"
							: "http://localhost:3000/auth"
					}
					className="mt-4 inline-flex items-center rounded border-0 px-3 py-1 text-base hover:bg-gray-200 focus:outline-none dark:bg-gray-100 dark:text-black md:mt-0"
				>
					{session ? "Sign out" : "Sign in"}
					<svg
						fill="none"
						stroke="currentColor"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2"
						className="ml-1 h-4 w-4"
						viewBox="0 0 24 24"
					>
						<path d="M5 12h14M12 5l7 7-7 7"></path>
					</svg>
				</Link>
			</div>
		</header>
	);
}
