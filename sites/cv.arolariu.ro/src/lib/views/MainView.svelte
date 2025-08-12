<script lang="ts">
	import { landing } from '@/data';
	import ThemeToggle from '@/components/ThemeToggle.svelte';
	import HelpDialog from '@/components/HelpDialog.svelte';
	import { goto } from '$app/navigation';
	import Icon from '@/presentation/Icon.svelte';
	import Footer from '@/presentation/Footer.svelte';
	let showHelpDialog = $state<boolean>(false);

	const panels = [
		{
			id: 'human',
			title: 'CV - Human Readable Format',
			description: 'Interactive web-based resume with modern design and animations',
			gradient: 'from-blue-500 to-purple-600',
			icon: 'user',
			action: () => goto('/human')
		},
		{
			id: 'pdf',
			title: 'CV - PDF Format',
			description: 'Traditional resume format optimized for printing and ATS systems',
			gradient: 'from-green-500 to-teal-600',
			icon: 'file',
			action: () => goto('/pdf')
		},
		{
			id: 'json',
			title: 'CV - JSON Format',
			description:
				'Structured resume data following the JSON Resume schema standard. Perfect for developers, APIs, and automated processing systems.',
			gradient: 'from-orange-500 to-red-600',
			icon: 'json',
			action: () => goto('/json')
		},
		{
			id: 'help',
			title: landing.panels.help.title,
			description: landing.panels.help.description,
			gradient: 'from-purple-500 to-pink-600',
			icon: 'help',
			action: () => (showHelpDialog = true)
		}
	];
</script>

<div
	class="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-all duration-300 flex items-center justify-center p-6"
>
	<div class="fixed top-6 right-6 z-50">
		<ThemeToggle />
	</div>

	<div class="relative z-10 max-w-6xl mx-auto">
		<!-- Header with stark contrast -->
		<div class="text-center mb-12">
			<h1
				class="text-4xl md:text-6xl font-bold mb-4 font-['Caudex'] text-black dark:text-white transition-colors duration-300"
			>
				Alexandru-Razvan
				<span class="text-blue-600 dark:text-blue-400">Olariu</span>
			</h1>
			<p class="text-xl mb-8 text-gray-600 dark:text-gray-400 transition-colors duration-300">
				{landing.subtitle}
			</p>
		</div>

		<div class="grid md:grid-cols-2 gap-6 lg:gap-8">
			{#each panels as panel}
				<button
					type="button"
					class={'panel-fade-in group relative backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-900/90 rounded-2xl p-8 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl text-left cursor-pointer transform focus:outline-none focus:ring-4 focus:ring-blue-500/40'}
					aria-label={panel.title}
					onclick={panel.action}
					data-panel={panel.id}
				>
					<div
						class="absolute inset-0 bg-gradient-to-r {panel.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300"
					></div>
					<div class="relative mb-6">
						<div
							class="w-16 h-16 bg-gradient-to-r {panel.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg"
						>
							<Icon name={panel.icon as any} class="w-8 h-8 text-white" />
						</div>
					</div>
					<div class="relative">
						<h3
							class="text-2xl font-bold mb-3 text-black dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300"
						>
							{panel.title}
						</h3>
						{#if panel.description}
							<p
								class="leading-relaxed text-gray-600 dark:text-gray-400 transition-colors duration-300"
							>
								{panel.description}
							</p>
						{/if}
					</div>
					{#if panel.id !== 'help'}
						<div
							class="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
						>
							<Icon name="arrow-right" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
						</div>
					{/if}
				</button>
			{/each}
		</div>

		<!-- Footer -->
		<Footer />
	</div>

	<HelpDialog bind:open={showHelpDialog} />
</div>
