using System;

namespace arolariu.Backend.Domain.Invoices.Entities.Products;

/// <summary>
/// Product metadata.
/// </summary>
[Serializable]
public record class ProductMetadata
{
    /// <summary>
    /// Flag indicating if the item has been edited by the user.
    /// </summary>
    public bool IsEdited { get; set; } = false;

    /// <summary>
    /// Flag indicating if the item is "complete".
    /// </summary>
    public bool IsComplete { get; set; } = false;

    /// <summary>
    /// Flag indicating if the item has been soft deleted.
    /// </summary>
    public bool IsSoftDeleted { get; set; } = false;
}
