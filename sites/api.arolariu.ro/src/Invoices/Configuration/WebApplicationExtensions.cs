using Microsoft.AspNetCore.Builder;

namespace arolariu.Backend.Domain.Invoices.Configuration;

public static partial class WebApplicationExtensions
{
    public static WebApplication ConfigureWebApplication(this WebApplication app)
    {
        app.UseAuthN();
        app.UseAuthZ();

        app.UseLogging();
        app.UseMetering();

        app.UseSwagger();
        app.UseKestrel();
        return app;
    }
}
