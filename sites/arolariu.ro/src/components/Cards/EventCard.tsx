import Image from "next/image";
import Link from "next/link";

interface Props {
	title: string;
	description: string;
	date: string;
	location: string;
	imagePath: string;
	formLink: string;
}

export default function EventCard({title, description, date, location, imagePath, formLink}: Readonly<Props>) {
	return (
		<Link href={formLink ?? ""}>
			<div className="overflow-hidden bg-white rounded-lg shadow-lg dark:bg-gray-800 2xsm:w-full md:w-1/2 lg:w-1/3 2xl:w-1/4">
				<Image
					className="object-fill object-center w-full"
					src={imagePath ?? "https://dummyimage.com/720x400&text=TBA"}
					width={720}
					height={400}
					alt={title + " event image"}
				/>
				<div className="p-4 2xsm:text-center md:text-left">
					<h1 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white">{title}</h1>
					<p className="text-gray-600 dark:text-gray-400">{description}</p>
					<div className="flex items-center justify-between gap-4 mt-4 2xsm:flex-col md:flex-row">
						<div className="flex items-center">
							<svg className="w-6 h-6 text-gray-500 fill-current" viewBox="0 0 24 24">
								<path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20Z" />
								<path d="M12 6C10.9 6 10 6.9 10 8C10 9.1 10.9 10 12 10C13.1 10 14 9.1 14 8C14 6.9 13.1 6 12 6Z" />
								<path d="M12 18C16.42 18 19.5 14.92 19.5 11C19.5 7.08 16.42 4 12 4C7.58 4 4.5 7.08 4.5 11C4.5 14.92 7.58 18 12 18ZM12 20C6.48 20 2 15.52 2 10C2 4.48 6.48 0 12 0C17.52 0 22 4.48 22 10C22 15.52 17.52 20 12 20Z" />
							</svg>
							<p className="ml-2 text-gray-600 dark:text-gray-400">{date}</p>
						</div>
						<div className="flex items-center ml-4">
							<svg className="w-6 h-6 text-gray-500 fill-current" viewBox="0 0 24 24">
								<path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20Z" />
								<path d="M12 6C10.9 6 10 6.9 10 8C10 9.1 10.9 10 12 10C13.1 10 14 9.1 14 8C14 6.9 13.1 6 12 6Z" />
								<path d="M12 18C16.42 18 19.5 14.92 19.5 11C19.5 7.08 16.42 4 12 4C7.58 4 4.5 7.08 4.5 11C4.5 14.92 7.58 18 12 18ZM12 20C6.48 20 2 15.52 2 10C2 4.48 6.48 0 12 0C17.52 0 22 4.48 22 10C22 15.52 17.52 20 12 20Z" />
							</svg>
							<p className="ml-2 text-gray-600 dark:text-gray-400">{location}</p>
						</div>
					</div>
				</div>
			</div>
		</Link>
	);
}
