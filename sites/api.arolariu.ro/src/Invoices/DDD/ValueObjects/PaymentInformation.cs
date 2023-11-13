using System;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.DDD.Contracts;

/// <summary>
/// To complete
/// </summary>
/// <param name="DateOfPurchase"></param>
/// <param name="Currency"></param>
/// <param name="TotalAmount"></param>
/// <param name="TotalTax"></param>
[ExcludeFromCodeCoverage]
public record struct PaymentInformation(
    DateTimeOffset DateOfPurchase,
    Currency Currency,
    decimal TotalAmount,
    decimal TotalTax);
