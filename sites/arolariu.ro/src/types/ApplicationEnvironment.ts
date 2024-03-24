export type ApplicationEnvironment = "INTEGRATION" | "DEVELOPMENT" | "PRODUCTION" | undefined;
export type ApplicationURL = "http://localhost:3000" | "https://dev.arolariu.ro" | "https://arolariu.ro";


export interface ApplicationConfiguration {
  SITE_ENV: ApplicationEnvironment;
  SITE_NAME: string;
  SITE_URL: ApplicationURL;
  API_URL: string;
  API_JWT: string;
}
