import {API_JWT, CONFIG_STORE} from "@/constants";
import {AppConfigurationClient} from "@azure/app-configuration";
import "server-only";

import {type User} from "@clerk/backend";
import {currentUser} from "@clerk/nextjs";

import {DefaultAzureCredential} from "@azure/identity";
import * as jose from "jose";

/**
 * Generate a JWT for a user.
 * @param user The user for which to generate the JWT.
 * @returns A promise of the JWT.
 */
export async function generateJWT(user: User | null) {
  const secret = new TextEncoder().encode(API_JWT);

  const header = {alg: "HS256", typ: "JWT"};

  const payload = {
    iss: "https://arolariu.ro",
    aud: "https://api.arolariu.ro",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 180,
    sub: user?.username ?? "guest",
  };

  const jwt = await new jose.SignJWT(payload).setProtectedHeader(header).sign(secret);
  return jwt;
}

/**
 * Fetches the current user.
 * @returns A promise of the current user.
 */
export async function fetchUser(): Promise<{isAuthenticated: boolean; user: User | null}> {
  const user = await currentUser();
  const isAuthenticated = user !== null;
  return {isAuthenticated, user};
}

/**
 * Function to fetch a configuration value from Azure App Configuration.
 * @param key The key of the configuration value to fetch.
 * @returns The value of the configuration value.
 */
export async function fetchConfigurationValue(key: string): Promise<string> {
  const credentials = new DefaultAzureCredential();
  const client = new AppConfigurationClient(CONFIG_STORE, credentials);
  const setting = await client.getConfigurationSetting({key});
  return setting?.value ?? "";
}
