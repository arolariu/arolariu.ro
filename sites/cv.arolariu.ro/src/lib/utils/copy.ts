import { err, ok } from './result';
import type { Result } from './result';

/**
 * Copy arbitrary text to the clipboard (Phase 0 utility consolidation).
 * Falls back to a temporary textarea if navigator.clipboard is unavailable or errors.
 */
export async function copyText(text: string): Promise<Result<void>> {
	// SSR / non-browser guard
	if (typeof window === 'undefined') return err(new Error('Clipboard not available (SSR)'));
	if (!text) return ok(undefined);

	// Prefer modern async clipboard API
	if (navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text);
			return ok(undefined);
		} catch (err: any) {
			console.error('>>> Error when trying to use modern navigation clipboard API:', err);
		}
	}

	// Fallback: hidden textarea selection method
	try {
		const ta = document.createElement('textarea');
		ta.value = text;
		ta.setAttribute('readonly', 'true');
		ta.style.position = 'fixed';
		ta.style.top = '-9999px';
		document.body.appendChild(ta);
		ta.select();
		document.execCommand('copy');
		document.body.removeChild(ta);
		return ok(undefined);
	} catch (e: any) {
		return err(e instanceof Error ? e : new Error(String(e)));
	}
}
