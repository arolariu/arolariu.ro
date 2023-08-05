/** @format */

import {Metadata} from "next";

interface Props {
	params: {id: string};
}

export const metadata: Metadata = {
	title: "View Invoice",
	description: "View your uploaded invoice on `arolariu.ro`.",
};

export default async function ViewInvoicePage({params}: Props) {
	console.log(params);
	return (
		<section className="overflow-hidden dark:text-gray-300">
			<h1> HELLO WORLD! </h1>
		</section>
	);
}
