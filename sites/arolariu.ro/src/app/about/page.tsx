import {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
	title: "About Us",
	description: "Learn more about the author and the platform.",
};

export default async function AboutPage() {
	return (
		<main className="text-gray-600 dark:text-slate-300">
			<section>
				<div className="container px-5 pt-24 mx-auto">
					<div className="flex flex-col w-full mb-20 text-center">
						<h1 className="mb-4 text-transparent bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text sm:text-3xl ">
							About Us
						</h1>
						<p>
							The <code>arolariu.ro</code> story began in 2022, when the author - Alexandru-Razvan Olariu, wanted to
							understand how websites work.
						</p>
						<p>
							The whole platform and underlying integrations have been developed solely by the author, from what he has
							learnt along the years.
						</p>
						<br />
						<p>
							Alexandru currently works as a software engineer at Microsoft. To learn more about him, check the right
							section of this page.
						</p>
						<p>
							The platform is built using the latest state-of-the-art technologies. To learn more about it, check the
							left section of this page.
						</p>
					</div>
				</div>
			</section>
			<section className="flex flex-row flex-wrap items-center justify-center pb-16 mb-16 text-center justify-items-center">
				<div className="p-8">
					<div className="rounded-lg">
						<Image
							alt="content"
							className="object-cover object-center mx-auto"
							width={650}
							height={500}
							src="/images/about/platform-thumbnail.svg"
						/>
					</div>
					<h2 className="mt-6 mb-3 text-2xl font-medium text-white title-font">
						What is <code>arolariu.ro</code>?
					</h2>
					<p className="text-base leading-relaxed">
						The <code>arolariu.ro</code> platform is a collection of applications that are hosted under the{" "}
						<code>arolariu.ro</code> umbrella. <br /> The platform was built with the purpose of providing a unified
						experience for all of the applications and OSS projects that the author <em>(Alexandru-Razvan Olariu)</em>{" "}
						is working on. <br />
						<br />
						To learn more about the technologies that are used in the process and how they interact with each other,
						click the button below or navigate to <code>&quot;/about/the-platform&quot;</code>
					</p>
					<Link href="/about/the-platform">
						<button className="flex px-5 py-2 mx-auto mt-6 text-white bg-indigo-500 border-0 rounded hover:bg-indigo-600 focus:outline-none">
							Learn more about the platform...
						</button>
					</Link>
				</div>
				<div className="p-8">
					<div className="rounded-lg">
						<Image
							alt="content"
							className="object-cover object-center mx-auto"
							width={300}
							height={500}
							src="/images/about/author-thumbnail.svg"
						/>
					</div>
					<h2 className="mt-6 mb-3 text-2xl font-medium text-white title-font">
						Who is <code>arolariu</code>?
					</h2>
					<p className="text-base leading-relaxed">
						<code>arolariu</code> is the alias/nickname of the author: Alexandru-Razvan Olariu. <br /> Alexandru is a
						well-tenured software engineer, solution architect and lifelong learner. <br />
						<br />
						To learn more about Alexandru, click the button below or navigate to{" "}
						<code>&quot;/about/the-author&quot;</code>
					</p>
					<Link href="/about/the-author">
						<button className="flex px-5 py-2 mx-auto mt-6 text-white bg-indigo-500 border-0 rounded hover:bg-indigo-600 focus:outline-none">
							Learn more about the author...
						</button>
					</Link>
				</div>
			</section>
		</main>
	);
}
