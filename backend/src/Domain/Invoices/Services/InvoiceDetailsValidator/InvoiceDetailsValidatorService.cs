using Azure.AI.FormRecognizer.DocumentAnalysis;

namespace arolariu.Backend.Domain.Invoices.Services.InvoiceDetailsValidator
{
    /// <summary>
    /// Class that handles the invoice OCR'd details validation.
    /// </summary>
    public class InvoiceDetailsValidatorService : IInvoiceDetailsValidatorService
    {
        /// <inheritdoc/>
        public bool ValidateItemsInformationIsValid(AnalyzedDocument receipt)
        {
            var itemsCondition =
                receipt.Fields.TryGetValue("Items", out var itemsField)
                && itemsField.FieldType == DocumentFieldType.List;

            return itemsCondition;
        }

        /// <inheritdoc/>
        public bool ValidateMerchantInformationIsValid(AnalyzedDocument receipt)
        {
            var merchantAddressCondition = 
                receipt.Fields.TryGetValue("MerchantAddress", out var merchantAddressField)
                && merchantAddressField.FieldType == DocumentFieldType.String;

            var merchantNameCondition = 
                receipt.Fields.TryGetValue("MerchantName", out var merchantNameField)
                && merchantNameField.FieldType == DocumentFieldType.String;

            var merchantPhoneNumberCondition =
                receipt.Fields.TryGetValue("MerchantPhoneNumber", out var merchantPhoneNumberField)
                && merchantPhoneNumberField.FieldType == DocumentFieldType.PhoneNumber;

            return merchantAddressCondition && merchantNameCondition && merchantPhoneNumberCondition;
        }

        /// <inheritdoc/>
        public bool ValidateTimeInformationIsValid(AnalyzedDocument receipt)
        {
            var transactionDateCondition =
                receipt.Fields.TryGetValue("TransactionDate", out var transactionDateField)
                && transactionDateField.FieldType == DocumentFieldType.Date;

            var transactionTimeCondition =
                receipt.Fields.TryGetValue("TransactionTime", out var transactionTimeField)
                && transactionTimeField.FieldType == DocumentFieldType.Time;

            return transactionDateCondition && transactionTimeCondition;
        }

        /// <inheritdoc/>
        public bool ValidateTransactionInformationIsValid(AnalyzedDocument receipt)
        {
            var transactionTotalCondition =
                receipt.Fields.TryGetValue("Total", out var transactionTotalField)
                && transactionTotalField.FieldType == DocumentFieldType.Double;

            return transactionTotalCondition;
        }
    }
}
