namespace arolariu.Backend.Domain.Invoices.Brokers.GenerativeAnalysisBroker;

using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;

/// <summary>
/// Provides a thin, provider-neutral abstraction over a generative AI chat client for typed structured generation.
/// </summary>
/// <remarks>
/// <para><b>Role (Broker Standard):</b> This broker is a thin adapter over <see cref="Microsoft.Extensions.AI.IChatClient"/>
/// using the provider's native JSON Schema structured-output support. It performs no delimiter parsing, free-text
/// fallback, retry, orchestration, or business logic.</para>
/// <para><b>Confidentiality:</b> Implementations MUST NOT log prompt or response content, since <see cref="GenerativeAnalysisRequest.UserPayload"/>
/// may carry OCR-derived personal or sensitive data.</para>
/// </remarks>
public interface IGenerativeAnalysisBroker
{
  /// <summary>
  /// Generates a typed structured response for the supplied request.
  /// </summary>
  /// <typeparam name="T">The structured output type requested from the provider.</typeparam>
  /// <param name="request">The structured generation request.</param>
  /// <param name="cancellationToken">The cancellation token that aborts generation.</param>
  /// <returns>The typed structured response.</returns>
  /// <exception cref="System.ArgumentNullException">Thrown when <paramref name="request"/> is null.</exception>
  /// <exception cref="InvalidStructuredOutputException">Thrown when the provider does not return a typed structured result.</exception>
  Task<GenerativeAnalysisResponse<T>> GenerateStructuredAsync<T>(
    GenerativeAnalysisRequest request,
    CancellationToken cancellationToken)
    where T : class;
}
