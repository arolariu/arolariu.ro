/** @format */

import {Metadata} from "next";
import RenderStatisticsPage from "./island";

export const metadata: Metadata = {
	title: "Statistics",
	description: "Statistics page on arolariu.ro",
};

export default async function StatisticsPage() {
	return (
		<main>
			<RenderStatisticsPage />
		</main>
	);
}
