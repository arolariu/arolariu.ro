/** @format */

import RenderForbiddenScreen from "@/app/domains/RenderForbiddenScreen";
import {authOptions} from "@/lib/authOptions";
import {Metadata} from "next";
import {getServerSession} from "next-auth";
import {RenderViewInvoicePage} from "./island";

interface Props {
	params: {id: string};
}

export const metadata: Metadata = {
	title: "View Invoice",
	description: "View your uploaded invoice on `arolariu.ro`.",
};

export default async function ViewInvoicePage({params}: Props) {
	const session = await getServerSession(authOptions);
	return (
		<section className="overflow-hidden dark:text-gray-300">
			{session ? (
				<RenderViewInvoicePage session={session} id={params.id} />
			) : (
				<RenderForbiddenScreen />
			)}
		</section>
	);
}
