/** @format */

import { Session } from "next-auth";

interface Props {
	session: Session;
}

export default function YourProfileComponent({ session }: Props) {
	return (
		<div>
			<h1> Hello world!</h1>
			<h2> Your name is {session.user?.name}</h2>
		</div>
	);
}
