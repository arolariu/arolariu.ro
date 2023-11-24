import Accordion from "@/components/general/Accordion";
import AccordionItem from "@/components/general/AccordionItem";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "The Platform",
	description: "Learn more about the platform.",
};

export default async function PlatformPage() {
	return (
		<main>
			<section>
				<article>
					<h1>
						How <code>arolariu.ro</code> is built?
					</h1>
					<p>
						The main front-facing platform is built using the latest stable iteration of Next.JS (version 14 at the
						moment).
					</p>
					<p>Here is a table with all the technologies used on the platform:</p>
					<table>
						<thead>
							<tr>
								<th>Technology</th>
								<th>Version</th>
								<th>Usage</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Next.JS</td>
								<td>14.0.3</td>
								<td>Front-end framework</td>
							</tr>
							<tr>
								<td>React</td>
								<td>18.2.0</td>
								<td>Front-end library</td>
							</tr>
							<tr>
								<td>TailwindCSS</td>
								<td>3.3.0</td>
								<td>CSS library</td>
							</tr>
						</tbody>
					</table>
					<p>The project also uses the following third party packages:</p>
					<ul>
						<li>DaisyUI - UI toolkit based on TailwindCSS.</li>
						<li>Clerk - auth framework that supports the OAuth 2.0 protocol.</li>
						<li>Zustand - state management library based on client-side hooks.</li>
						<li>jose - JWT/E/K management library, for guest accounts.</li>
					</ul>

					<p>The platform was built from scratch, taking inspiration from sites such as:</p>
					<ol>
						<li>tailblocks.cc</li>
						<li>hyperUI.dev</li>
						<li>kitwind.io</li>
					</ol>
				</article>

				<article>
					<h1>
						How <code>api.arolariu.ro</code> is built?
					</h1>
					<p>The API service is built using the latest stable iteration of .NET (currently version 8). </p>
					<p>Here is a table with all the technologies used on the platform:</p>
					<table>
						<thead>
							<tr>
								<th>Technology</th>
								<th>Version</th>
								<th>Usage</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>ASP.NET</td>
								<td>8.0.0</td>
								<td>Web framework</td>
							</tr>
							<tr>
								<td>Entity Framework Core</td>
								<td>8.0.0</td>
								<td>ORM</td>
							</tr>
							<tr>
								<td>MS SQL Server</td>
								<td>13.0.0</td>
								<td>Database service</td>
							</tr>
							<tr>
								<td>Redis</td>
								<td>6.0.0</td>
								<td>Cache service</td>
							</tr>
							<tr>
								<td>Azure CosmosDB</td>
								<td>13.0.0</td>
								<td>Database service</td>
							</tr>
							<tr>
								<td>Azure Storage</td>
								<td>13.0.0</td>
								<td>Storage service</td>
							</tr>
						</tbody>
					</table>
				</article>

				<article>
					<h1>
						How <code>cv.arolariu.ro</code> is built?
					</h1>
					<p>
						The platform represents an interactive, online CV format that encompasses the authors&apos; competences.
					</p>
					<p>Here is a table with all the technologies used on the platform:</p>
					<table>
						<thead>
							<tr>
								<th>Technology</th>
								<th>Version</th>
								<th>Usage</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>SvelteKit</td>
								<td>5.0.0</td>
								<td>Front-end framework</td>
							</tr>
							<tr>
								<td>SvelteJS</td>
								<td>5.0.0</td>
								<td>Front-end library</td>
							</tr>
							<tr>
								<td>TailwindCSS</td>
								<td>3.3.0</td>
								<td>CSS library</td>
							</tr>
						</tbody>
					</table>
				</article>

				<article>
					<h1>
						How <code>obs.arolariu.ro</code> is built?
					</h1>
					<p>The platform represents a unified pane of glass targeted for observability.</p>
					<p>
						The three pillars of observability (3PO): metrics, logs, traces are all incorporated onto this platform.
					</p>
					<p>The platform leverages Grafana dashboards, Prometehus clusters and Jaeger Tracing capabilities.</p>
				</article>
			</section>

			<section>
				<Accordion>
					<AccordionItem
						title="arolariu.ro"
						description="This is the main website of Alexandru-Razvan Olariu. It is built using Next.js and TailwindCSS. It is hosted on Vercel."
					/>
					<AccordionItem
						title="arolariu.ro"
						description="This is the main website of Alexandru-Razvan Olariu. It is built using Next.js and TailwindCSS. It is hosted on Vercel."
					/>
					<AccordionItem
						title="arolariu.ro"
						description="This is the main website of Alexandru-Razvan Olariu. It is built using Next.js and TailwindCSS. It is hosted on Vercel."
					/>
					<AccordionItem
						title="arolariu.ro"
						description="This is the main website of Alexandru-Razvan Olariu. It is built using Next.js and TailwindCSS. It is hosted on Vercel."
					/>
				</Accordion>
			</section>
		</main>
	);
}
