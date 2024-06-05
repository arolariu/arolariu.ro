namespace arolariu.Backend.Core.Auth.Modules;
using System;
using System.Text;

using arolariu.Backend.Core.Auth.Brokers;
using arolariu.Backend.Core.Auth.Models;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

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

		var configuration = builder.Configuration;
		var services = builder.Services;

		services.AddDbContext<AuthDbContext>(options =>
		{
			options.UseSqlServer(configuration["AzureOptions:SqlConnectionString"]);
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

		// Configure the SMTP email sender.
		services.AddTransient<IEmailSender, AuthEmailSender>();

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
			var authConfig = builder.Configuration.GetSection("AuthOptions");
			jwtOptions.TokenValidationParameters = new()
			{
				ValidIssuer = authConfig["Issuer"],
				ValidAudience = authConfig["Audience"],
				IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(authConfig["Secret"]!)),
				ValidateIssuer = true,
				ValidateAudience = true,
				ValidateLifetime = true,
				ValidateIssuerSigningKey = true,
			};
		});
		services.AddAuthorization();
	}
}
