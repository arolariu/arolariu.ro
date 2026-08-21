namespace arolariu.Backend.Core.Domain.General.Services.Swagger;

using System;
using System.Text.Json;

using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

/// <summary>
/// Describes whether the local Swagger persona bridge is enabled.
/// </summary>
/// <param name="Enabled">Whether the persona selector may be served.</param>
/// <param name="IdentityEndpoint">The loopback identity endpoint when enabled.</param>
internal sealed record LocalDevelopmentSwaggerOptions(
  bool Enabled,
  Uri? IdentityEndpoint)
{
  internal static LocalDevelopmentSwaggerOptions Disabled { get; } =
    new(false, IdentityEndpoint: null);
}

/// <summary>
/// Resolves and renders the development-only Swagger persona bridge.
/// </summary>
internal static class LocalDevelopmentSwagger
{
  /// <summary>
  /// Resolves local persona controls only when every production-safety gate passes.
  /// </summary>
  /// <param name="environment">The current hosting environment.</param>
  /// <param name="configuration">The application configuration.</param>
  /// <returns>The resolved local Swagger options.</returns>
  internal static LocalDevelopmentSwaggerOptions Resolve(
    IWebHostEnvironment environment,
    IConfiguration configuration)
  {
    ArgumentNullException.ThrowIfNull(environment);
    ArgumentNullException.ThrowIfNull(configuration);

    if (!environment.IsDevelopment()
        || !string.Equals(
          configuration["INFRA"],
          "local",
          StringComparison.Ordinal)
        || !string.IsNullOrWhiteSpace(configuration["AZURE_CLIENT_ID"])
        || !Uri.TryCreate(
          configuration["LOCAL_DEVELOPMENT_IDENTITY_URL"],
          UriKind.Absolute,
          out Uri? identityEndpoint)
        || identityEndpoint is null
        || !identityEndpoint.IsLoopback)
    {
      return LocalDevelopmentSwaggerOptions.Disabled;
    }

    return new(true, identityEndpoint);
  }

  /// <summary>
  /// Creates the API content security policy, allowing the local identity origin
  /// only when the development-only bridge is enabled.
  /// </summary>
  /// <param name="identityEndpoint">
  /// The gated loopback identity endpoint, or <see langword="null"/>.
  /// </param>
  /// <returns>The complete content security policy.</returns>
  internal static string CreateContentSecurityPolicy(Uri? identityEndpoint)
  {
    string connectSources = "'self'";

    if (identityEndpoint is not null)
    {
      if (!identityEndpoint.IsLoopback)
      {
        throw new ArgumentException(
          "Local Swagger identity endpoint must be loopback.",
          nameof(identityEndpoint));
      }

      connectSources +=
        $" {identityEndpoint.GetLeftPart(UriPartial.Authority)}";
    }

    return
      "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self'; " +
      $"connect-src {connectSources}; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'";
  }

  /// <summary>
  /// Creates the browser script that selects a local persona and preauthorizes
  /// Swagger's existing Bearer security scheme.
  /// </summary>
  /// <param name="identityEndpoint">The loopback identity service endpoint.</param>
  /// <returns>The JavaScript source served only in local Development.</returns>
  internal static string CreateScript(Uri identityEndpoint)
  {
    ArgumentNullException.ThrowIfNull(identityEndpoint);

    if (!identityEndpoint.IsLoopback)
    {
      throw new ArgumentException(
        "Local Swagger identity endpoint must be loopback.",
        nameof(identityEndpoint));
    }

    string baseUrl = JsonSerializer.Serialize(
      identityEndpoint.ToString().TrimEnd('/'));

    return $$"""
      (() => {
        "use strict";
        const identityBaseUrl = {{baseUrl}};

        const waitForSwagger = async () => {
          for (let attempt = 0; attempt < 100; attempt += 1) {
            const authWrapper = document.querySelector(".auth-wrapper");
            if (window.ui && authWrapper) {
              return authWrapper;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          return null;
        };

        const setStatus = (container, text, isError = false) => {
          const status = container.querySelector("[data-local-persona-status]");
          if (!status) return;
          status.textContent = text;
          status.style.color = isError ? "#b42318" : "#344054";
        };

        const initialize = async () => {
          const authWrapper = await waitForSwagger();
          if (!authWrapper || document.querySelector("[data-local-personas]")) return;

          const container = document.createElement("div");
          container.dataset.localPersonas = "true";
          container.style.display = "inline-flex";
          container.style.alignItems = "center";
          container.style.gap = "8px";
          container.style.marginRight = "12px";

          const status = document.createElement("span");
          status.dataset.localPersonaStatus = "true";
          status.textContent = "Development persona";
          container.appendChild(status);

          try {
            const personasResponse = await fetch(`${identityBaseUrl}/personas`, {
              cache: "no-store"
            });
            if (!personasResponse.ok) throw new Error("persona-list");
            const personas = await personasResponse.json();

            for (const persona of personas) {
              const button = document.createElement("button");
              button.type = "button";
              button.textContent = persona.displayName;
              button.className = "btn authorize unlocked";
              button.addEventListener("click", async () => {
                try {
                  setStatus(container, `Authorizing ${persona.displayName}...`);
                  const tokenResponse = await fetch(
                    `${identityBaseUrl}/personas/${encodeURIComponent(persona.key)}/token`,
                    { cache: "no-store" });
                  if (!tokenResponse.ok) throw new Error("persona-token");
                  const payload = await tokenResponse.json();
                  window.ui.preauthorizeApiKey("Bearer", payload.token);
                  setStatus(container, `Active: ${persona.displayName}`);
                } catch {
                  setStatus(container, "Persona authorization failed", true);
                }
              });
              container.appendChild(button);
            }
          } catch {
            setStatus(container, "Development personas unavailable", true);
          }

          authWrapper.prepend(container);
        };

        void initialize();
      })();
      """;
  }
}
