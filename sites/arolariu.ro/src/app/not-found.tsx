/** @format */

"use client";

import animationData from "@/assets/404Lottie.json";
import {Player} from "@lottiefiles/react-lottie-player";
import {SessionProvider, useSession} from "next-auth/react";
import Link from "next/link";
import {useParams, usePathname} from "next/navigation";
import {useState} from "react";

const NotFoundDynamicComponent = () => {
	const [errorSubmitted, setErrorSubmitted] = useState<boolean>(false);
	const params = useParams();
	const pathname = usePathname();
	const {status, data: session} = useSession();

	const handleSubmitError = () => {
		console.log("Submitting error to the server.");
		setErrorSubmitted(true);
	};

	return (
		<div>
			<h2 className="my-4 text-center text-xl font-bold">Additional information:</h2>
			<code className="container mb-4 flex items-center justify-center text-center">
				User is
				{status === "authenticated" ? " authenticated with a valid JWT." : " not authenticated."}
				<br />
				Username: {session?.user?.name ?? "Unknown username"}
				<br />
				Requested path: {pathname}
				<br />
				Path parameters: {JSON.stringify(params, null, 2)}
			</code>
			<center className="mx-8 block items-center justify-center border-2 border-dotted text-center">
				TODO: Add base64 representation here.
			</center>
			<small>
				If you think that this page should exist and you&apos;re facing an error, please report this
				to the site administrator.
			</small>
			<div className="container mt-4 flex flex-row">
				<Link href="https://arolariu.ro/" className="btn btn-primary mx-auto">
					Go back to the home page.
				</Link>
				<Link href="" className="btn btn-secondary mx-auto" onClick={handleSubmitError}>
					Submit false error.
				</Link>
			</div>
			{errorSubmitted && (
				<div className="alert alert-info my-6">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						className="h-6 w-6 shrink-0 animate-pulse stroke-current">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
					<span>
						<strong>The error was submitted.</strong>
						<br /> Please head back to the previously-working page.
					</span>
				</div>
			)}
		</div>
	);
};

export default function Default404Page() {
	return (
		<div className="container mx-auto my-4 flex flex-col">
			<Player
				autoplay
				loop
				src={animationData}
				speed={0.4}
				className="container mx-auto flex w-[45%]"
			/>
			<h1 className="mx-auto text-3xl font-black">404 - Page was not found.</h1>
			<section className="mx-auto my-4">
				<center>
					It seems that the page that you&apos;ve landed on is not present on the website.
				</center>
				<hr />
				<SessionProvider>
					<NotFoundDynamicComponent />
				</SessionProvider>
			</section>
		</div>
	);
}
