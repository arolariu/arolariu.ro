import {ApplicationConfiguration, type ApplicationEnvironment} from "@/types/ApplicationEnvironment";
import {AppConfigurationClient} from "@azure/app-configuration";
import {DefaultAzureCredential} from "@azure/identity";

/**
 * This function fetches the application configuration from Azure App Configuration.
 * @param appEnvironment The environment for which to fetch the configuration.
 * @returns The application configuration for the specified environment.
 */
export default async function fetchAppConfiguration(
  appEnvironment: ApplicationEnvironment,
): Promise<ApplicationConfiguration> {
  const credentials = new DefaultAzureCredential();
  const endpoint = "https://arolariu-app-config.azconfig.io";

  switch (appEnvironment) {
    case "INTEGRATION": // In local development, we simply generate the configuration on-the-fly.
      return {
        SITE_ENV: "INTEGRATION",
        SITE_NAME: "local.arolariu.ro",
        SITE_URL: "https://dev.arolariu.ro",
        API_URL: "https://api.dev.arolariu.ro",
        API_JWT: "my-very-long-secret-key-that-does-not-work",
      } satisfies ApplicationConfiguration;
    case "DEVELOPMENT": {
      const client = new AppConfigurationClient(endpoint, credentials, {retryOptions: {maxRetries: 5}});
      const settings = await client.getConfigurationSetting({
        key: "CommonOptions:FrontendSettings",
        label: "DEVELOPMENT",
      });
      const environment = JSON.parse(settings.value as string) as ApplicationConfiguration;
      const jwtSecret = await client.getConfigurationSetting({key: "AuthOptions:Secret"});
      environment.API_JWT = jwtSecret.value as string;
      return environment;
    }
    case "PRODUCTION": {
      const client = new AppConfigurationClient(endpoint, credentials, {retryOptions: {maxRetries: 5}});
      const settings = await client.getConfigurationSetting({
        key: "CommonOptions:FrontendSettings",
        label: "PRODUCTION",
      });
      const environment = JSON.parse(settings.value as string) as ApplicationConfiguration;
      const jwtSecret = await client.getConfigurationSetting({key: "AuthOptions:Secret"});
      environment.API_JWT = jwtSecret.value as string;
      return environment;
    }
    default:
      throw new Error(`Unknown environment: ${appEnvironment}`);
  }
}
