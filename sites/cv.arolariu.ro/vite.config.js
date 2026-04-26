import {sveltekit} from "@sveltejs/kit/vite";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {defineConfig} from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfWorkerPath = path.resolve(dirname, "../../node_modules/pdfjs-dist/build/pdf.worker.mjs");

export default defineConfig({
  plugins: [
    {
      name: "cv-pdf-worker-dev-server",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (!request.url?.endsWith("/node_modules/svelte-pdf/dist/pdfjs-dist/build/pdf.worker.mjs")) {
            next();
            return;
          }

          response.setHeader("Content-Type", "text/javascript; charset=utf-8");
          fs.createReadStream(pdfWorkerPath).pipe(response);
        });
      },
    },
    sveltekit(),
  ],
});
