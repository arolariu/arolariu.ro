/** @format */

"use client";

import Image from "next/image";
import Link from "next/link";

export default function DomainService({
	title = "Placeholder title",
	description = "Placeholder descriptipn",
	imageUrl = "https://dummyimage.com/1203x503",
	linkTo = "https://arolariu.ro",
}) {
	return (
		<div className="mb-6 p-4 sm:mb-0 md:w-1/3">
			<div className="h-64 overflow-hidden rounded-lg">
				<Image
					alt="content"
					className="h-full w-full object-cover object-center"
					src={imageUrl}
					width={600}
					height={400}
				/>
			</div>
			<h2 className="title-font mt-5 text-xl font-medium dark:text-gray-300">{title}</h2>
			<p className="mt-2 text-base leading-relaxed">{description}</p>
			<Link href={linkTo} className="mt-3 inline-flex items-center text-indigo-500">
				Visit this domain service
				<svg
					fill="none"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					className="ml-2 h-4 w-4"
					viewBox="0 0 24 24">
					<path d="M5 12h14M12 5l7 7-7 7"></path>
				</svg>
			</Link>
		</div>
	);
}
