namespace arolariu.Backend.Domain.Invoices.DTOs.Analysis;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Represents the acknowledgement returned when Azure Storage Queue accepts an analysis message.
/// </summary>
/// <param name="MessageId">Azure Queue's provider message identifier.</param>
/// <param name="TargetType">The kind of aggregate the message analyzes.</param>
/// <param name="TargetId">The identifier of the aggregate the message analyzes.</param>
[Serializable]
public readonly record struct AnalysisAcceptedResponseDto(
  string MessageId,
  AnalysisTargetType TargetType,
  Guid TargetId);
