import {ReactNode} from "react";

interface Props {
	title: string;
	description: string;
	children: ReactNode;
}
export default function Competence({title, description, children}: Readonly<Props>) {
	return (
		<div className="flex flex-col items-center pb-10 mx-auto my-10 border-b border-gray-700 dark:border-gray-200 max-w-7xl sm:flex-row">
			<div className="inline-flex items-center justify-center flex-shrink-0 w-20 h-20 text-white bg-black rounded-full dark:bg-white dark:text-black sm:mr-10">
				{children}
			</div>
			<div className="mt-6 text-center sm:mt-0 sm:text-left">
				<h2 className="text-2xl">{title}</h2>
				<p className="mt-4">{description}</p>
			</div>
		</div>
	);
}
