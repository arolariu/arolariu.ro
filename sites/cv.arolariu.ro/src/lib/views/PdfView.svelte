<script lang="ts">
	import Header from '@/presentation/Header.svelte';
	import { onMount } from 'svelte';
	let PdfViewer: any;

	onMount(async () => {
		// @ts-expect-error -- the dynamic import doesn't have types available.
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
			<svelte:component
				this={PdfViewer}
				url="./cv.pdf"
				downloadFileName="CV_AlexandruRazvan_Olariu.pdf"
				showButtons={['print', 'download', 'timeInfo', 'pageInfo']}
			/>
		</div>

		<!-- Right gradient margin (12.5%) -->
		<div class="hidden lg:block w-1/8 h-full print:hidden"></div>
	</div>
</div>
