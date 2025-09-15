namespace arolariu.Backend.Core.Auth.Modules;

using System;
using System.Collections.Generic;
using System.Text;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Core.Auth.Brokers;
using arolariu.Backend.Core.Auth.Models;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

/// <summary>
/// Provides extension methods for configuring comprehensive authentication and authorization services.
/// This class sets up ASP.NET Core Identity with JWT Bearer token authentication and Entity Framework integration.
/// </summary>
/// <remarks>
/// This module configures a complete authentication system including:
/// - Entity Framework database context with retry policies
/// - ASP.NET Core Identity with secure password requirements
/// - JWT Bearer token authentication with configurable validation
/// - Cookie-based authentication for web scenarios
/// - Authorization policies and role-based access control
/// </remarks>
/// <example>
/// <code>
/// // Usage in Program.cs
/// var builder = WebApplication.CreateBuilder(args);
/// builder.AddAuthServices();
/// </code>
/// </example>
public static class WebApplicationBuilderExtensions
{
	/// <summary>
	/// Configures comprehensive authentication and authorization services including Identity, JWT, and database integration.
	/// This method establishes a complete authentication infrastructure with security best practices.
	/// </summary>
	/// <param name="builder">The <see cref="WebApplicationBuilder"/> to configure with authentication services.</param>
	/// <remarks>
	/// This method configures:
	/// - Entity Framework database context with SQL Server and retry policies
	/// - ASP.NET Core Identity with strict password and lockout requirements
	/// - JWT Bearer authentication with token validation parameters
	/// - Secure cookie configuration for web-based authentication
	/// - Authorization services for role and policy-based access control
	/// </remarks>
	/// <exception cref="ArgumentNullException">
	/// Thrown when <paramref name="builder"/> is null.
	/// </exception>
	public static void AddAuthServices(this WebApplicationBuilder builder)
	{
		ArgumentNullException.ThrowIfNull(builder);
		var configuration = builder.Configuration;
		var services = builder.Services;

		services.AddDbContext<AuthDbContext>(options =>
		{
			using ServiceProvider optionsManager = builder.Services.BuildServiceProvider();
			string connectionString = new string(optionsManager
										.GetRequiredService<IOptionsManager>()
										.GetApplicationOptions()
										.SqlConnectionString);

			options.UseSqlServer(connectionString, sqlServerOptions =>
			{
				sqlServerOptions.EnableRetryOnFailure(
					maxRetryCount: 5,
					maxRetryDelay: TimeSpan.FromSeconds(30),
					errorNumbersToAdd: null);
			});
			options.UseLazyLoadingProxies();
		});

		// Configure identity services.
		services.Configure<IdentityOptions>(options =>
		{
			// Password settings.
			options.Password.RequireNonAlphanumeric = true;
			options.Password.RequiredLength = 16;
			options.Password.RequireDigit = true;
			options.Password.RequireLowercase = true;
			options.Password.RequireUppercase = true;

			// Lockout settings.
			options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
			options.Lockout.MaxFailedAccessAttempts = 5;
			options.Lockout.AllowedForNewUsers = true;

			// User settings.
			options.User.RequireUniqueEmail = true;
		});
		services.AddIdentityApiEndpoints<AuthenticatedUser>(
			options => options.SignIn.RequireConfirmedEmail = true)
			.AddEntityFrameworkStores<AuthDbContext>();

		// Configure cookie settings.
		services.ConfigureApplicationCookie(options =>
		{
			// Cookie settings.
			options.Cookie.HttpOnly = true;
			options.Cookie.Domain = "https://api.arolariu.ro";
			options.Cookie.SecurePolicy = Microsoft.AspNetCore.Http.CookieSecurePolicy.Always;
			options.Cookie.SameSite = Microsoft.AspNetCore.Http.SameSiteMode.None;
			options.Cookie.Name = "auth-arolariu-ro";

			options.SlidingExpiration = true;
			options.ExpireTimeSpan = TimeSpan.FromMinutes(30);
		});

		services.AddAuthentication(authOptions =>
		{
			authOptions.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
			authOptions.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
			authOptions.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
		}).AddJwtBearer(jwtOptions =>
		{
			using ServiceProvider optionsManager = builder.Services.BuildServiceProvider();
			var authOptions = new Dictionary<string, string>
			{
				{ "Secret", optionsManager.GetRequiredService<IOptionsManager>().GetApplicationOptions().JwtSecret },
				{ "Issuer", optionsManager.GetRequiredService<IOptionsManager>().GetApplicationOptions().JwtIssuer },
				{ "Audience", optionsManager.GetRequiredService<IOptionsManager>().GetApplicationOptions().JwtAudience },
			};

			jwtOptions.TokenValidationParameters = new()
			{
				ValidIssuer = authOptions["Issuer"],
				ValidAudience = authOptions["Audience"],
				IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(authOptions["Secret"])),
				ValidateIssuer = true,
				ValidateAudience = true,
				ValidateLifetime = true,
				ValidateIssuerSigningKey = true,
			};
		});
		services.AddAuthorization();
	}
}
