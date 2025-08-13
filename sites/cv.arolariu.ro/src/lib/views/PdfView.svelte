<script lang="ts">
	import Header from '@/presentation/Header.svelte';
	import { onMount } from 'svelte';
	let PdfViewer: any;

	onMount(async () => {
		const module = await import('svelte-pdf');
		PdfViewer = module.default;
	});
</script>

<div
	class="min-h-screen transition-colors duration-300 bg-gradient-to-l from-blue-900 to-purple-900 via-pink-400"
>
	<Header sticky showNavLinks={false} variant="inverse" />
	<div class="flex justify-center items-center min-h-screen p-8 print:p-0">
		<!-- Left gradient margin (12.5%) -->
		<div class="hidden lg:block w-1/8 h-full print:hidden"></div>

		<!-- CV Container (75% width) -->
		<div class="w-full lg:w-3/4 flex justify-center">
			{#if PdfViewer}
				<svelte:component
					this={PdfViewer}
					url="./cv.pdf"
					downloadFileName="CV_AlexandruRazvan_Olariu.pdf"
					showButtons={['print', 'download', 'timeInfo', 'pageInfo']}
				/>
			{:else}
				<div
					class="flex items-center justify-center w-full h-[65vh] rounded-lg bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/30 dark:border-white/10"
					role="status"
					aria-busy="true"
					aria-live="polite"
				>
					<div class="flex flex-col items-center gap-3 text-white">
						<div
							class="h-8 w-8 border-2 border-white/60 border-t-transparent rounded-full animate-spin"
							aria-hidden="true"
						></div>
						<span class="text-sm opacity-80">Loading PDF viewer…</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Right gradient margin (12.5%) -->
		<div class="hidden lg:block w-1/8 h-full print:hidden"></div>
	</div>
</div>
