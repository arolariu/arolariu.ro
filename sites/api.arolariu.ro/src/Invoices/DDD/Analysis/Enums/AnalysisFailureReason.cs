namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.Serialization;

/// <summary>
/// Enumerates the bounded failure reasons reported by analysis telemetry.
/// </summary>
/// <remarks>
/// <para>Reasons mirror The Standard's exception taxonomy plus the analysis-specific failure modes that operators
/// need to alert on separately. Callers cannot supply a free-form reason string, which keeps the
/// <c>failure.reason</c> metric dimension bounded and prevents sensitive text from ever reaching telemetry.</para>
/// </remarks>
[JsonConverter(typeof(StrictStringEnumConverter<AnalysisFailureReason>))]
public enum AnalysisFailureReason
{
  /// <summary>Caller-supplied input failed validation before any dependency was reached.</summary>
  [JsonStringEnumMemberName("validation")]
  Validation,

  /// <summary>An external dependency failed in a transient or infrastructural way.</summary>
  [JsonStringEnumMemberName("dependency")]
  Dependency,

  /// <summary>An external dependency rejected the request as invalid.</summary>
  [JsonStringEnumMemberName("dependencyValidation")]
  DependencyValidation,

  /// <summary>An unexpected internal failure occurred.</summary>
  [JsonStringEnumMemberName("service")]
  Service,

  /// <summary>The generative provider filtered or refused the request.</summary>
  [JsonStringEnumMemberName("contentFilter")]
  ContentFilter,

  /// <summary>The generative provider returned structured output that violated the published contract.</summary>
  [JsonStringEnumMemberName("invalidStructuredOutput")]
  InvalidStructuredOutput,

  /// <summary>A taxonomy code could not be validated against its classification system.</summary>
  [JsonStringEnumMemberName("taxonomy")]
  Taxonomy,

  /// <summary>The worker lost the run's lease before the analyzed target could be persisted.</summary>
  [JsonStringEnumMemberName("leaseLost")]
  LeaseLost,

  /// <summary>The analysis produced results that could not be persisted onto the target aggregate.</summary>
  [JsonStringEnumMemberName("targetPersistence")]
  TargetPersistence,

  /// <summary>The run referenced a target type the pipeline cannot execute.</summary>
  [JsonStringEnumMemberName("unsupportedTarget")]
  UnsupportedTarget,
}
