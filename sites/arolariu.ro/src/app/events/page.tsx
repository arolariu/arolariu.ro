import EventCard from "@/components/Cards/EventCard";

export default async function EventsPage() {
    return (
        <main className="m-20">
            <section> {/* Title */}
				<h1 className="my-8 font-bold text-center 2xsm:text-2xl xsm:text-3xl md:text-4xl">
					Upcoming events
				</h1>
				<div className="flex justify-center mx-auto my-12">
					<span className="inline-block h-2 bg-blue-500 rounded-full w-60"></span>
					<span className="inline-block w-6 h-2 mx-1 bg-blue-500 rounded-full"></span>
					<span className="inline-block w-3 h-2 bg-blue-500 rounded-full"></span>
				</div>
            </section>

            <section>
                <EventCard title="System Design 101" description="Learn the basics of system design and how to approach any architecture interview with no stress." date="2024-03-01" location="Online" imagePath="https://dummyimage.com/720x400&text=System+Design+101" formLink="https://google.com" />
            </section>

            <section> {/* Title */}
				<h1 className="my-8 font-bold text-center 2xsm:text-2xl xsm:text-3xl md:text-4xl">
					Archive
				</h1>
				<div className="flex justify-center mx-auto my-12">
					<span className="inline-block h-2 bg-blue-500 rounded-full w-60"></span>
					<span className="inline-block w-6 h-2 mx-1 bg-blue-500 rounded-full"></span>
					<span className="inline-block w-3 h-2 bg-blue-500 rounded-full"></span>
				</div>
			</section>
        </main>
    )
}
