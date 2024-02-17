import EventCard from "@/components/Cards/EventCard";

export default async function EventsPage() {
	return (
		<main className="m-20">
			<section>
				<h1 className="my-8 font-bold text-center 2xsm:text-2xl xsm:text-3xl md:text-4xl">Upcoming events</h1>
				<div className="flex justify-center mx-auto my-12">
					<span className="inline-block h-2 bg-blue-500 rounded-full w-60"></span>
					<span className="inline-block w-6 h-2 mx-1 bg-blue-500 rounded-full"></span>
					<span className="inline-block w-3 h-2 bg-blue-500 rounded-full"></span>
				</div>
				<p className="2xsm:hidden md:block md:text-center">
					This section contains the upcoming events that will be hosted by <code>arolariu.ro</code>.<br />
					The events are designed to be fun, accessible, interesting and valuable.
				</p>
			</section>

			<section className="flex flex-wrap 2xsm:gap-4 md:gap-8 md:p-4 lg:flex-nowrap">
				<EventCard
					title="System Design 101 - L100"
					description="Learn the basics of system design and how to approach any architecture interview with no stress."
					date="2024-03-01"
					location="Online"
					imagePath="https://dummyimage.com/720x400&text=System+Design+101+%2D+L100"
					formLink="https://forms.office.com/r/m1KGUNs5A8"
				/>
				<EventCard
					title="System Design 101 - L200"
					description="Learn the basics of system design and how to approach any architecture interview with no stress."
					date="2024-05-01"
					location="Online"
					imagePath="https://dummyimage.com/720x400&text=System+Design+101+%2D+L200"
					formLink="https://forms.office.com/r/m1KGUNs5A8"
				/>
				<EventCard
					title="System Design 101 - L200"
					description="Learn the basics of system design and how to approach any architecture interview with no stress."
					date="2024-06-01"
					location="Online"
					imagePath="https://dummyimage.com/720x400&text=System+Design+101+%2D+L300"
					formLink="https://forms.office.com/r/m1KGUNs5A8"
				/>
			</section>

			<section>
				<h1 className="my-8 font-bold text-center 2xsm:text-2xl xsm:text-3xl md:text-4xl">Archive</h1>
				<div className="flex justify-center mx-auto my-12">
					<span className="inline-block h-2 bg-blue-500 rounded-full w-60"></span>
					<span className="inline-block w-6 h-2 mx-1 bg-blue-500 rounded-full"></span>
					<span className="inline-block w-3 h-2 bg-blue-500 rounded-full"></span>
				</div>
			</section>

			{/** TODO: fix the lg:w-1/3 CSS when more events will pop-up. */}
			<section className="flex flex-wrap 2xsm:gap-4 md:gap-8 md:p-4 lg:w-1/3 lg:flex-nowrap">
				<EventCard
					title="Learn how to program in C/C++11"
					description="
				This event is designed for beginners who want to learn how to program in C/C++11. The event will cover the basics of programming in C/C++11, and it will also cover some advanced topics such as pointers, memory management, and more."
					date="2020-08-01"
					location="Online"
					imagePath="https://dummyimage.com/720x400&text=Learning+C%2FC%2B%2B11"
					formLink="https://forms.gle/45kMjeTqbbqdDaE68"
				/>
			</section>
		</main>
	);
}
