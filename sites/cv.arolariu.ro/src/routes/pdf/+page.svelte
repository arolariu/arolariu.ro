<script lang="ts">
	import PdfView from '@/lib/views/PdfView.svelte';
</script>

<svelte:head>
	<title>CV - PDF Format | cv.arolariu.ro</title>
	<meta
		name="description"
		content="Traditional resume format optimized for printing and ATS systems"
	/>

	<!-- Load html2canvas package -->
	<script
		src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
	></script>

	<!-- Load jsPDF package -->
	<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/3.0.1/jspdf.umd.min.js"></script>
</svelte:head>

<PdfView />
