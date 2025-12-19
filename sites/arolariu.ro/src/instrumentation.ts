/**
 * This file is used to register the instrumentation for the application.
 * The instrumentation is called BEFORE the application is started.
 */

/**
 * Registers application instrumentation before the app starts.
 * @remarks
 * Initializes OpenTelemetry conditionally based on the runtime environment.
 * Logs runtime details and instrumentation status during registration.
 * @returns A promise that resolves when instrumentation setup is complete.
 */
export async function register() {
  // Initialize OpenTelemetry early in the application lifecycle
  if (process.env["NEXT_RUNTIME"] === "nodejs") {
    // Dynamic import to avoid bundling telemetry code in client bundles
    const {startTelemetry} = await import("@/instrumentation.server");
    startTelemetry();
    console.log(">>> 🔭 OpenTelemetry has been initialized for the Node.js runtime!");
  }

  console.log(">>> Instrumentation has been registered!");
}
