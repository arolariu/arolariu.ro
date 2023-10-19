using System;
using System.Collections.Generic;

namespace arolariu.Backend.Domain.Invoices.DTOs;

/// <summary>
/// The Invoice DTO class represents the invoice data transfer object.
/// The invoice data transfer object is used to transfer the invoice data from the client to the server.
/// The data is transferred as a JSON object. This object is then deserialized into the Invoice DTO class.
/// </summary>
[Serializable]
public sealed record class CreateInvoiceDto
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
    public IEnumerable<KeyValuePair<string, string>> AdditionalMetadata { get; set; } = new List<KeyValuePair<string, string>>();
}
