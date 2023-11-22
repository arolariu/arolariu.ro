import {FaRegSun, FaUserCheck} from "react-icons/fa";
import {GrResources, GrTest} from "react-icons/gr";
import {SiThealgorithms} from "react-icons/si";
import {SlLoop} from "react-icons/sl";
import Competence from "./Competence";

export default function CompetenceList() {
	return (
		<div className="container flex flex-row ml-[5%]">
			<div className="flex flex-col items-center px-5 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
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
			</div>
			<div className="flex flex-col items-center px-5 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
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
		</div>
	);
}
