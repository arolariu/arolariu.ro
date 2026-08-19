namespace arolariu.Backend.Domain.Invoices.Services.Foundation.ClassificationAnalysis;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications.Exceptions.Inner;

using Microsoft.Extensions.Logging;

/// <summary>
/// Implements taxonomy search and canonical classification resolution.
/// </summary>
public sealed class ClassificationAnalysisFoundationService(
  ITaxonomyBroker taxonomyBroker,
  ILoggerFactory loggerFactory) : IClassificationAnalysisFoundationService
{
  private readonly ITaxonomyBroker taxonomyBroker = taxonomyBroker ?? throw new ArgumentNullException(nameof(taxonomyBroker));
  private readonly ILogger<IClassificationAnalysisFoundationService> logger =
    (loggerFactory ?? throw new ArgumentNullException(nameof(loggerFactory)))
      .CreateLogger<IClassificationAnalysisFoundationService>();

  /// <inheritdoc/>
  public async Task<string> GetArtifactVersionAsync(
    ClassificationSystem system,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(() => Task.FromResult(taxonomyBroker.GetArtifactVersion(system)), cancellationToken)
      .ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<IReadOnlyList<ClassificationCandidateOption>> SearchAsync(
    ClassificationSystem system,
    string query,
    int maximumResults,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(
      () => Task.FromResult<IReadOnlyList<ClassificationCandidateOption>>(
        [.. taxonomyBroker
          .Search(system, query, maximumResults)
          .Select(result => new ClassificationCandidateOption(result.Code, result.OfficialLabel))]),
      cancellationToken)
      .ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<StandardClassification> ResolveAsync(
    ClassificationSystem system,
    string code,
    ClassificationOrigin origin,
    double? confidence,
    IReadOnlyList<ClassificationEvidence> evidence,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(
      () => Task.FromResult(taxonomyBroker.Resolve(system, code, origin, confidence, evidence)),
      cancellationToken)
      .ConfigureAwait(false);

  private async Task<TResult> TryCatchAsync<TResult>(
    Func<Task<TResult>> returningFunction,
    CancellationToken cancellationToken)
  {
    try
    {
      cancellationToken.ThrowIfCancellationRequested();
      return await returningFunction().ConfigureAwait(false);
    }
    catch (OperationCanceledException)
    {
      throw;
    }
    catch (Exception exception)
    {
      throw Classify(exception);
    }
  }

  private Exception Classify(Exception exception) => exception switch
  {
    ArgumentException => LogAndWrapValidation(exception),
    TaxonomyCodeNotFoundException => LogAndWrapDependencyValidation(exception),
    KeyNotFoundException => LogAndWrapDependencyValidation(exception),
    _ => LogAndWrapService(exception),
  };

  private AnalysisFoundationValidationException LogAndWrapValidation(Exception exception)
  {
    var outer = new AnalysisFoundationValidationException(exception);
    logger.LogClassificationAnalysisValidationException();
    return outer;
  }

  private AnalysisFoundationDependencyValidationException LogAndWrapDependencyValidation(Exception exception)
  {
    var outer = new AnalysisFoundationDependencyValidationException(exception);
    logger.LogClassificationAnalysisDependencyValidationException();
    return outer;
  }

  private AnalysisFoundationServiceException LogAndWrapService(Exception exception)
  {
    var outer = new AnalysisFoundationServiceException(exception);
    logger.LogClassificationAnalysisServiceException();
    return outer;
  }
}
