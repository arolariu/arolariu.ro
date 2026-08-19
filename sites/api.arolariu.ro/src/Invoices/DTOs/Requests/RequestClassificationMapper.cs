namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using Microsoft.AspNetCore.Http;

internal static class RequestClassificationMapper
{
  private const string PlaceholderVersion = "unresolved";
  private const string PlaceholderLabel = "unresolved";

  internal static StandardClassification? ToManualSelection(
    ClassificationSystem? system,
    string? code,
    ClassificationSystem expectedSystem)
  {
    if (system is null && code is null)
    {
      return null;
    }

    if (system is null)
    {
      throw new BadHttpRequestException(
        "Classification system is required when a classification code is supplied.");
    }

    if (string.IsNullOrWhiteSpace(code))
    {
      throw new BadHttpRequestException(
        "Classification code is required when a classification system is supplied.");
    }

    if (system.Value != expectedSystem)
    {
      throw new BadHttpRequestException(
        $"Classification system '{system.Value}' is invalid; expected '{expectedSystem}'.");
    }

    string normalizedCode = code.Trim();
    IReadOnlyList<ClassificationNode> hierarchy =
      [new ClassificationNode(PlaceholderVersion, normalizedCode, PlaceholderLabel)];

    return new StandardClassification(
      system.Value,
      PlaceholderVersion,
      normalizedCode,
      PlaceholderLabel,
      hierarchy,
      ClassificationOrigin.Manual,
      confidence: null,
      evidence: []);
  }
}
