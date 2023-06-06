﻿using arolariu.Backend.Domain.General.Services.Swagger;
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Mvc;
using System;

namespace arolariu.Backend.Domain.General.Extensions
{
    internal static class WebApplicationExtensions
    {
        /// <summary>
        /// The application DI service injection method.
        /// </summary>
        /// <param name="app"></param>
        /// <returns><see cref="IApplicationBuilder"/> application builder object.</returns>
        internal static IApplicationBuilder AddGeneralApplicationConfiguration(this WebApplication app)
        {
            ArgumentNullException.ThrowIfNull(app);
            app.UseStaticFiles();
            app.UseAuthorization();
            app.UseHttpsRedirection();
            app.UseRequestLocalization();
            app.UseCors("AllowAllOrigins");
            app.UseSwagger(SwaggerConfigurationService.GetSwaggerOptions());
            app.UseSwaggerUI(SwaggerConfigurationService.GetSwaggerUIOptions());
            return app;
        }

        /// <summary>
        /// Add general application endpoints such as `/health` and `/terms`.
        /// </summary>
        /// <param name="app"></param>
        /// <returns></returns>
        internal static IApplicationBuilder AddGeneralApplicationEndpoints(this WebApplication app)
        {
            app
                .MapHealthChecks("/health", new HealthCheckOptions { ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse });

            app
                .MapGet("/terms", () =>
                "Terms and Conditions for Public API Usage\r\n\r\nThese Terms and Conditions (\"Agreement\") govern your use of the public application programming interface (\"API\") provided by Alexandru Razvan Olariu (\"AROLARIU\") and its affiliated entities. By accessing or using AROLARIU's API, you agree to be bound by this Agreement. If you do not agree to these terms, please do not use the API.\r\n\r\nAPI Usage\r\n1.1 Permitted Use: The API is provided to enable developers and authorized users (\"Users\") to interact with and integrate AROLARIU's services and data into their applications or websites (\"Applications\") in accordance with AROLARIU's guidelines and documentation.\r\n\r\n1.2 Account Creation: In order to access and use the API, Users may be required to create an account and obtain an API key or other credentials from AROLARIU. Users are responsible for maintaining the security of their account information and ensuring that their API keys are used only in accordance with this Agreement.\r\n\r\nIntellectual Property\r\n2.1 Ownership: AROLARIU retains all right, title, and interest in and to the API, including all intellectual property rights. This Agreement does not grant you any ownership or intellectual property rights in the API or any AROLARIU trademarks or logos.\r\n\r\n2.2 License Grant: Subject to your compliance with this Agreement, AROLARIU grants you a limited, non-exclusive, non-transferable, revocable license to access and use the API solely for the purpose of developing and integrating your Applications with AROLARIU's services.\r\n\r\n2.3 Restrictions: You shall not (a) copy, modify, or distribute the API or any part thereof; (b) reverse engineer, decompile, or disassemble the API; (c) create derivative works based on the API; (d) remove or alter any copyright, trademark, or proprietary notices; or (e) use the API in a manner that violates any law or regulation.\r\n\r\nData and Privacy\r\n3.1 Data Collection: AROLARIU may collect and process data transmitted through the API for the purpose of providing and improving its services. By using the API, you acknowledge and agree to AROLARIU's data collection and processing practices as described in its Privacy Policy.\r\n\r\n3.2 User Data: If your Application collects, transmits, or stores personal data of end-users, you are solely responsible for obtaining any necessary consents or permissions and complying with applicable data protection laws and regulations.\r\n\r\nIndemnification\r\nYou agree to indemnify, defend, and hold AROLARIU and its affiliates, officers, directors, employees, and agents harmless from any claims, damages, liabilities, costs, or expenses arising out of or related to your use of the API, violation of this Agreement, or infringement of any third-party rights.\r\n\r\nDisclaimer of Warranty\r\nThe API is provided on an \"as-is\" and \"as available\" basis, without warranties of any kind, either expressed or implied. AROLARIU disclaims all warranties, including but not limited to, merchantability, fitness for a particular purpose, and non-infringement.\r\n\r\nLimitation of Liability\r\nTo the extent permitted by applicable law, in no event shall Alexandru-Razvan Olariu be liable for any indirect, consequential, incidental, punitive, or special damages arising out of or in connection with the AROLARIU API, even if advised of the possibility of such damages.\r\n\r\nTermination\r\nAROLARIU reserves the right to suspend or terminate your access to the API at any time, with or without cause or notice. Upon termination, all licenses and rights granted under this Agreement will immediately cease.\r\n\r\nMiscellaneous\r\n8.1 Governing Law: This Agreement shall be governed by and construed in accordance with the laws of Romania, without regard to its conflict of laws principles.\r\n\r\n8.2 Entire Agreement: This Agreement constitutes the entire agreement between you and Alexandru-Razvan Olariu regarding the AROLARIU API and supersedes any prior or contemporaneous agreements, communications, or understandings.\r\n\r\n8.3 Severability: If any provision of this Agreement is held to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect.");

            return app;
        }
    }
}
