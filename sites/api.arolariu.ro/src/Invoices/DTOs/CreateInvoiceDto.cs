namespace arolariu.Backend.Domain.Invoices.DTOs;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

/// <summary>
/// The Invoice DTO class represents the invoice data transfer object.
/// The invoice data transfer object is used to transfer the invoice data from the client to the server.
/// The data is transferred as a JSON object. This object is then deserialized into the Invoice DTO class.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage] // DTOs are not tested - they are used to transfer data between the client and the server.
public readonly record struct CreateInvoiceDto(
	[Required] Guid UserIdentifier,
	Uri? ScanLocation,
	IDictionary<string, object>? Metadata)
{
	/// <summary>
	/// Method used to convert the DTO to an invoice.
	/// </summary>
	/// <returns></returns>
	public Invoice ToInvoice()
	{
		Invoice invoice = new Invoice()
		{
			id = Guid.CreateVersion7(),
			UserIdentifier = UserIdentifier,
			Category = InvoiceCategory.NOT_DEFINED,
			ScanLocation = ScanLocation ?? new Uri("https://arolariu.ro"),
			CreatedBy = UserIdentifier,
		};

		if (Metadata is not null)
		{
			foreach (var (key, value) in Metadata)
			{
				string valueAsString = value.ToString() ?? "";
				invoice.AdditionalMetadata.Add(key, valueAsString);
			}
		}

		return invoice;
	}
}
