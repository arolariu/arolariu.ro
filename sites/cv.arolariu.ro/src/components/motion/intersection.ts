export interface IntersectParams {
	threshold?: number | number[];
	root?: Element | Document | null;
	rootMargin?: string;
	once?: boolean;
	onEnter?: (entry: IntersectionObserverEntry) => void;
	onLeave?: (entry: IntersectionObserverEntry) => void;
}

export function intersect(node: HTMLElement, params: IntersectParams = {}) {
	let opts = params;
	let observer: IntersectionObserver | null = null;

	function cleanup() {
		observer?.disconnect();
		observer = null;
	}

	function init() {
		cleanup();
		const {
			threshold = 0.1,
			root = null,
			rootMargin = '0px',
			once = true,
			onEnter,
			onLeave
		} = opts;
		observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.target !== node) return;
					if (entry.isIntersecting) {
						onEnter?.(entry);
						if (once) observer?.unobserve(node);
					} else {
						onLeave?.(entry);
					}
				});
			},
			{ threshold, root, rootMargin }
		);
		observer.observe(node);
	}

	init();

	return {
		update(next: IntersectParams) {
			opts = next;
			init();
		},
		destroy() {
			cleanup();
		}
	};
}
