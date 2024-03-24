import { ApplicationEnvironment } from "@/types/ApplicationEnvironment";
import fetchAppConfiguration from "./fetchAppConfiguration";
import fs from "node:fs";

/**
 * This function generates a .env file based on the application configuration.
 * @param appEnvironment The environment for which to generate the .env file.
 * @returns True if the .env file was generated successfully, false otherwise.
 */
export default async function generateDotEnv(appEnvironment: ApplicationEnvironment): Promise<boolean> {
  try {
    const configuration = await fetchAppConfiguration(appEnvironment);
    const env = Object.entries(configuration).map(([key, value]) => `${key}=${String(value)}`).join("\n");
    fs.writeFileSync(".env.local", env, { encoding: "utf8" });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
