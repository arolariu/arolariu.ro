using Azure.Identity;
using ContainerBackend.Domain.General.Services;
using ContainerBackend.Domain.General.Services.KeyVault;
using ContainerBackend.Domain.Invoices.Endpoints;
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Configuration;
using System;

namespace ContainerBackend
{
    /// <summary>
    /// The main backend program.cs file.
    /// The backend consists of a .NET 8.0 web application.
    /// The backend is a containerized application.
    /// The backend is deployed as a monolith.
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
            builder.AddGeneralDomainConfiguration();   // Add general domain configuration
            //builder.AddInvoicesDomainConfiguration();  // Add invoices domain configuration
            
            var app = builder.Build();
            app.AddGeneralApplicationConfiguration();
            app.MapInvoiceEndpoints();
            app.MapHealthChecks("/health", new HealthCheckOptions
            {
                ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
            });
            app.Run();
        }
    }
}