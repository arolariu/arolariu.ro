namespace arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// The Invoice DTO class represents the invoice data transfer object.
/// The invoice data transfer object is used to transfer the invoice data from the client to the server.
/// The data is transferred as a JSON object. This object is then deserialized into the Invoice DTO class.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage] // DTOs are not tested - they are used to transfer data between the client and the server.
public readonly record struct CreateInvoiceDto(
	[Required] Guid UserIdentifier,
	[Required] Guid PhotoIdentifier,
	[Required] Uri PhotoLocation,
	IEnumerable<KeyValuePair<string, object>> PhotoMetadata)
{
	/// <summary>
	/// Method used to convert the DTO to an invoice.
	/// </summary>
	/// <returns></returns>
	public Invoice ToInvoice()
	{
		var invoice = new Invoice()
		{
			Id = PhotoIdentifier,
			Category = InvoiceCategory.NOT_DEFINED,
			PaymentInformation = new PaymentInformation(),
			PhotoLocation = PhotoLocation,
			UserIdentifier = UserIdentifier,
			CreatedBy = UserIdentifier,
		};

		return invoice;
	}
}
