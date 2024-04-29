namespace arolariu.Backend.Core.Domain.General.Services.Swagger;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi.Models;

using Swashbuckle.AspNetCore.Swagger;
using Swashbuckle.AspNetCore.SwaggerGen;
using Swashbuckle.AspNetCore.SwaggerUI;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Reflection;

/// <summary>
/// Swagger service options and configuration.
/// This class is used to configure the swagger service, and to provide the options for the swagger UI.
/// The swagger UI is available at the following URL: https://api.arolariu.ro/index.html
/// Swagger JSON is available at the following URL: https://api.arolariu.ro/swagger/v1/swagger.json
/// </summary>
[ExcludeFromCodeCoverage] // Infrastructure code is not tested currently.
internal static class SwaggerConfigurationService
{
	/// <summary>
	/// Get the swagger UI options.
	/// This method is used to configure the swagger UI.
	/// </summary>
	/// <returns>An instance of <see cref="SwaggerUIOptions"/>.</returns>
	internal static SwaggerUIOptions GetSwaggerUIOptions()
	{
		var options = new SwaggerUIOptions()
		{
			RoutePrefix = string.Empty,
			DocumentTitle = "AROLARIU.RO Public API",
			ConfigObject = new ConfigObject()
			{
				PersistAuthorization = true,
				DisplayOperationId = true,
				DisplayRequestDuration = true,
			},
		};
		options.ConfigObject.AdditionalItems.Add("syntaxHighlight", "true");
		options.ConfigObject.DefaultModelRendering = ModelRendering.Example;
		options.ConfigObject.DisplayRequestDuration = true;
		options.ConfigObject.ShowCommonExtensions = true;
		options.ConfigObject.ShowExtensions = true;
		options.ConfigObject.DefaultModelsExpandDepth = 2;
		options.ConfigObject.DefaultModelExpandDepth = 2;
		options.ConfigObject.Filter = "true";
		options.SwaggerEndpoint("/swagger/v1/swagger.json", "AROLARIU.RO Public API");
		return options;
	}

	/// <summary>
	/// Get the swagger options.
	/// </summary>
	/// <returns>An instance of <see cref="SwaggerOptions"/>.</returns>
	internal static SwaggerOptions GetSwaggerOptions()
	{
		SwaggerOptions options = new SwaggerOptions();
		return options;
	}

	/// <summary>
	/// Get the swagger generator options.
	/// This method is used to configure the swagger generator.
	/// The swagger generator is used to generate the swagger JSON file.
	/// The swagger JSON file is then used by the swagger UI to display the API documentation.
	/// </summary>
	/// <returns>An instance of <see cref="Action{SwaggerGenOptions}"/>.</returns>
	internal static Action<SwaggerGenOptions> GetSwaggerGenOptions()
	{
		var options = new Action<SwaggerGenOptions>(options =>
		{
			const string welcomeInformaiton = "Welcome to the `api.arolariu.ro` website. This platform servers as a front-facing API web application, designed to allow **YOU**, the reader, possibility to interact and observe how this API works and behaves under certain conditions.\r\n\r\n";
			const string generalInformation = "This API is used by the plethora of services hosted both on the `*.arolariu.ro` domain space, and outside it - be it in desktop applications, mobile applications, or other services. \r\nThe API is public, and can be used by anyone, as long as they follow basic consumption rules (pleae read the Terms of service before using the API).\r\nThis API is maintained by ALEXANDRU-RAZVAN OLARIU, and is an integral part of the <em>arolariu.ro</em> project space.\r\n\r\nThe API is engineered in respects to the ability to adapt and scale horizontally; it also imposes a rate limit on requests, to adopt a fair-share methodology of consumption.\r\n\r\n";
			const string licenseInformation = "<hr/>\r\n\r\n <em>Copyright © 2024 ALEXANDRU-RAZVAN OLARIU</em>\r\n\r\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\r\n\r\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\r\n\r\nTHE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.";

			const string swaggerDocDescription = welcomeInformaiton + generalInformation + licenseInformation;
#pragma warning disable S1075 // URIs should not be hardcoded
			options.SwaggerDoc("v1", new OpenApiInfo()
			{
				Title = "Public API — AROLARIU.RO",
				Version = "v1.0.0",
				Description = swaggerDocDescription,
				Contact = new OpenApiContact()
				{
					Name = "the author, Alexandru-Razvan Olariu.",
					Email = "olariu.alexandru@pm.me"
				},
				TermsOfService = new Uri("https://api.arolariu.ro/terms"),
			});
#pragma warning restore S1075 // URIs should not be hardcoded
			options.EnableAnnotations();
			options.UseInlineDefinitionsForEnums();
			options.DocumentFilter<SwaggerFilterService>();
			options.MapType<IResult>(() => new OpenApiSchema()
			{
				Type = "object",
				Properties = new Dictionary<string, OpenApiSchema>()
				{
					["success"] = new OpenApiSchema()
					{
						Type = "boolean",
						Description = "Indicates whether the operation was successful or not.",
					},
					["message"] = new OpenApiSchema()
					{
						Type = "string",
						Description = "The message associated with the operation.",
					},
					["data"] = new OpenApiSchema()
					{
						Type = "object",
						Description = "The data associated with the operation.",
					},
				},
			});
			options.MapType<ProblemDetails>(() => new OpenApiSchema()
			{
				Type = "object",
				Properties = new Dictionary<string, OpenApiSchema>()
				{
					["type"] = new OpenApiSchema()
					{
						Type = "string",
						Description = "The type of the problem.",
					},
					["title"] = new OpenApiSchema()
					{
						Type = "string",
						Description = "The title of the problem.",
					},
					["status"] = new OpenApiSchema()
					{
						Type = "integer",
						Description = "The status code of the problem.",
					},
					["detail"] = new OpenApiSchema()
					{
						Type = "string",
						Description = "The detail of the problem.",
					},
					["instance"] = new OpenApiSchema()
					{
						Type = "string",
						Description = "The instance of the problem.",
					},
				},
			});

			options.MapType<IEnumerable<KeyValuePair<string, string>>>(() => new OpenApiSchema()
			{
				Type = "array",
				Items = new OpenApiSchema()
				{
					Type = "object",
					Properties = new Dictionary<string, OpenApiSchema>()
					{
						["key"] = new OpenApiSchema()
						{
							Type = "string",
							Description = "The key of the pair.",
						},
						["value"] = new OpenApiSchema()
						{
							Type = "string",
							Description = "The value of the pair.",
						},
					},
				},
			});

			var jwtReferenceObject = new OpenApiReference()
			{
				Id = "Bearer",
				Type = ReferenceType.SecurityScheme,
			};

			options.AddSecurityRequirement(new OpenApiSecurityRequirement()
			{
				{
					new OpenApiSecurityScheme()
					{
						Reference = jwtReferenceObject
					},
					new [] { jwtReferenceObject.Id }
				},
			});

			options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
			{
				Scheme = "Bearer",
				Description = "Most of the endpoints that are currently present on the `api.arolariu.ro` platform may require auth.\n" +
				"Please enter your JWT Bearer Token in the below field, in order to persist it across this request(s) session.",
				Name = "JWT Authorization",
				In = ParameterLocation.Header,
				Type = SecuritySchemeType.Http,
				BearerFormat = "JWT",
				Reference = jwtReferenceObject
			});

			options.UseInlineDefinitionsForEnums();
			var xmlFilename = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
			var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFilename);
			options.IncludeXmlComments(xmlPath);
		});

		return options;
	}
}
