using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.JSInterop;
using System;
using System.Diagnostics;
using System.Globalization;

namespace arolariu.Frontend.Domain.Extensions
{
    internal static class WebAssemblyHostExtensions
    {
        internal static void TrySetDefaultCulture(this WebAssemblyHost host)
        {
            try
            {
                var localStorage = host.Services.GetRequiredService<ILocalStorageService>();
                var clientCulture = localStorage.GetItem<string>("client-culture-preference");
                clientCulture ??= "en-US";

                CultureInfo culture = new(clientCulture);
                CultureInfo.DefaultThreadCurrentCulture = culture;
                CultureInfo.DefaultThreadCurrentUICulture = culture;
            }
            catch (Exception ex) when (Debugger.IsAttached)
            {
                _ = ex;
                Debugger.Break();
            }
        }
    }
}
