using Microsoft.AspNetCore.Builder;

using System;

namespace arolariu.Backend.Core.Auth.Modules;

/// <summary>
/// Extension methods for <see cref="WebApplication"/>.
/// </summary>
public static class WebApplicationExtensions
{
    /// <summary>
    /// Configures the application to use authentication and authorization.
    /// </summary>
    /// <param name="app"></param>
    public static void UseAuthServices(this WebApplication app)
    {
        ArgumentNullException.ThrowIfNull(app);
        app.UseAuthN();
        app.UseAuthZ();
    }

    /// <summary>
    /// Configures the application to use authentication.
    /// </summary>
    /// <param name="app"></param>
    private static void UseAuthN(this WebApplication app)
    {
        app.UseAuthentication();
    }

    /// <summary>
    /// Configures the application to use authorization.
    /// </summary>
    /// <param name="app"></param>
    private static void UseAuthZ(this WebApplication app)
    {
        app.UseAuthorization();
    }
}
