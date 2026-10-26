namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Thrown when a specific analysis capability fails to produce a usable structured section.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class AnalysisCapabilityFailedException : Exception
{
  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisCapabilityFailedException"/> class.
  /// </summary>
  public AnalysisCapabilityFailedException()
    : base("Analysis capability failed.")
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisCapabilityFailedException"/> class for a specific capability failure.
  /// </summary>
  /// <param name="capability">The capability that failed.</param>
  /// <param name="targetType">The target type that the capability was processing.</param>
  /// <param name="failureCode">The stable failure code describing the failure mode.</param>
  public AnalysisCapabilityFailedException(
    AnalysisCapability capability,
    AnalysisTargetType targetType,
    string failureCode)
    : base($"Analysis capability '{capability}' failed for target '{targetType}' with failure code '{failureCode}'.")
  {
    Capability = capability;
    TargetType = targetType;
    FailureCode = failureCode;
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisCapabilityFailedException"/> class with a custom message.
  /// </summary>
  /// <param name="message">The exception message.</param>
  public AnalysisCapabilityFailedException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisCapabilityFailedException"/> class with a custom message and inner exception.
  /// </summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public AnalysisCapabilityFailedException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

#pragma warning disable SYSLIB0051
  private AnalysisCapabilityFailedException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }
#pragma warning restore SYSLIB0051

  /// <summary>
  /// Gets the capability that failed, when supplied.
  /// </summary>
  public AnalysisCapability? Capability { get; }

  /// <summary>
  /// Gets the target type that was being processed, when supplied.
  /// </summary>
  public AnalysisTargetType? TargetType { get; }

  /// <summary>
  /// Gets the stable failure code describing the failure mode, when supplied.
  /// </summary>
  public string? FailureCode { get; }
}
