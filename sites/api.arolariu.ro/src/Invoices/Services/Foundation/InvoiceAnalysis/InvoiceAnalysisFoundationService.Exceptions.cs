using System;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;

public partial class InvoiceAnalysisFoundationService
{
    private delegate Task ReturningAnalysisFunction();

    private static async Task TryCatchAsync(ReturningAnalysisFunction returningAnalysisFunction)
    {
        try
        {
            await returningAnalysisFunction().ConfigureAwait(false);
        }
        catch (Exception exception)
        {
            throw new Exception(message: "test", exception);
        }
    }
}
