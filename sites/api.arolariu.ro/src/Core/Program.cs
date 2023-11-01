using arolariu.Backend.Core.Domain.General.Extensions;
using Microsoft.AspNetCore.Builder;

namespace arolariu.Backend.Core;

/// <summary>
/// The entry point for the backend.
/// The backend consists of a .NET 7.0 web application.
/// The backend is deployed as a monolith on Azure.
/// The backend is a containerized application.
/// </summary>
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
        app.Run();
    }
}