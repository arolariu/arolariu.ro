using arolariu.Backend.Core.Domain.General.Extensions;
using arolariu.Backend.Domain.Invoices;

using Microsoft.AspNetCore.Builder;

using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Core;

/// <summary>
/// The entry point for the backend.
/// The backend consists of a .NET 8.0 web application.
/// The backend is deployed as a monolith on Azure.
/// The backend is a containerized application.
/// </summary>
[ExcludeFromCodeCoverage] // This class is not tested.
public static class Program
{
    /// <summary>
    /// The main method.
    /// </summary>
    /// <param name="args">Command-line arguments passed to the application.</param>
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.AddGeneralDomainConfiguration();
        builder.AddInvoicesDomainConfiguration();

        var app = builder.Build();
        app.AddGeneralApplicationConfiguration();
        app.AddGeneralApplicationEndpoints();
        app.AddInvoiceDomainConfiguration();
        app.Run();
    }
}