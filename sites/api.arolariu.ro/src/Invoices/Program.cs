using arolariu.Backend.Domain.Invoices.Configuration;

using Microsoft.AspNetCore.Builder;

namespace arolariu.Backend.Domain.Invoices;

public static class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateSlimBuilder(args);
        builder.ConfigureWebApplicationBuilder();

        var app = builder.Build();
        app.ConfigureWebApplication();

        app.Run();
    }
}