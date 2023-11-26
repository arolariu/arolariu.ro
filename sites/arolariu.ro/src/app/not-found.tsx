import {Metadata} from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "arolariu.ro | 404",
	description: "Page not found.",
};

export default async function NotFound() {
	return (
		<div className="container flex flex-col mx-auto my-4">
			<h1 className="mx-auto text-3xl font-black">404 - Page was not found.</h1>
			<section className="mx-auto my-4">
				<center>It seems that the page that you&apos;ve landed on is not present on the website.</center>
				<hr />
				<div>
					<h2 className="my-4 text-xl font-bold text-center">Additional information:</h2>
					<code className="container flex items-center justify-center mb-4 text-center">
						User is
						<br />
						Username: {"Unknown username"}
					</code>
					<center className="items-center justify-center block mx-8 text-center border-2 border-dotted">
						TODO: Add base64 representation here.
					</center>
					<small>
						If you think that this page should exist and you&apos;re facing an error, please report this to the site
						administrator.
					</small>
					<div className="container flex flex-row mt-4">
						<Link href="https://arolariu.ro/" className="mx-auto btn btn-primary">
							Go back to the home page.
						</Link>
						<Link href="" className="mx-auto btn btn-secondary">
							Submit false error.
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}
