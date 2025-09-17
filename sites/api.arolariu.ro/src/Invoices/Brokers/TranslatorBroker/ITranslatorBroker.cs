namespace arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;

using System.Threading.Tasks;

/// <summary>
/// Thin text translation + language identification broker abstraction over Azure AI Translation service.
/// </summary>
/// <remarks>
/// <para><b>Role (Broker Standard):</b> Wraps a single external SDK (<c>TextTranslationClient</c>) and exposes primitive translation and
/// language detection operations. NO business validation, persistence, authorization, throttling, caching, or retry policy (added upstream).</para>
/// <para><b>Determinism:</b> Translation output may evolve as provider models update; callers SHOULD NOT depend on exact phrase stability for
/// storage-based idempotency (recommend storing original text and performing on-demand translation or caching with version tags).</para>
/// <para><b>Character Handling:</b> Unicode input is accepted as-is. No normalization (NFC/NFD) or HTML entity decoding is performed (backlog feature).</para>
/// <para><b>Error Semantics:</b> Argument null/empty SHOULD produce <see cref="System.ArgumentException"/> in implementations; provider exceptions
/// (network/auth/service) bubble for higher resilience layer handling.</para>
/// <para><b>Performance:</b> Each call results in a network round trip. High-volume batch translation SHOULD be handled by an orchestration facade
/// (parallelization + rate limiting). Future optimization: introduce bulk methods to reduce per-call overhead.</para>
/// <para><b>Backlog:</b> Cancellation tokens, domain-aware profanity masking, glossary injection, multi-target locale fan-out, and metrics instrumentation.</para>
/// </remarks>
public interface ITranslatorBroker
{
	/// <summary>
	/// Translates raw user/domain text into a target BCP‑47 language (default: English).
	/// </summary>
	/// <remarks>
	/// <para><b>Mutation:</b> Pure function; returns a translated string (empty string on provider partial failure may be an implementation choice).</para>
	/// <para><b>Safety:</b> Caller SHOULD trim or sanitize input prior to translation if required (this method does not escape or filter content).</para>
	/// <para><b>Fallback:</b> Implementations MAY return empty string on provider fault; upstream layers SHOULD treat empty output as non-fatal.</para>
	/// </remarks>
	/// <param name="text">Source text to translate (SHOULD NOT be null or empty).</param>
	/// <param name="language">Target locale code (BCP‑47, e.g. "en", "ro", "de"). Defaults to "en".</param>
	/// <returns>Translated text (may be empty on graceful degradation strategy).</returns>
	Task<string> Translate(string text, string language = "en");

	/// <summary>
	/// Detects the most probable language for a given text sample.
	/// </summary>
	/// <remarks>
	/// <para><b>Heuristics:</b> Underlying service may require minimum character length for high confidence. Very short inputs may return generic or unexpected codes.</para>
	/// <para><b>Stability:</b> Detection confidence is not surfaced here (future enhancement: return composite result including score).</para>
	/// </remarks>
	/// <param name="text">Source text whose language should be inferred.</param>
	/// <returns>Detected BCP‑47 language tag (e.g. "en", "ro").</returns>
	Task<string> DetectLanguage(string text);
}
