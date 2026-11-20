import type {Plugin} from "vite";

/**
 * Keeps the public JSON endpoint available in Vite development without a server adapter.
 * @returns A development-only middleware using the same handler as the managed Function.
 */
export function cvJsonDevPlugin(): Plugin {
  return {
    name: "cv-json-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        try {
          const url = new URL(request.url ?? "/", "http://localhost");
          if (url.pathname !== "/rest/json" && url.pathname !== "/rest/json/") {
            next();
            return;
          }
          const headers = new Headers();
          for (const [name, values] of Object.entries(request.headers)) {
            for (const value of Array.isArray(values) ? values : values === undefined ? [] : [values]) {
              headers.append(name, value);
            }
          }
          const module = (await server.ssrLoadModule("/src/lib/api/cv-json.ts")) as typeof import("../src/lib/api/cv-json.ts");
          const result = module.handleCvJsonRequest(new Request(url, {method: request.method ?? "GET", headers}));
          response.writeHead(result.status, Object.fromEntries(result.headers));
          response.end(Buffer.from(await result.arrayBuffer()));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
