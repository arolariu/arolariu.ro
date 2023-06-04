using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace arolariu.Frontend.Domain.Extensions
{
    internal static class WebAssemblyHostBuilderExtensions
    {
        internal static WebAssemblyHostBuilder ConfigureServices(this WebAssemblyHostBuilder builder)
        {
            var services = builder.Services;
            services.AddLocalStorageServices();
            return builder;
        }
    }
}
