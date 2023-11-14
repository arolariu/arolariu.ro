import StatisticsDSSComponent from "@/components/statistics/StatisticsDSSComponent";
import StatisticsHeroComponent from "@/components/statistics/StatisticsHeroComponent";
import StatisticImpactComponent from "@/components/statistics/StatisticsImpactComponent";

export default async function RenderStatisticsPage() {
	return (
		<section>
			<StatisticsHeroComponent />
			<StatisticImpactComponent />
			<div className="h-16" />
			<StatisticsDSSComponent />
			<StatisticsDSSComponent />
		</section>
	);
}
