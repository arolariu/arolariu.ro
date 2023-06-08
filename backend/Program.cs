using arolariu.Backend.Domain.General.Extensions;
using arolariu.Backend.Domain.Invoices.Endpoints;
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

namespace arolariu.Backend
{
    /// <summary>
    /// The main backend program.cs file.
    /// The backend consists of a .NET 7.0 web application.
    /// The backend is deployed as a monolith on Azure.
    /// The backend is a containerized application.
    /// </summary>
    public static class Program
    {
        /// <summary>
        /// The main method.
        /// </summary>
        /// <param name="args"></param>
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);
            builder.AddGeneralDomainConfiguration();
            builder.AddInvoicesDomainConfiguration();

            var app = builder.Build();
            app.AddGeneralApplicationConfiguration();
            app.AddGeneralApplicationEndpoints();
            app.MapInvoiceEndpoints();
            app.Run();
        }
    }
}