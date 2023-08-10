/** @format */
"use client";

import {signOut} from "next-auth/react";

export default function SignOutIsland({callbackUrl}: {callbackUrl: string}) {
	return (
		<div
			className="container mx-auto my-4 w-1/2 cursor-pointer rounded-xl border-2 border-dashed text-center hover:border-solid hover:border-black md:grid md:grid-flow-col"
			onClick={() => signOut({callbackUrl: callbackUrl})}>
			<div className="">
				<h1 className="my-4">SIGN OUT</h1>
			</div>
		</div>
	);
}
