import FeaturesList from "@/components/home/FeaturesList";
import Hero from "@/components/home/Hero";

export default async function Home() {
	return (
		<main>
			<section className="py-12 bg-black sm:pb-16 lg:pb-20 xl:pb-24">
				<Hero />
			</section>

			<section className="text-white bg-black">
				<FeaturesList />
			</section>
		</main>
	);
}
