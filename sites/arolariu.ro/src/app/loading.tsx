/** @format */

"use client";

import { Player } from "@lottiefiles/react-lottie-player";
import loadingScreen from "@/assets/loadingLottie.json";

export default function Loading() {
	return <Player loop autoplay src={loadingScreen} speed={1.5} />;
}
