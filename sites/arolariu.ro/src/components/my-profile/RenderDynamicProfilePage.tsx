/** @format */

"use client";
import useWindowSize from "@/hooks/useWindowSize";
import {Session} from "next-auth";
import {useState} from "react";
import RenderProfileMenuContent from "./RenderProfileMenuContent";
import RenderProfileMenuScreen from "./RenderProfileMenuScreen";

interface Props {
	session: Session;
}

export default function RenderDynamicProfilePage({session}: Props) {
	const [currentTab, setCurrentTab] = useState(1);
	const {windowSize} = useWindowSize();

	// TODO: create overlay for small screen;
	// TODO: populate overlays with options;

	if (windowSize.width! > 1280 /* We have a big screen, overlay for big screen */) {
		return (
			<section className="container grid grid-cols-5">
				<RenderProfileMenuScreen
					session={session}
					currentTab={currentTab}
					setCurrentTab={setCurrentTab}
				/>
				<RenderProfileMenuContent session={session} currentStep={currentTab} />
			</section>
		);
	} else if (windowSize.width! < 1280 /* We have a small screen, overlay for small screen  */) {
		return (
			<section>
				<h1 className="mx-auto text-3xl font-black"> Hello world!</h1>
			</section>
		);
	}
}
