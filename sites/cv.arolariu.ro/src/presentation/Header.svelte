<script lang="ts">
	import { goto } from '$app/navigation';
	import ThemeToggle from '../components/ThemeToggle.svelte';
	import { ui } from '../data';
	import ActionButton from '@/presentation/ActionButton.svelte';

	export type ActionConfig = {
		icon?: 'print' | 'download' | 'copy';
		label: string;
		loading?: boolean;
		disabled?: boolean;
		onClick: () => void;
	};

	interface Props {
		variant?: 'default' | 'inverse';
		actions?: () => any; // render function for actions area
		sticky?: boolean; // stick to top
		showNavLinks?: boolean; // show section nav links (non-minimal)
		class?: string; // extra classes
		actionsConfig?: ActionConfig[];
	}

	let {
		variant = 'default',
		actions = undefined,
		sticky = true,
		showNavLinks = true,
		actionsConfig = undefined,
		class: extra = ''
	}: Props = $props();

	function goBack() {
		goto('/');
	}

	const wrapperBase =
		(sticky ? 'sticky top-0 ' : '') +
		(variant === 'inverse'
			? 'z-50 border-b border-white/20 bg-white/5 backdrop-blur-md shadow-lg text-white'
			: 'z-50 border-b border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-sm');

	const titleClasses =
		"font-bold font-['Caudex'] transition-colors duration-300 " +
		(variant === 'inverse'
			? 'text-xl md:text-xl text-white'
			: 'text-xl md:text-xl text-gray-900 dark:text-gray-100');
</script>

<header class={`${wrapperBase} transition-all duration-300 ${extra} print:hidden`}>
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between items-center h-16">
			<div class="flex items-center gap-4">
				<ActionButton
					back
					label={ui.navigation.backToMenu}
					onClick={goBack}
					variant={variant === 'inverse' ? 'text-inverse' : 'text'}
				/>
				<div class="flex items-center 2xsm:text-md">
					<h1 class={titleClasses}>Alexandru-Razvan Olariu</h1>
				</div>
			</div>
			<div class="flex items-center space-x-4">
				{#if showNavLinks}
					<nav class="hidden md:flex items-center space-x-6">
						<a
							href="#about"
							class="text-gray-700 dark:text-gray-300 transition-colors duration-200 hover:text-blue-600 dark:hover:text-blue-400"
							>{ui.navigation.about}</a
						>
						<a
							href="#experience"
							class="text-gray-700 dark:text-gray-300 transition-colors duration-200 hover:text-blue-600 dark:hover:text-blue-400"
							>{ui.navigation.experience}</a
						>
						<a
							href="#skills"
							class="text-gray-700 dark:text-gray-300 transition-colors duration-200 hover:text-blue-600 dark:hover:text-blue-400"
							>{ui.navigation.skills}</a
						>
						<a
							href="#contact"
							class="text-gray-700 dark:text-gray-300 transition-colors duration-200 hover:text-blue-600 dark:hover:text-blue-400"
							>{ui.navigation.contact}</a
						>
					</nav>
				{/if}
				<ThemeToggle />
				{#if actionsConfig}
					<div class="md:flex items-center gap-3 2xsm:hidden">
						{#each actionsConfig as act}
							<ActionButton
								icon={act.icon}
								label={act.label}
								loading={act.loading}
								disabled={act.disabled}
								onClick={act.onClick}
								variant={variant === 'inverse' ? 'inverse' : 'default'}
							/>
						{/each}
					</div>
				{/if}
				{#if actions && !actionsConfig}
					<div class="md:flex items-center gap-3 2xsm:hidden">{@render actions()}</div>
				{/if}
			</div>
		</div>
	</div>
</header>
