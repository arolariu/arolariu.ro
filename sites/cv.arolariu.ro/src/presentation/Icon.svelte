<script lang="ts">
	/**
	 * Central icon registry.
	 * Add new names here and supply a single scalable (stroke-based where possible) SVG.
	 */
	export type IconName =
		| 'arrow-left'
		| 'arrow-right'
		| 'print'
		| 'download'
		| 'copy'
		| 'user'
		| 'file'
		| 'json'
		| 'help'
		| 'email'
		| 'phone'
		| 'location'
		| 'linkedin'
		| 'github'
		| 'globe';

	interface IconProps {
		name: IconName;
		class?: string;
		size?: number | string;
	}
	let { name, class: klass = '', size = 16 }: IconProps = $props();
	const dimensionStyle =
		typeof size === 'number'
			? `width:${size}px;height:${size}px;`
			: typeof size === 'string' && size.match(/^[0-9.]+(px|rem|em|%)$/)
				? `width:${size};height:${size};`
				: '';
</script>

{#if name === 'arrow-left'}
	<svg class={klass} style={dimensionStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
	</svg>
{:else if name === 'arrow-right'}
	<svg class={klass} style={dimensionStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
	</svg>
{:else if name === 'print'}
	<svg
		class={klass}
		style={dimensionStyle}
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			d="M18.75 17H20C20.5523 17 21 16.5523 21 16V8C21 7.44772 20.5523 7 20 7H4C3.44772 7 3 7.44772 3 8V16C3 16.5523 3.44772 17 4 17H5.25"
			stroke="#000000"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path
			d="M6 12C6 11.4477 6.44772 11 7 11H17C17.5523 11 18 11.4477 18 12V20C18 20.5523 17.5523 21 17 21H7C6.44772 21 6 20.5523 6 20V12Z"
			stroke="#000000"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path
			d="M6 4C6 3.44772 6.44772 3 7 3H17C17.5523 3 18 3.44772 18 4V7H6V4Z"
			stroke="#000000"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path d="M8.5 13.5H15.5" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" />
		<path d="M8.5 18.5H15.5" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" />
		<path d="M8.5 16H15.5" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" />
	</svg>
{:else if name === 'download'}
	<svg class={klass} style={dimensionStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path
			d="M17 17H17.01M17.4 14H18C18.9319 14 19.3978 14 19.7654 14.1522C20.2554 14.3552 20.6448 14.7446 20.8478 15.2346C21 15.6022 21 16.0681 21 17C21 17.9319 21 18.3978 20.8478 18.7654C20.6448 19.2554 20.2554 19.6448 19.7654 19.8478C19.3978 20 18.9319 20 18 20H6C5.06812 20 4.60218 20 4.23463 19.8478C3.74458 19.6448 3.35523 19.2554 3.15224 18.7654C3 18.3978 3 17.9319 3 17C3 16.0681 3 15.6022 3.15224 15.2346C3.35523 14.7446 3.74458 14.3552 4.23463 14.1522C4.60218 14 5.06812 14 6 14H6.6M12 15V4M12 15L9 12M12 15L15 12"
			stroke="#000000"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		></path>
	</svg>
{:else if name === 'copy'}
	<svg class={klass} style={dimensionStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
		/>
	</svg>
{:else if name === 'user'}
	<!-- Human panel icon -->
	<svg class={klass} style={dimensionStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
		/>
	</svg>
{:else if name === 'file'}
	<!-- PDF / document panel icon -->
	<svg class={klass} style={dimensionStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
		/>
	</svg>
{:else if name === 'json'}
	<!-- JSON / code-ish panel icon -->
	<svg class={klass} style={dimensionStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
		/>
	</svg>
{:else if name === 'help'}
	<!-- Help / question circle -->
	<svg class={klass} style={dimensionStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
		/>
	</svg>
{:else if name === 'email'}
	<svg class={klass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
		/>
	</svg>
{:else if name === 'phone'}
	<svg class={klass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
		/>
	</svg>
{:else if name === 'location'}
	<svg class={klass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z"
		/>
	</svg>
{:else if name === 'linkedin'}
	<svg class={klass} style={dimensionStyle} fill="currentColor" viewBox="0 0 24 24">
		<path
			d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
		/>
	</svg>
{:else if name === 'github'}
	<svg class={klass} style={dimensionStyle} fill="currentColor" viewBox="0 0 24 24">
		<path
			d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
		/>
	</svg>
{:else if name === 'globe'}
	<svg class={klass} style={dimensionStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
		/>
	</svg>
{/if}
