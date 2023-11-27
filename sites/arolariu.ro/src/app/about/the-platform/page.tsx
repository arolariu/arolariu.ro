import {Metadata} from "next";

export const metadata: Metadata = {
	title: "The Platform",
	description: "Learn more about the platform.",
};

export default async function PlatformPage() {
	return (
		<main>
			<section>
				<h1 className="my-8 text-3xl font-bold text-center">
					How <code>arolariu.ro</code> is built?
				</h1>
				<article>
					The <code>arolariu.ro</code> platform is built using the latest and most stable iteration of front-end
					technologies and techniques. <br /> <br />
					The platform is built using the <code>Next.JS</code> framework, which is a React framework that allows for
					server-side rendering and static site generation. The framework also employs React&apos;s <code>SSR</code> and{" "}
					<code>CSR</code> techniques to provide the best possible experience for the end-user.
					<br />
					<br />
					The platform is hosted on Microsoft&apos;s Azure cloud infrastructure, more precisely leveraging the App
					Service resource. The platform is able to scale horizontally to up to 10 instances.
					<br />
					<br />
					The API service that powers the platform and the adjacent services hosted under the <code>
						*.arolariu.ro
					</code>{" "}
					domain umbrella is built using the latest iteration of .NET 8. The API can be accessed on{" "}
					<a href="https://api.arolariu.ro" target="_blank" rel="noopener">
						<code>api.arolariu.ro</code>
					</a>
					.
				</article>
			</section>

			<section className="my-16">
				<h2 className="mb-4 text-3xl font-bold">Technology overview</h2>
				<article>
					<table className="table table-auto table-pin-cols 2xsm:table-xs md:table-lg">
						<caption className="caption-bottom">Technologies used to build this platform.</caption>
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
				</article>
			</section>

			<section className="my-16">
				<h2 className="mb-4 text-3xl font-bold">Frequently asked questions</h2>
				<article className="flex flex-wrap items-center justify-center gap-16 mt-8 2xsm:flex-col lg:flex-row justify-items-center">
					<div className="p-2 border-2 border-white lg:w-1/3 rounded-xl">
						<p className="mb-4 text-xl font-medium text-center">
							Lorem ipsum dolor, sit amet consectetur adipisicing elit. Eum, error?
						</p>
						<p className="text-gray-200">
							Lorem ipsum dolor sit, amet consectetur adipisicing elit. Voluptatibus dolorem non cum exercitationem
							molestias laborum voluptatem laudantium magni quod aliquam! Eius commodi odio assumenda quasi aliquam
							nostrum ea ad quia?
						</p>
					</div>
					<div className="p-2 border-2 border-white lg:w-1/3 rounded-xl">
						<p className="mb-4 text-xl font-medium text-center">Lorem ipsum dolor sit amet consectetur adipisicing?</p>
						<p className="text-gray-200">
							Lorem ipsum, dolor sit amet consectetur adipisicing elit. Consectetur, natus similique saepe nemo debitis
							dicta non. In illo quod nihil corrupti iste amet voluptatem cum accusantium aliquam, molestias beatae,
							facere consequuntur quaerat. Quod natus, harum consequuntur sunt recusandae nam maiores!
						</p>
					</div>
				</article>
			</section>

			<section className="my-16"></section>
		</main>
	);
}
