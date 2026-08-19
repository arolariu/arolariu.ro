namespace arolariu.Backend.Domain.Invoices.Brokers.GenerativeAnalysisBroker;

using System;

/// <summary>
/// Represents a structured generation request submitted to the generative AI broker.
/// </summary>
/// <remarks>
/// <para><b>Prompt-Injection Boundary:</b> <see cref="UserPayload"/> is always serialized by the broker as a nested
/// <c>user_payload</c> JSON field. Callers MUST design <see cref="SystemPrompt"/> so the model treats
/// <see cref="UserPayload"/> strictly as untrusted data and never follows instructions embedded within it.</para>
/// </remarks>
public sealed record GenerativeRequest
{
  /// <summary>
  /// Initializes a new instance of the <see cref="GenerativeRequest"/> record.
  /// </summary>
  /// <param name="systemPrompt">The trusted system prompt instructing the model, including the untrusted-data boundary statement.</param>
  /// <param name="userPayload">The untrusted payload serialized as <c>user_payload</c> JSON data.</param>
  /// <exception cref="ArgumentException">Thrown when <paramref name="systemPrompt"/> is null, empty, or whitespace.</exception>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="userPayload"/> is null.</exception>
  public GenerativeRequest(string systemPrompt, object userPayload)
  {
    ArgumentNullException.ThrowIfNull(systemPrompt);

    if (string.IsNullOrWhiteSpace(systemPrompt))
    {
      throw new ArgumentException("System prompt must not be empty or whitespace.", nameof(systemPrompt));
    }

    SystemPrompt = systemPrompt;
    UserPayload = userPayload ?? throw new ArgumentNullException(nameof(userPayload));
  }

  /// <summary>Gets the trusted system prompt sent to the generative AI provider.</summary>
  public string SystemPrompt { get; }

  /// <summary>Gets the untrusted payload serialized as <c>user_payload</c> JSON data.</summary>
  public object UserPayload { get; }
}
