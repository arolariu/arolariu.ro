namespace arolariu.Backend.Domain.Invoices.Entities.Invoices;

public partial record struct InvoiceMetadata
{
    /// <summary>
    /// Invoice was analyzed by the system flag.
    /// </summary>
    public required bool IsAnalyzed { get; set; } = false;

    /// <summary>
    /// Flag indicating if the invoice was edited by the user.
    /// </summary>
    public required bool IsEdited { get; set; } = false;

    /// <summary>
    /// Flag indicating if the invoice is "complete".
    /// </summary>
    public required bool IsComplete { get; set; } = false;

    /// <summary>
    /// Flag indicating if the invoice is "soft deleted".
    /// </summary>
    public required bool IsSoftDeleted { get; set; } = false;
}
