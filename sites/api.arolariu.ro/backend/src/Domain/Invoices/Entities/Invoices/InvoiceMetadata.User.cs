namespace arolariu.Backend.Core.Domain.Invoices.Entities.Invoices;

public partial record struct InvoiceMetadata
{
    /// <summary>
    /// Is the invoice important for the user?
    /// </summary>
    public required bool IsImportant { get; set; } = false;
}
