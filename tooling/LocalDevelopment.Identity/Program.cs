namespace LocalDevelopment.Identity;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

internal static class Program
{
  public static void Main(string[] args)
  {
    WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
    string configPath = builder.Configuration["LOCAL_CONFIG_PATH"]
      ?? throw new InvalidOperationException("LOCAL_CONFIG_PATH is required.");
    string swaggerOrigin = builder.Configuration["LOCAL_SWAGGER_ORIGIN"]
      ?? throw new InvalidOperationException("LOCAL_SWAGGER_ORIGIN is required.");
    LocalIdentityOptions options = LocalIdentityOptions.Load(
      configPath,
      swaggerOrigin);

    string? configuredUrls =
      builder.Configuration[WebHostDefaults.ServerUrlsKey]
      ?? builder.Configuration["ASPNETCORE_URLS"];
    RequireLoopbackBinding(configuredUrls);

    builder.Services.AddCors(cors =>
      cors.AddDefaultPolicy(policy =>
        policy
          .WithOrigins(options.SwaggerOrigin)
          .WithMethods("GET")
          .AllowAnyHeader()));
    builder.Services.AddSingleton(options);
    builder.Services.AddSingleton(TimeProvider.System);
    builder.Services.AddSingleton<DevelopmentTokenFactory>();

    WebApplication app = builder.Build();
    app.UseCors();
    app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));
    app.MapGet(
      "/personas",
      () => DevelopmentPersonaCatalog.All.Select(persona => new
      {
        persona.Key,
        persona.DisplayName,
        persona.Subject,
        persona.UserIdentifier,
        persona.Role,
      }));
    app.MapGet(
      "/personas/{key}/token",
      (string key, DevelopmentTokenFactory factory, HttpResponse response) =>
      {
        response.Headers.CacheControl = "no-store";

        if (!DevelopmentPersonaCatalog.TryGet(
          key,
          out DevelopmentPersona? persona)
          || persona is null)
        {
          return Results.NotFound();
        }

        return Results.Ok(new
        {
          persona = persona.Key,
          token = factory.Create(persona),
        });
      });

    app.Run();
  }

  internal static void RequireLoopbackBinding(string? urls)
  {
    if (string.IsNullOrWhiteSpace(urls))
    {
      throw new InvalidOperationException(
        "Local development identity service requires an explicit loopback binding.");
    }

    foreach (string value in urls.Split(';', StringSplitOptions.RemoveEmptyEntries))
    {
      if (!Uri.TryCreate(value, UriKind.Absolute, out Uri? uri)
          || uri is null
          || !uri.IsLoopback)
      {
        throw new InvalidOperationException(
          "Local development identity service must bind to loopback.");
      }
    }
  }
}
