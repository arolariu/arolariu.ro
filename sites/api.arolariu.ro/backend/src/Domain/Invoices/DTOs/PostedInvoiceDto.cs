using System;
using System.Collections.Generic;

namespace arolariu.Backend.Core.Domain.Invoices.DTOs;

/// <summary>
/// The posted invoice DTO, this is the invoice that is posted to the database.
/// </summary>
[Serializable]
public class PostedInvoiceDto
{
    /// <summary>
    /// The invoice base 64 photo.
    /// E.g. : data:image/jpeg;base64,/9.........
    /// </summary>
    public required string InvoiceBase64Photo { get; set; } = string.Empty;

    /// <summary>
    /// Additional invoice metadata to be processed.
    /// The metadata will be stored in the database as a JSON field.
    /// </summary>
    public IDictionary<string, object> AdditionalMetadata { get; set; } = new Dictionary<string, object>();
}
