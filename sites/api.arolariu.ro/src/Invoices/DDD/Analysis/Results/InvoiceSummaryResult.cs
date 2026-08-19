namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

/// <summary>
/// Represents the immutable transient invoice summary generated for one analysis request.
/// </summary>
public sealed record InvoiceSummaryResult
{
  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceSummaryResult"/> record.
  /// </summary>
  /// <param name="name">The concise invoice display name.</param>
  /// <param name="description">The concise invoice description.</param>
  /// <exception cref="System.ArgumentException">
  /// Thrown when <paramref name="name"/> or <paramref name="description"/> is null, empty, or whitespace.
  /// </exception>
  public InvoiceSummaryResult(string name, string description)
  {
    Name = AnalysisContractGuards.RequireText(name, nameof(name));
    Description = AnalysisContractGuards.RequireText(description, nameof(description));
  }

  /// <summary>Gets the concise invoice display name.</summary>
  public string Name { get; }

  /// <summary>Gets the concise invoice description.</summary>
  public string Description { get; }
}
