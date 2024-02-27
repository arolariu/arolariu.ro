import Competence from "@/components/about/the-author/Competence";
import ContactForm from "@/components/about/the-author/ContactForm";
import {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import { FaUserCheck, FaRegSun } from "react-icons/fa";
import { GrTest, GrResources } from "react-icons/gr";
import { SiThealgorithms } from "react-icons/si";
import { SlLoop } from "react-icons/sl";

export const metadata: Metadata = {
	title: "About the author",
	description: "Learn more about Alexandru-Razvan Olariu, the author of this platform.",
};

export default async function AuthorPage() {
	return (
		<main>
			<section className="2xsm:py-12 lg:py-24">
				<h1 className="font-semibold text-center text-7xl">Meet the author.</h1>
				<div className="flex justify-center mx-auto mt-6">
					<span className="inline-block h-2 bg-blue-500 rounded-full w-60"></span>
					<span className="inline-block w-6 h-2 mx-1 bg-blue-500 rounded-full"></span>
					<span className="inline-block w-3 h-2 bg-blue-500 rounded-full"></span>
				</div>
			</section> {/* Title */}

			<section>
				<article className="text-2xl 2xsm:ml-2 md:ml-0">
					Alexandru-Razvan Olariu is the sole author of the platform that you are on currently.
					<br /> <br />
					Alexandru is a {new Date().getFullYear() - 2000} years old software engineer and solution architect. He
					currently works at Microsoft as a software enginneer in the E+D organization, building complex solutions for
					the Sovereign Clouds line of business. <br /> <br />
					Alexandru was born on the 8th of January, year 2000, to Alexandra and Razvan, in a small city called `Curtea
					de Arges` in Romania. He got his first computer when he was just 5 years old - a Pentium 4 with 512 MB of RAM
					and 10 GB of storage, running Windows 98. He learnt most of his computer skills by playing video games and
					tinkering with his personal computer. He also learnt a good amount of English and was able to fluently read,
					write and speak in English by the age of 7. <br /> <br />
					Alexandru is a video game enthusiast. He used to be a &quot;professional&quot; player, ranking at #70 in
					Romania for the video game called `DotA2`. He enjoys playing long-lasting games that have a focus on
					strategies and a medieval setting: like Age of Empires, Age of Mythology, etc. He also enjoys playing games
					such as Red Alert, StarCraft, and other RTS games. <br /> <br />
					Alexandru enjoys reading technical books and tinkering with new technologies. He has built this platform as a
					`test-bench` for new technologies and as a way to learn new things. He is also a big fan of the `open-source`
					movement and has contributed to Microsoft&apos;s OSS repositories{" "}
					<em>(such as dotnet/efcore and dotnet/docs)</em>. <br /> <br />
					Alexandru is open for collaboration in projects that involve Internet of Things, Software Engineering and Network Engineering fields. <br /> If you
					are interested in working with Alexandru and you wonder what he is capable of, please visit the
					`cv.arolariu.ro` website to see his CV. <br /> <br />
					To reach out to him, scroll down to the contact form or connect with him via the information provided on the <Link href="https://cv.arolariu.ro" className="text-blue-500">cv.arolariu.ro</Link> website.{" "}
					<br /> <br />
				</article>
			</section> {/* About the author */}

			<section className="my-16">
				<h1 className="text-center 2xsm:text-3xl md:text-5xl">Alexandru&apos;s competences</h1>
				<div className="flex flex-row flex-wrap px-5 py-8 mx-auto">
			<Competence
				title="Algorithmic skills."
				description="Alexandru has completed all Hacker Rank, Hacker Earth and Leet Code challenges published until 2023. He
								has a strong algorithmic thinking and is able to construct complex algorithms with ease.">
				<SiThealgorithms className="h-7 w-7" />
			</Competence>
			<Competence
				title="Test-Driven Development (TDD)"
				description="Alexandru is a firm believer of test-driven development. He constantly applies this approach to his
								projects and he is always trying to improve his testing skills. He is also a big fan of the
								`red-green-refactor` approach.">
				<GrTest className="h-7 w-7" />
			</Competence>
			<Competence
				title="Domain-Driven Design (DDD)"
				description="Alexandru follows domain-driven design principles strongly. He is able to combine DDD with TDD to create
								complex solutions that are easy to maintain and extend. He is also a big fan of the `onion architecture`
								and `clean architecture` approaches.">
				<GrResources className="h-7 w-7" />
			</Competence>
			<Competence
				title="Agile Methodologies."
				description="Alexandru has learnt about agile working and agile methodologies since he was a student in his BSc.
								degree. He follows the agile manifesto and is a big fan of the Kanban technique of planning.">
				<SlLoop className="h-7 w-7" />
			</Competence>
			<Competence
				title="Customer Centric."
				description="Alexandru has been working with customers for two full years in his tenure at Microsoft. He has gained a lot
					of knowledge and is able to put himself in the shoes of the customer. He is able to understand the
					customer's needs and to deliver solutions that are tailored to their needs.">
				<FaUserCheck className="h-7 w-7" />
			</Competence>
			<Competence
				title="Engineering Excellence."
				description="Alexandru is passionate about delivering the best solutions for the problem and for the customer. He is
								always striving to deliver the best software and to follow consacrated engineering excellence practices.">
				<FaRegSun className="h-7 w-7" />
			</Competence>
		</div>
			</section> {/* Competences list */}

			<section className="flex flex-row flex-wrap items-center justify-center my-16 justify-items-center">
				<div className="prose text-left prose-blue 2xsm:text-center md:text-left">
					<h1 className="mb-16 font-semibold text-black dark:text-white">Connect with Alexandru</h1>
					<div className="text-2xl">
						<p>
							E-mail address: <a href="mailto:olariu.alexandru@pm.me">olariu.alexandru@pm.me</a>
						</p>
						<p>
							LinkedIn: <code>/olariu-alexandru</code>
						</p>
						<p>
							GitHub: <code>/arolariu</code>
						</p>
					</div>
				</div>
				<Image
					src="/images/about/the-author/work-together.svg"
					alt="Work Together SVG"
					width={"600"}
					height={"600"}
					className="ml-[10%] object-cover 2xsm:hidden xl:block"
				/>
			</section> {/* Connect information */}

			<section className="my-16">
				<h1 className="text-5xl text-center">Contact Alexandru</h1>
				<p className="mx-auto mt-6 text-2xl leading-relaxed text-center lg:w-2/3">
					If you do not want to expose yourself or talk anonymously with Alexandru, you can use this contact form. You
					will need to provide a mean of contact so that Alexandru can reach out to you.
				</p>
				<ContactForm />
			</section> {/* Contact form */}
		</main>
	);
}
