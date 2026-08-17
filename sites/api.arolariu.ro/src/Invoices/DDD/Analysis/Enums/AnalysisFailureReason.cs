namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Enumerates the bounded failure reasons reported by analysis telemetry.
/// </summary>
/// <remarks>
/// <para>Reasons mirror The Standard's exception taxonomy plus the analysis-specific failure modes that operators
/// need to alert on separately. Callers cannot supply a free-form reason string, which keeps the
/// <c>failure.reason</c> metric dimension bounded and prevents sensitive text from ever reaching telemetry.</para>
/// </remarks>
public enum AnalysisFailureReason
{
  /// <summary>Caller-supplied input failed validation before any dependency was reached.</summary>
  Validation,

  /// <summary>An external dependency failed in a transient or infrastructural way.</summary>
  Dependency,

  /// <summary>An external dependency rejected the request as invalid.</summary>
  DependencyValidation,

  /// <summary>An unexpected internal failure occurred.</summary>
  Service,

  /// <summary>The generative provider filtered or refused the request.</summary>
  ContentFilter,

  /// <summary>The generative provider returned structured output that violated the published contract.</summary>
  InvalidStructuredOutput,

  /// <summary>A taxonomy code could not be validated against its classification system.</summary>
  Taxonomy,

  /// <summary>The worker lost the run's lease before the analyzed target could be persisted.</summary>
  LeaseLost,

  /// <summary>The analysis produced results that could not be persisted onto the target aggregate.</summary>
  TargetPersistence,

  /// <summary>The run referenced a target type the pipeline cannot execute.</summary>
  UnsupportedTarget,
}
