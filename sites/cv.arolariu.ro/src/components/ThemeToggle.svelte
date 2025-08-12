<script lang="ts">
	import { useTheme } from '@/hooks/useTheme.svelte';
	const { toggle } = useTheme();
</script>

<button
	onclick={toggle}
	class="relative inline-flex items-center justify-center w-12 h-12 rounded-full transition-colors duration-300 ease-in-out bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
	aria-label="Toggle theme"
	title="Toggle theme"
>
	<div class="relative w-6 h-6 overflow-hidden">
		<!-- Sun Icon -->
		<div
			class="absolute inset-0 transition-transform duration-500 ease-in-out dark:-translate-y-full translate-y-0"
		>
			<svg
				class="w-6 h-6 text-yellow-400"
				viewBox="0 0 48 48"
				xmlns="http://www.w3.org/2000/svg"
				fill="#000000"
				><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g
					id="SVGRepo_tracerCarrier"
					stroke-linecap="round"
					stroke-linejoin="round"
				></g><g id="SVGRepo_iconCarrier">
					<title>sun</title>
					<g id="Layer_2" data-name="Layer 2">
						<g id="invisible_box" data-name="invisible box">
							<rect width="48" height="48" fill="none"></rect>
						</g>
						<g id="Q3_icons" data-name="Q3 icons">
							<g>
								<path d="M24,10a2,2,0,0,0,2-2V4a2,2,0,0,0-4,0V8A2,2,0,0,0,24,10Z"></path>
								<path d="M24,38a2,2,0,0,0-2,2v4a2,2,0,0,0,4,0V40A2,2,0,0,0,24,38Z"></path>
								<path
									d="M36.7,14.1l2.9-2.8a2.3,2.3,0,0,0,0-2.9,2.3,2.3,0,0,0-2.9,0l-2.8,2.9a2,2,0,1,0,2.8,2.8Z"
								></path>
								<path
									d="M11.3,33.9,8.4,36.7a2.3,2.3,0,0,0,0,2.9,2.3,2.3,0,0,0,2.9,0l2.8-2.9a2,2,0,1,0-2.8-2.8Z"
								></path> <path d="M44,22H40a2,2,0,0,0,0,4h4a2,2,0,0,0,0-4Z"></path>
								<path d="M10,24a2,2,0,0,0-2-2H4a2,2,0,0,0,0,4H8A2,2,0,0,0,10,24Z"></path>
								<path d="M36.7,33.9a2,2,0,1,0-2.8,2.8l2.8,2.9a2.1,2.1,0,1,0,2.9-2.9Z"></path>
								<path
									d="M11.3,14.1a2,2,0,0,0,2.8-2.8L11.3,8.4a2.3,2.3,0,0,0-2.9,0,2.3,2.3,0,0,0,0,2.9Z"
								></path>
								<path
									d="M24,14A10,10,0,1,0,34,24,10,10,0,0,0,24,14Zm0,16a6,6,0,1,1,6-6A6,6,0,0,1,24,30Z"
								></path>
							</g>
						</g>
					</g>
				</g></svg
			>
		</div>
		<!-- Moon Icon -->
		<div
			class="absolute inset-0 transition-transform duration-500 ease-in-out dark:translate-y-0 transform translate-y-full"
		>
			<svg
				class="w-6 h-6 text-blue-500"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g
					id="SVGRepo_tracerCarrier"
					stroke-linecap="round"
					stroke-linejoin="round"
				></g><g id="SVGRepo_iconCarrier">
					<path
						d="M3.32031 11.6835C3.32031 16.6541 7.34975 20.6835 12.3203 20.6835C16.1075 20.6835 19.3483 18.3443 20.6768 15.032C19.6402 15.4486 18.5059 15.6834 17.3203 15.6834C12.3497 15.6834 8.32031 11.654 8.32031 6.68342C8.32031 5.50338 8.55165 4.36259 8.96453 3.32996C5.65605 4.66028 3.32031 7.89912 3.32031 11.6835Z"
						stroke="#000000"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					></path>
				</g></svg
			>
		</div>
	</div>
</button>
