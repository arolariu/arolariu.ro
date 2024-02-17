/** @format */

import Image from "next/image";
import Link from "next/link";

export default async function DomainServiceCard({
	title = "Placeholder title",
	description = "Placeholder descriptipn",
	imageUrl = "https://dummyimage.com/1203x503",
	linkTo = "https://arolariu.ro",
}) {
	return (
		<div className="max-w-[20rem] p-4 mb-6 sm:mb-0">
			<div className="h-64 overflow-hidden rounded-lg">
				<Image
					alt="content"
					className="object-cover object-center w-full h-full"
					src={imageUrl}
					width={600}
					height={400}
				/>
			</div>
			<h2 className="mt-5 text-xl font-medium title-font dark:text-gray-300">{title}</h2>
			<p className="mt-2 text-base leading-relaxed">{description}</p>
			<Link href={linkTo} className="inline-flex items-center mt-3 text-indigo-500">
				Visit this domain service
				<svg
					fill="none"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					className="w-4 h-4 ml-2"
					viewBox="0 0 24 24">
					<path d="M5 12h14M12 5l7 7-7 7"></path>
				</svg>
			</Link>
		</div>
	);
}
