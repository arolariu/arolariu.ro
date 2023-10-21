﻿using System;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.Entities.Invoices;

/// <summary>
/// The invoice time information.
/// </summary>
/// <param name="CreatedAt"></param>
/// <param name="LastUpdatedAt"></param>
/// <param name="DateOfPurchase"></param>
/// <param name="DateOfAnalysis"></param>
[Serializable]
[ExcludeFromCodeCoverage]
public record struct InvoiceTimeInformation(
    DateTimeOffset CreatedAt,
    DateTimeOffset LastUpdatedAt,
    DateTimeOffset DateOfPurchase,
    DateTimeOffset DateOfAnalysis);
