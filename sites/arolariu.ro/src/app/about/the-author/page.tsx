import Image from "next/image";
import Link from "next/link";
import {FaGithub, FaLinkedin} from "react-icons/fa";
import CompetenceList from "./_components/CompetenceList";
import ContactForm from "./_components/ContactForm";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "About the author",
	description: "Learn more about Alexandru-Razvan Olariu, the author of this platform.",
};

export default async function AuthorPage() {
	return (
		<main className="bg-black">
			<section className="pt-24">
				<div className="h-[32rem]">
					<div className="container px-6 py-10 mx-auto">
						<h1 className="font-semibold text-center text-white lg:text-7xl">Meet the author.</h1>

						<div className="flex justify-center mx-auto mt-6">
							<span className="inline-block h-2 bg-blue-500 rounded-full w-60"></span>
							<span className="inline-block w-6 h-2 mx-1 bg-blue-500 rounded-full"></span>
							<span className="inline-block w-3 h-2 bg-blue-500 rounded-full"></span>
						</div>
					</div>
				</div>
			</section>

			<section className="container grid grid-cols-3 grid-rows-3 mx-auto -mt-24">
				<article className="col-span-2 row-span-3 text-2xl">
					Alexandru-Razvan Olariu <em>(pictured on the right side)</em> is the sole author of the platform that you are
					on.
					<br /> <br />
					Alexandru is a {new Date().getFullYear() - 2000} years old software engineer and solution architect. He
					currently works at Microsoft as a software enginneer in the E+D organization, building complex solutions for
					the Sovereign Clouds line of business. <br /> <br />
					Alexandru was born on the 8th of January, year 2000, to Alexandra and Razvan, in a small city called `Curtea
					de Arges` in Romania. He got his first computer when he was just 5 years old - a Pentium 4 with 512 MB of RAM
					and 10 GB of storage, running Windows 98. He learnt most of his computer skills by playing video games and
					tinkering with his personal computer. He also learnt a good amount of English and was able to fluently read,
					write and speak in English by the age of 7. <br /> <br />
					Alexandru was a talented student in school, always striving to be the best in his class. He was taught by his
					mother to always be the best at what he does, and to never settle for less. He was also taught by his father
					to always be respectful and to be humble. <br /> <br />
					Alexandru is a video game enthusiast. He used to be a &quot;professional&quot; player, ranking at #70 in
					Romania for the video game called `DotA2`. He enjoys playing long-lasting games that have a focus on
					strategies and a medieval setting: like Age of Empires, Age of Mythology, etc. He also enjoys playing games
					such as Red Alert, StarCraft, and other RTS games. <br /> <br />
					Alexandru enjoys reading technical books and tinkering with new technologies. He has built this platform as a
					`test-bench` for new technologies and as a way to learn new things. He is also a big fan of the `open-source`
					movement and has contributed to Microsoft&apos;s OSS repositories{" "}
					<em>(such as dotnet/efcore and dotnet/docs)</em>. <br /> <br />
					Alexandru is open for collaboration in projects that involve IoT and Network Engineering fields. <br /> If you
					are interested in working with Alexandru and you wonder what he is capable of, please visit the
					`cv.arolariu.ro` website to see his CV. <br /> <br />
					To reach out to him, scroll down to the contact form or connect with him via the `cv.arolariu.ro` website.{" "}
					<br /> <br />
				</article>
				<div className="col-span-1 row-span-3">
					<div className="flex flex-col items-center p-4 dark:border-gray-700">
						<Image
							className="object-cover w-full aspect-square rounded-xl"
							src="/images/about/the-author/author.jpeg"
							width={640}
							height={640}
							quality={100}
							alt="Picture of the platform author, Alexandru-Razvan Olariu."
						/>

						<h1 className="mt-4 text-2xl font-semibold">Alexandru-Razvan Olariu</h1>

						<p className="mt-2 text-gray-500 capitalize dark:text-gray-300">Software Engineer. Solution architect.</p>

						<div className="flex gap-4 mt-3 -mx-2">
							<Link href="https://github.com/arolariu">
								<FaGithub className="h-7 w-7" />
							</Link>
							<Link href="https://linkedin.com/in/olariu-alexandru">
								<FaLinkedin className="h-7 w-7" />
							</Link>
						</div>
					</div>
				</div>
			</section>

			<section className="container flex flex-col mt-16">
				<div className="prose prose-blue ml-[10%] text-left">
					<h1>Alexandru&apos;s competences:</h1>
				</div>
				<CompetenceList />
			</section>

			<section className="container my-16 mb-[10%] flex flex-row">
				<div className="prose prose-blue ml-[10%] text-left">
					<h1 className="mb-16 font-semibold">Connect with Alexandru:</h1>
					<p className="text-2xl">
						E-mail address: <a href="mailto:olariu.alexandru@pm.me">olariu.alexandru@pm.me</a>
					</p>
					<p className="text-2xl">
						LinkedIn: <code>/olariu-alexandru</code>
					</p>
					<p className="text-2xl">
						GitHub: <code>/arolariu</code>
					</p>
				</div>
				<Image
					src="/images/about/the-author/work-together.svg"
					alt="Work Together SVG"
					width={"600"}
					height={"600"}
					className="ml-auto mr-[10%] object-cover"
				/>
			</section>

			<section className="relative">
				<div className="container px-5 py-24 mx-auto">
					<div className="flex flex-col w-full mb-12 text-center">
						<h1 className="mb-4 text-5xl font-medium">Contact Alexandru</h1>
						<p className="mx-auto text-2xl leading-relaxed lg:w-2/3">
							If you do not want to expose yourself or talk anonymously with Alexandru, you can use this contact form.
							You will need to provide a mean of contact so that Alexandru can reach out to you.
						</p>
					</div>
					<ContactForm />
				</div>
			</section>
		</main>
	);
}
