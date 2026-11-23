namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using System;

/// <summary>Distinguishes a merchant details edit from explicit category assignment or clearing.</summary>
[Flags]
public enum MerchantUpdateFields
{
  /// <summary>No fields supplied.</summary>
  None = 0,

  /// <summary>Update the existing client-editable detail fields.</summary>
  Details = 1,

  /// <summary>Assign or clear the category.</summary>
  Category = 2,
}
