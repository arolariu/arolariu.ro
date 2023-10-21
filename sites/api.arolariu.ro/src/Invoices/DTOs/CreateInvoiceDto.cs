using Microsoft.AspNetCore.Http;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.DTOs;

/// <summary>
/// The Invoice DTO class represents the invoice data transfer object.
/// The invoice data transfer object is used to transfer the invoice data from the client to the server.
/// The data is transferred as a JSON object. This object is then deserialized into the Invoice DTO class.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage] // DTOs are not tested - they are used to transfer data between the client and the server.
public record struct CreateInvoiceDto(
    IFormFile InvoicePhoto,
    IEnumerable<KeyValuePair<string, string>> AdditionalMetadata);
