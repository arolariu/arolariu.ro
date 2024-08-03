/** @format */

/**
 * This file is used to register the instrumentation for the application.
 * The instrumentation is called BEFORE the application is started.
 */
export async function register() {
  if (process.env["NODE_ENV"] !== "development") {
    if (process.env["NEXT_RUNTIME"] === "nodejs") {
      await import("./instrumentation.node.ts");
    }
  }
}
