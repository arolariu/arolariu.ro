/** @format */

"use client";

import Image from "next/image";
import RenderProfileMenu from "./RenderProfileMenu";
import { Session } from "next-auth";

interface Props {
	session: Session;
	currentTab: number;
	// eslint-disable-next-line no-unused-vars
	setCurrentTab: (_: number) => void;
}

export default function RenderProfileMenuScreen({
	session,
	currentTab,
	setCurrentTab,
}: Props) {
	return (
		<div className="col-span-1 flex h-screen flex-col justify-between border-e">
			<RenderProfileMenu
				currentTab={currentTab}
				setCurrentTab={setCurrentTab}
			/>

			<div className="sticky inset-x-0 bottom-0 border-t border-gray-100">
				<a href="#" className="flex items-center gap-2 p-4 hover:bg-gray-50">
					<Image
						alt="Picture of "
						src={session.user?.image ?? "https://dummyimage.com/100x100&text=?"}
						className="h-10 w-10 rounded-full object-cover"
						width={100}
						height={100}
					/>

					<div>
						<p className="text-xs">
							<strong className="block font-medium">
								{session.user?.name ?? "Unknown user."}
							</strong>
							<span>{session.user?.email ?? "Unknown address."}</span>
						</p>
					</div>
				</a>
			</div>
		</div>
	);
}
