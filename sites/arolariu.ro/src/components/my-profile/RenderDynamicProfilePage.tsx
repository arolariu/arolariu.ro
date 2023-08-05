/** @format */

"use client";
import { useState } from "react";
import { Session } from "next-auth";
import RenderProfileMenuScreen from "./RenderProfileMenuScreen";
import RenderProfileMenuContent from "./RenderProfileMenuContent";

interface Props {
	session: Session;
}

export default function RenderDynamicProfilePage({ session }: Props) {
	const [currentTab, setCurrentTab] = useState(1);

	return (
		// TODO: this should be responsive in the future.
		<section className="container grid grid-cols-5">
			<RenderProfileMenuScreen
				session={session}
				currentTab={currentTab}
				setCurrentTab={setCurrentTab}
			/>
			<RenderProfileMenuContent session={session} currentStep={currentTab} />
		</section>
	);
}
