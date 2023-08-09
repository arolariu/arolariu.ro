/** @format */

import RenderDomainService from "@/app/domains/RenderDomainService";
import invoiceManagementSystemPhoto from "@/assets/invoice-management-system.png";
import {Metadata} from "next";

export const metadata: Metadata = {
	title: "Domain Space Services",
	description:
		"Domain Space Services are services that are offered to visitors and members of the `arolariu.ro` domain space",
};

export default async function DomainsHomepage() {
	return (
		<section className="dark:text-gray-300">
			<div className="container px-5 py-24 mx-auto">
				<div className="flex flex-col">
					<div className="h-1 overflow-hidden bg-gray-200 rounded">
						<div className="w-24 h-full bg-indigo-500"></div>
					</div>
					<div className="flex flex-col flex-wrap py-6 mb-12 sm:flex-row">
						<h1 className="justify-center mb-2 text-5xl font-bold text-center text-transparent align-center justify-items-center bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text sm:mb-0 sm:w-2/5">
							Domain Space Services
						</h1>
						<p className="pl-0 text-base leading-relaxed sm:w-3/5 sm:pl-10">
							The <code className="font-extrabold text-blue-400">arolariu.ro</code> domain offers a
							wide range of services under it&apos;s umbrella. Most of the services require that you
							have an account created on this platform, so that your data can be safely synchronized
							across all the domain services.
							<br />
							Here you can see a showcase of all domain services that are available for exploration.
						</p>
					</div>
				</div>

				<div className="flex flex-wrap -mx-4 -mt-4 -mb-10 sm:-m-4">
					<RenderDomainService
						title="Invoice Management System"
						description="This domain space service assists with the digital transformation of physical receipts. It allows users to upload receipts, and get carefully-crafted insights into their spending habits."
						linkTo="/domains/invoices"
						imageUrl={invoiceManagementSystemPhoto.src}
					/>
				</div>
			</div>
		</section>
	);
}
