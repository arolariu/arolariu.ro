using System;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

/// <summary>
/// To complete
/// </summary>
/// <param name="Currency"></param>
/// <param name="TotalAmount"></param>
/// <param name="TotalTax"></param>
[Serializable]
[ExcludeFromCodeCoverage]
public record struct PaymentInformation(Currency Currency, decimal TotalAmount, decimal TotalTax);
