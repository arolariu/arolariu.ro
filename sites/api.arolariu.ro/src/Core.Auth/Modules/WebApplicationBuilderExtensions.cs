using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.VisualBasic;

using System;
using System.Text;

namespace arolariu.Backend.Core.Auth.Modules;

/// <summary>
/// Extension methods for the <see cref="WebApplicationBuilder"/> builder.
/// </summary>
public static class WebApplicationBuilderExtensions
{
    /// <summary>
    /// Configure authentication and authorization services.
    /// </summary>
    /// <param name="builder"></param>
    public static void AddAuthServices(this WebApplicationBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        builder.AddAuthN();
        builder.AddAuthZ();
    }

    /// <summary>
    /// Configure authentication services.
    /// </summary>
    /// <param name="builder"></param>
    private static void AddAuthN(this WebApplicationBuilder builder)
    {
        var jwtAudience = builder.Configuration["JWT:Audience"]!;
        var jwtIssuer = builder.Configuration["JWT:Issuer"]!;
        var jwtSecret = builder.Configuration["JWT:Secret"]!;

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));

        builder.Services
        .AddAuthentication(authOptions =>
        {
            authOptions.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            authOptions.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            authOptions.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(jwtOptions =>
        {
            jwtOptions.TokenValidationParameters = new()
            {
                ValidIssuer = jwtIssuer,
                ValidAudience = jwtAudience,
                IssuerSigningKey = signingKey,
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
            };
        });
    }

    /// <summary>
    /// Configure authorization services.
    /// </summary>
    /// <param name="builder"></param>
    private static void AddAuthZ(this WebApplicationBuilder builder)
    {
        builder.Services.AddAuthorization();
    }
}
