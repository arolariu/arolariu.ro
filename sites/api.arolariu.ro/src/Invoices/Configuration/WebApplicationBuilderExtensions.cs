using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;

namespace arolariu.Backend.Domain.Invoices.Configuration;

public static partial class WebApplicationBuilderExtensions
{
    public static WebApplicationBuilder ConfigureWebApplicationBuilder(this WebApplicationBuilder builder)
    {
        builder.AddAuthN();
        builder.AddAuthZ();

        builder.AddLogging();
        builder.AddMetering();

        builder.AddSwagger();
        builder.AddKestrel();

        return builder;
    }
}
