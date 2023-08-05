/** @format */

import {authOptions} from "@/lib/authOptions";
import {getServerSession} from "next-auth";
import Link from "next/link";
import {ReactNode} from "react";

interface Props {
	children: ReactNode;
	description: string;
	title: string;
	callToAction: string;
	callbackAddress: string;
}

export default async function AuthComponent({
	children,
	description,
	title,
	callToAction,
	callbackAddress,
}: Props) {
	const session = await getServerSession(authOptions);
	const isLoggedIn = session?.user ?? session?.expires != null;

	return (
		<div className="container mb-10 px-8 sm:w-1/2">
			<div className="flex h-64 items-center justify-center overflow-hidden rounded-lg">
				{children}
			</div>
			<h2 className="title-font mb-3 mt-6 text-2xl font-medium">{title}</h2>
			<p className="text-base leading-relaxed">{description}</p>
			<Link
				href={callbackAddress}
				className={`${
					isLoggedIn ? "btn-disabled" : undefined
				} " focus:outline-none" btn btn-primary mt-6 flex w-full rounded border-0 px-5 py-2 text-white hover:bg-indigo-600`}>
				{isLoggedIn ? "You are already logged in." : callToAction}
			</Link>
		</div>
	);
}
