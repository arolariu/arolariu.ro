// Technical information for the help dialog and app metadata
export const techInfo = {
	version: 'v1.0.0',
	deployDate: new Date().toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	}),
	commitSha: 'a7b3c9d2f1e',
	sourceCodeUrl: 'https://github.com/arolariu/cv.arolariu.ro',
	cloudProvider: 'Microsoft Azure',
	region: 'West Europe',
	framework: 'Svelte 5',
	buildTime: '2 minutes 34 seconds',
	lastUpdated: new Date().toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}),
	dependencies: [
		{ name: 'Svelte', version: '5.0.0' },
		{ name: 'Tailwind CSS', version: '4.0.0' },
		{ name: 'Vite', version: '7.0.0' },
		{ name: 'TypeScript', version: '5.9.2' }
	]
};

// Footer content
export const footer = {
	copyright: `© 2024 - ${new Date().getFullYear()} Alexandru-Razvan Olariu. All rights reserved.`,
	links: {
		github: {
			url: 'https://github.com/arolariu',
			label: 'GitHub Profile'
		},
		linkedin: {
			url: 'https://www.linkedin.com/in/olariu-alexandru/',
			label: 'LinkedIn Profile'
		},
		website: {
			url: 'https://arolariu.ro',
			label: 'Personal Website'
		}
	}
};
