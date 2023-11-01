using System;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// The merchant information record contains basic information about the merchant.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage] // records are not tested - they are used to represent the data in the application domain.
public record struct MerchantInformation(string Name, string Address, string PhoneNumber);
