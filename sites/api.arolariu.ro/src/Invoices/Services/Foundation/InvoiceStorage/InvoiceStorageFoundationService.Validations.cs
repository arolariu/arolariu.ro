namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Common.Validators;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;

using System;

public partial class InvoiceStorageFoundationService
{
	private static void ValidateIdentifierIsSet(Guid? identifier)
	{
		Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(identifier, identifier => identifier is not null, "Identifier not set!");
		Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(identifier, identifier => identifier != Guid.Empty, "Identifier not set!");
		Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(identifier, identifier => identifier != default, "Identifier not set!");
	}

	private static void ValidateInvoiceInformationIsCorrect(Invoice? invoice)
	{
		Validator.ValidateAndThrow<Invoice?, InvoiceDescriptionNotSetException>(invoice, invoice => !string.IsNullOrEmpty(invoice?.Description), "Invoice description not set!");

		// Validate invoice payment information.
		Validator.ValidateAndThrow<Invoice?, InvoicePaymentInformationNotCorrectException>(invoice, invoice => invoice?.PaymentInformation is not null, "Invoice payment information not set!");

		// Validate invoice time information.
		Validator.ValidateAndThrow<Invoice?, InvoiceTimeInformationNotCorrectException>(invoice, invoice => invoice?.PaymentInformation.DateOfPurchase <= DateTimeOffset.Now, "Invoice time information not set!");

		// Validate invoice photo location.
		Validator.ValidateAndThrow<Invoice?, InvoicePhotoLocationNotCorrectException>(invoice, invoice => invoice?.PhotoLocation is not null, "Invoice photo location not set!");

		// TODO: complete all other cases if needed.
	}

	private static void ValidateInvoiceInformationIsValid(Invoice invoice)
	{
		// TODO: complete in the future, if needed.
	}
}
