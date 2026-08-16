namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Represents the success or failure outcome for an individual analysis capability section.
/// </summary>
/// <typeparam name="T">
/// The structured section payload produced by the capability.
/// Successful outcomes carry a non-null value; failed outcomes carry a failure code instead.
/// </typeparam>
[SuppressMessage(
  "Design",
  "CA1000:Do not declare static members on generic types",
  Justification = "Task 3 requires named factory methods on the generic analysis capability outcome contract.")]
public sealed record CapabilityOutcome<T>
{
  /// <summary>
  /// Initializes a new instance of the <see cref="CapabilityOutcome{T}"/> record.
  /// </summary>
  /// <param name="succeeded">
  /// <see langword="true"/> when the capability produced a usable value; otherwise <see langword="false"/>.
  /// </param>
  /// <param name="value">
  /// The structured capability output. Must be non-null when <paramref name="succeeded"/> is <see langword="true"/>.
  /// Must be null when <paramref name="succeeded"/> is <see langword="false"/>.
  /// </param>
  /// <param name="failureCode">
  /// A stable failure code explaining why the capability section is unavailable.
  /// Must be null when <paramref name="succeeded"/> is <see langword="true"/> and non-empty when
  /// <paramref name="succeeded"/> is <see langword="false"/>.
  /// </param>
  /// <exception cref="ArgumentException">
  /// Thrown when the success flag contradicts the supplied <paramref name="value"/> or <paramref name="failureCode"/>.
  /// </exception>
  public CapabilityOutcome(bool succeeded, T? value, string? failureCode)
  {
    if (succeeded)
    {
      ArgumentNullException.ThrowIfNull(value);

      if (failureCode is not null)
      {
        throw new ArgumentException("Successful capability outcomes must not include a failure code.", nameof(failureCode));
      }
    }
    else
    {
      if (value is not null)
      {
        throw new ArgumentException("Failed capability outcomes must not include a value.", nameof(value));
      }

      failureCode = AnalysisContractGuards.RequireText(failureCode!, nameof(failureCode));
    }

    Succeeded = succeeded;
    Value = value;
    FailureCode = failureCode;
  }

  /// <summary>
  /// Gets a value indicating whether the capability completed successfully.
  /// </summary>
  public bool Succeeded { get; }

  /// <summary>
  /// Gets the structured capability result when <see cref="Succeeded"/> is <see langword="true"/>.
  /// </summary>
  public T? Value { get; }

  /// <summary>
  /// Gets the stable failure code when <see cref="Succeeded"/> is <see langword="false"/>.
  /// </summary>
  public string? FailureCode { get; }

  /// <summary>
  /// Creates a successful capability outcome.
  /// </summary>
  /// <param name="value">The structured value produced by the capability.</param>
  /// <returns>A successful capability outcome containing <paramref name="value"/>.</returns>
  public static CapabilityOutcome<T> Success(T value) =>
    new(succeeded: true, value, failureCode: null);

  /// <summary>
  /// Creates a failed capability outcome.
  /// </summary>
  /// <param name="failureCode">The stable failure code explaining why the capability section is unavailable.</param>
  /// <returns>A failed capability outcome containing <paramref name="failureCode"/>.</returns>
  public static CapabilityOutcome<T> Failure(string failureCode) =>
    new(succeeded: false, value: default, failureCode);
}

internal static class AnalysisContractGuards
{
  internal static string RequireText(string value, string parameterName)
  {
    ArgumentNullException.ThrowIfNull(value);

    if (string.IsNullOrWhiteSpace(value))
    {
      throw new ArgumentException("Value must not be empty or whitespace.", parameterName);
    }

    return value.Trim();
  }

  internal static string? NormalizeOptionalText(string? value) =>
    string.IsNullOrWhiteSpace(value) ? null : value.Trim();

  internal static Guid RequireNonDefault(Guid value, string parameterName)
  {
    if (value == Guid.Empty)
    {
      throw new ArgumentException("Value must not be an empty GUID.", parameterName);
    }

    return value;
  }

  internal static int RequireNonNegative(int value, string parameterName)
  {
    if (value < 0)
    {
      throw new ArgumentOutOfRangeException(parameterName, value, "Value must be greater than or equal to zero.");
    }

    return value;
  }

  internal static int RequirePositive(int value, string parameterName)
  {
    if (value <= 0)
    {
      throw new ArgumentOutOfRangeException(parameterName, value, "Value must be greater than zero.");
    }

    return value;
  }

  internal static double RequireConfidence(double value, string parameterName)
  {
    if (double.IsNaN(value) || double.IsInfinity(value) || value < 0 || value > 1)
    {
      throw new ArgumentOutOfRangeException(parameterName, value, "Confidence must be in the inclusive range [0, 1].");
    }

    return value;
  }

  internal static IReadOnlyList<TItem> Snapshot<TItem>(IReadOnlyList<TItem> items, string parameterName)
  {
    ArgumentNullException.ThrowIfNull(items);

    var snapshot = new TItem[items.Count];

    for (int index = 0; index < items.Count; index++)
    {
      TItem item = items[index];

      if (item is null)
      {
        throw new ArgumentException("Collection items must not be null.", parameterName);
      }

      snapshot[index] = item;
    }

    return new ReadOnlyCollection<TItem>(snapshot);
  }
}
