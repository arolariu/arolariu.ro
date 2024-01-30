import {SITE_URL} from "@/constants";
import fetchUser from "@/lib/fetchUser";
import Link from "next/link";

interface Props { className?: string }

export default async function Navigation({className}: Readonly<Props>) {
	const {user, isAuthenticated} = await fetchUser();
	// TODO: user identifier should be a GUID.

	return (
		<ul className={className}>
			<li>
				<Link href={`${SITE_URL}/domains`} className="mr-5 indicator hover:text-yellow-300">
					Domains
					<sub className="mx-2 badge badge-primary indicator-end">new</sub>
				</Link>
			</li>
			<li>
				<Link href={`${SITE_URL}/events`} className="mr-5 indicator hover:text-yellow-300">
					Events
				</Link>
			</li>

			{!isAuthenticated && (
				<li>
					<Link href={`${SITE_URL}/auth`} className="mr-5 indicator hover:text-yellow-300">
						Auth
					</Link>
				</li>
			)}
			{isAuthenticated && (
				<li>
					<Link href={`${SITE_URL}/accounts/${user?.id}`} className="mr-5 indicator hover:text-yellow-300">
						Account
					</Link>
				</li>
			)}
		</ul>
	);
}
