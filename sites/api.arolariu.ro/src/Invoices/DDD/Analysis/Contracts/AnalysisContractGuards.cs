namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

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
