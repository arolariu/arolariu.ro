import { author } from './author';
import { testimonials } from './testimonials';

export const jsonCVData = {
	$schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
	meta: {
		version: 'v2.1.0',
		canonical: 'https://cv.arolariu.ro',
		lastModified: new Date().toISOString(),
		theme: 'professional',
		format: 'JSONResume',
		schemaVersion: '1.0.0',
		validationStatus: 'valid'
	},
	basics: {
		name: author.name,
		label: author.title,
		image: 'https://cv.arolariu.ro/avatar.jpg',
		email: author.email,
		url: author.website,
		summary:
			'Ambitious, respectful and hard working software engineer that wants to share his knowledge and help become a business force multiplier. Currently working at Microsoft as a software engineer in the E+D MSAI FAST organization, building solutions that are used by millions of users worldwide.',
		location: {
			address: '',
			postalCode: '',
			city: 'Bucharest',
			countryCode: 'RO',
			region: 'Romania / European Union'
		},
		profiles: [
			{
				network: 'LinkedIn',
				username: 'olariu-alexandru',
				url: 'https://www.linkedin.com/in/olariu-alexandru/'
			},
			{
				network: 'GitHub',
				username: 'arolariu',
				url: 'https://www.github.com/arolariu'
			},
			{
				network: 'Website',
				username: 'arolariu',
				url: 'https://arolariu.ro'
			}
		]
	},
	work: [
		{
			name: 'Microsoft',
			position: 'E + D Sovereign Clouds Software Engineer II',
			url: 'https://microsoft.com',
			startDate: '2023-03',
			endDate: null,
			summary:
				'Leading observability, documentation and CLI tooling initiatives for sovereign cloud environments.',
			highlights: [
				'Orchestrated and implemented the three pillars of observability (3PO) in microservices architecture using Open Telemetry standards',
				'Built automated monitoring and alerting triggers based on p95/p99 statistics for real-time and synthetic traffic',
				'Contributed to development of in-house .NET library implementing ODataV4 data consumption protocol for NoSQL databases',
				'Led documentation & product adoption initiatives using static site generators and API consumption layers',
				'Currently shadowing and attending hiring interviews for SWE II and Senior SWE positions'
			],
			location: 'EMEA (Remote)',
			keywords: [
				'.NET',
				'Azure',
				'Microservices',
				'OpenTelemetry',
				'OData',
				'Documentation',
				'CLI'
			],
			technologies: {
				languages: ['C#', 'TypeScript', 'PowerShell'],
				frameworks: ['.NET 6/7', 'React', 'OpenTelemetry'],
				tools: ['Azure DevOps', 'GitHub Actions', 'DocFX', 'Grafana', 'Prometheus'],
				cloud: ['Azure', 'Azure Kubernetes Service', 'Azure Monitor', 'Application Insights']
			},
			achievements: [
				'Reduced MTTR (Mean Time To Resolution) by 45% through improved observability',
				'Increased API adoption by 30% through better documentation and tooling',
				'Contributed to 3 internal patents for data consumption protocols'
			]
		},
		{
			name: 'Microsoft',
			position: 'Azure Technical Engineer',
			url: 'https://microsoft.com',
			startDate: '2021-03',
			endDate: '2023-03',
			summary:
				'Provided technical support and engineering excellence for Azure services, working exclusively with Fortune 500 clients.',
			highlights: [
				'Achieved 4.94/5.00 customer feedback score through engineering excellence',
				'Provided continuous feedback to Product Group for Azure Virtual Desktop (AVD) features',
				'Developed documentation for Azure Core services including AVD, Virtual Machines, and Networks',
				'Worked exclusively with TOP 100 & Fortune 500 clients and industry leading professionals'
			],
			location: 'Romania (Remote)',
			keywords: ['Azure', 'Customer Support', 'Documentation', 'AVD', 'Fortune 500'],
			technologies: {
				languages: ['PowerShell', 'Bash', 'KQL (Kusto Query Language)'],
				tools: ['Azure Portal', 'Azure Resource Manager', 'Log Analytics', 'Azure Monitor'],
				cloud: ['Azure Virtual Desktop', 'Azure Virtual Machines', 'Azure Networking']
			},
			achievements: [
				'Maintained 99.9% SLA for critical customer incidents',
				'Recognized with 3 quarterly excellence awards',
				'Contributed to 15+ internal knowledge base articles'
			]
		}
	],
	volunteer: [
		{
			organization: 'Global Mentorship Initiative (GMI)',
			position: 'Mentor Leader',
			url: 'https://gmi.org',
			startDate: '2024',
			endDate: null,
			summary: 'Leading mentors in EMEA region for global mentorship initiatives.',
			highlights: ['One of the GMI leaders for mentors present in EMEA'],
			location: 'Europe',
			impact: 'Mentored 25+ computer science students in their career development'
		},
		{
			organization: 'Codette Romania',
			position: 'Infrastructure Leader',
			url: 'https://codette.ro',
			startDate: '2020',
			endDate: null,
			summary: 'Coordinating taskforce of students new to IT.',
			highlights: ['Coordinating a taskforce of 15 students new to IT'],
			location: 'Bucharest, Romania',
			impact: 'Helped 15+ students transition into IT careers through hands-on mentoring'
		},
		{
			organization: 'Microsoft Ambassadors',
			position: 'Department Leader',
			url: 'https://studentambassadors.microsoft.com',
			startDate: '2019',
			endDate: '2021',
			summary: 'Led department initiatives for Microsoft Student Ambassador program.',
			highlights: ['Department leadership for Microsoft Student Ambassador program'],
			location: 'Bucharest, Romania',
			impact: 'Organized 10+ technical workshops and community events'
		}
	],
	education: [
		{
			institution: 'Malmö University',
			url: 'https://mau.se',
			area: 'Internet of Things & Network Engineering',
			studyType: 'Master of Science',
			startDate: '2023',
			endDate: '2024',
			score: '',
			courses: [
				'Internet of Things',
				'Cloud Computing',
				'Data Science',
				'Machine Learning',
				'Artificial Intelligence',
				'Computer Vision',
				'Robotics'
			],
			location: 'Malmö, Sweden',
			status: 'Interrupted due to personal circumstances',
			highlights: [
				'Focus on IoT architecture and implementation',
				'Research in cloud-based IoT solutions',
				'Advanced networking protocols for constrained devices'
			]
		},
		{
			institution: 'Academia de Studii Economice',
			url: 'https://ase.ro',
			area: 'Computer Science & Economics',
			studyType: 'Bachelor of Science',
			startDate: '2019',
			endDate: '2022',
			score: 'Top 1% according to thesis rating statistics',
			courses: [
				'Software Engineering',
				'Computer Networks',
				'Operating Systems',
				'Algorithms & Data Structures',
				'Database Management Systems',
				'Web Development',
				'Mobile Development'
			],
			location: 'Bucharest, Romania',
			status: 'Completed',
			highlights: [
				"Thesis: 'Implementation of a Microservices Architecture for E-Commerce Platforms'",
				'GPA: 9.8/10',
				'Active member of the Computer Science Student Association'
			]
		}
	],
	awards: [
		{
			title: 'Microsoft Student TECHathon',
			date: '2020',
			awarder: 'Microsoft',
			summary: '1st place in Microsoft Student TECHathon competition',
			url: 'https://example.com/techathon2020',
			highlights: [
				'Developed an AI-powered solution for accessibility',
				'Competed against 50+ teams from across Europe',
				'Presented solution to Microsoft leadership team'
			]
		},
		{
			title: '2NHACK ML & AI Hackathon',
			date: '2020',
			awarder: '2NHACK',
			summary: '6th place in Machine Learning & AI Hackathon',
			url: 'https://example.com/2nhack2020',
			highlights: [
				'Created a computer vision solution for retail analytics',
				'Implemented real-time object detection and tracking',
				'Optimized for edge computing environments'
			]
		},
		{
			title: 'Top Talents Romania',
			date: '2020',
			awarder: 'Hipo.ro',
			summary: '70th place in Top Talents Romania ranking',
			url: 'https://example.com/toptalents2020',
			highlights: [
				'Selected from over 5,000 applicants',
				'Recognized for technical skills and leadership potential',
				'Participated in exclusive networking and development events'
			]
		}
	],
	certificates: [
		{
			name: 'Microsoft Certified: Azure Fundamentals',
			date: '2023',
			issuer: 'Microsoft',
			url: 'https://learn.microsoft.com/en-us/certifications/azure-fundamentals/',
			code: 'AZ-900',
			validUntil: 'No expiration',
			verificationUrl: 'https://learn.microsoft.com/en-us/certifications/azure-fundamentals/'
		},
		{
			name: 'Microsoft Certified: Azure AI Fundamentals',
			date: '2023',
			issuer: 'Microsoft',
			url: 'https://learn.microsoft.com/en-us/certifications/azure-ai-fundamentals/',
			code: 'AI-900',
			validUntil: 'No expiration',
			verificationUrl: 'https://learn.microsoft.com/en-us/certifications/azure-ai-fundamentals/'
		},
		{
			name: 'Microsoft Certified: Security, Compliance & Identity Fundamentals',
			date: '2023',
			issuer: 'Microsoft',
			url: 'https://learn.microsoft.com/en-us/certifications/security-compliance-and-identity-fundamentals/',
			code: 'SC-900',
			validUntil: 'No expiration',
			verificationUrl:
				'https://learn.microsoft.com/en-us/certifications/security-compliance-and-identity-fundamentals/'
		}
	],
	skills: [
		{
			name: 'Programming Languages',
			level: 'Expert',
			keywords: ['Rust', 'TypeScript', 'C#', 'Python', 'JavaScript', 'F#'],
			yearsOfExperience: 5,
			projects: [
				'Developed microservices in C# and .NET',
				'Created web applications with TypeScript and React',
				'Built data processing pipelines with Python'
			]
		},
		{
			name: 'Frameworks & Libraries',
			level: 'Expert',
			keywords: ['React 18/19', '.NET 6/8', 'Django', 'Svelte', 'Next.js', 'ASP.NET Core'],
			yearsOfExperience: 4,
			projects: [
				'Built enterprise applications with ASP.NET Core',
				'Developed SPAs with React and Next.js',
				'Created personal projects with Svelte'
			]
		},
		{
			name: 'Cloud & Infrastructure',
			level: 'Expert',
			keywords: [
				'Microsoft Azure',
				'Docker',
				'Containers',
				'Azure DevOps',
				'Bicep',
				'ARM',
				'CI/CD'
			],
			yearsOfExperience: 3,
			projects: [
				'Designed and implemented cloud-native architectures',
				'Created CI/CD pipelines with Azure DevOps',
				'Deployed containerized applications to AKS'
			]
		},
		{
			name: 'Data & Analytics',
			level: 'Advanced',
			keywords: ['SQL', 'KQL', 'Azure Data Factory', 'Apache Spark', 'Machine Learning', 'AI'],
			yearsOfExperience: 2,
			projects: [
				'Built data processing pipelines with Azure Data Factory',
				'Analyzed telemetry data with KQL',
				'Implemented ML models for predictive analytics'
			]
		},
		{
			name: 'Architecture & Design',
			level: 'Expert',
			keywords: [
				'Microservices',
				'Domain-Driven Design',
				'Test-Driven Development',
				'Clean Architecture',
				'Modular Monoliths'
			],
			yearsOfExperience: 4,
			projects: [
				'Designed microservices architectures for enterprise applications',
				'Implemented DDD principles in complex domains',
				'Applied TDD practices for high-quality software'
			]
		},
		{
			name: 'Project Management',
			level: 'Advanced',
			keywords: ['Agile', 'Scrum', 'Kanban', 'Waterfall', 'DevOps'],
			yearsOfExperience: 3,
			projects: [
				'Led Agile teams using Scrum methodology',
				'Implemented Kanban for continuous delivery',
				'Applied DevOps practices for improved collaboration'
			]
		}
	],
	languages: [
		{
			language: 'Romanian',
			fluency: 'Native speaker',
			certifications: []
		},
		{
			language: 'English',
			fluency: 'Fluent',
			certifications: ['Cambridge English: Advanced (CAE)']
		}
	],
	interests: [
		{
			name: 'Gaming',
			keywords: ['Strategy Games', 'DotA 2', 'Age of Empires', 'StarCraft', 'RTS Games']
		},
		{
			name: 'Technology',
			keywords: ['Open Source', 'New Technologies', 'Technical Books', 'Innovation']
		},
		{
			name: 'Mentoring',
			keywords: ['Student Mentoring', 'Career Development', 'Knowledge Sharing']
		}
	],
	references: testimonials
		? Object.values(testimonials).map((testimonial) => ({
				name: testimonial.author,
				reference: testimonial.quote,
				position: testimonial.position,
				company: testimonial.company
			}))
		: [],
	projects: [
		{
			name: 'arolariu.ro Platform',
			description: 'Personal platform built as a test-bench for new technologies and learning',
			highlights: [
				'Built using state-of-the-art technologies including Next.js, .NET, and Azure',
				'Implements comprehensive observability with OpenTelemetry',
				'Features multiple domain services and applications'
			],
			keywords: ['Next.js', '.NET', 'Azure', 'OpenTelemetry', 'Full-Stack'],
			startDate: '2022',
			endDate: null,
			url: 'https://arolariu.ro',
			roles: ['Full-Stack Developer', 'DevOps Engineer', 'Solution Architect'],
			entity: 'Personal Project',
			type: 'application',
			repository: 'https://github.com/arolariu/arolariu.ro',
			technologies: {
				frontend: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
				backend: ['.NET 7', 'C#', 'ASP.NET Core', 'Entity Framework Core'],
				devops: ['Azure DevOps', 'GitHub Actions', 'Docker', 'Kubernetes'],
				cloud: ['Azure App Service', 'Azure SQL', 'Azure Cosmos DB', 'Azure Monitor']
			},
			architecture: 'Microservices with API Gateway',
			metrics: {
				codeQuality: 'A',
				testCoverage: '85%',
				performance: '95/100 Lighthouse score',
				availability: '99.9% uptime'
			}
		}
	],
	technical: {
		operatingSystems: ['Windows', 'Linux (Ubuntu, Debian)', 'macOS'],
		databases: ['SQL Server', 'PostgreSQL', 'MongoDB', 'Azure Cosmos DB', 'Redis'],
		tools: ['Visual Studio', 'VS Code', 'Git', 'Docker', 'Kubernetes', 'Terraform'],
		methodologies: ['Agile', 'Scrum', 'Kanban', 'DevOps', 'GitFlow'],
		testing: ['Unit Testing', 'Integration Testing', 'E2E Testing', 'TDD', 'BDD'],
		security: ['OWASP', 'OAuth 2.0', 'OpenID Connect', 'Azure AD', 'JWT'],
		performance: ['Caching', 'Load Balancing', 'CDN', 'Performance Profiling'],
		softSkills: ['Communication', 'Leadership', 'Problem Solving', 'Teamwork', 'Mentoring']
	}
};
