/** @format */

"use client";

import {Session} from "next-auth";

interface Props {
	session: Session;
}

export default function RenderViewInvoicesPage({session}: Props) {
	return (
		<div>
			<h1> HELLO WORLD! </h1>
			<h1> YOU ARE {session.user?.name}! </h1>
		</div>
	);
}
