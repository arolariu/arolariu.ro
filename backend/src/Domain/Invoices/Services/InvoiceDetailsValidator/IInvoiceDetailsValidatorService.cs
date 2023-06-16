using Azure.AI.FormRecognizer.DocumentAnalysis;

namespace arolariu.Backend.Domain.Invoices.Services.InvoiceDetailsValidator;

/// <summary>
/// Interface that defines the invoice reader validator service contract.
/// </summary>
public interface IInvoiceDetailsValidatorService
{
    /// <summary>
    /// The invoice reader validator service method for validating the receipt's merchant information.
    /// </summary>
    /// <param name="receipt"></param>
    /// <returns></returns>
    public bool ValidateMerchantInformationIsValid(AnalyzedDocument receipt);

    /// <summary>
    /// The invoice reader validator service method for validating the receipt's items information.
    /// </summary>
    /// <param name="receipt"></param>
    /// <returns></returns>
    public bool ValidateItemsInformationIsValid(AnalyzedDocument receipt);

    /// <summary>
    /// The invoice reader validator service method for validating the receipt's time information.
    /// </summary>
    /// <param name="receipt"></param>
    /// <returns></returns>
    public bool ValidateTimeInformationIsValid(AnalyzedDocument receipt);

    /// <summary>
    /// The invoice reader validator service method for validating the receipt's transaction information.
    /// </summary>
    /// <param name="receipt"></param>
    /// <returns></returns>
    public bool ValidateTransactionInformationIsValid(AnalyzedDocument receipt);
}
