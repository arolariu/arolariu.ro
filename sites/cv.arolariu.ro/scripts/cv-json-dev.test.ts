// @vitest-environment node
import type {AddressInfo} from "node:net";
import {fileURLToPath} from "node:url";
import {createServer} from "vite";
import {expect, it} from "vitest";
import {cvJsonDevPlugin} from "./cv-json-dev.ts";

it("serves real JSON queries and HTTP methods through Vite without a SvelteKit server route", async () => {
  const server = await createServer({
    configFile: false,
    plugins: [cvJsonDevPlugin()],
    resolve: {alias: {"@": fileURLToPath(new URL("../src", import.meta.url))}},
    server: {port: 0, host: "127.0.0.1"},
    logLevel: "silent",
  });
  try {
    await server.listen();
    const port = (server.httpServer?.address() as AddressInfo).port;
    const url = `http://127.0.0.1:${port}/rest/json`;
    const response = await fetch(`${url}?section=basics&format=minimal`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({section: "basics"});
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const unchanged = await fetch(`${url}?format=resume`);
    const conditional = await fetch(`${url}?format=resume`, {headers: {"If-None-Match": unchanged.headers.get("ETag") ?? ""}});
    expect(conditional.status).toBe(304);
    expect((await fetch(url, {method: "HEAD"})).status).toBe(200);
    expect((await fetch(url, {method: "OPTIONS"})).status).toBe(204);
    expect((await fetch(url, {method: "POST"})).status).toBe(405);
    expect((await fetch(`${url}/?format=resume`, {redirect: "manual"})).headers.get("Location")).toBe("/rest/json?format=resume");
    expect((await fetch(`${url}-missing`)).status).toBe(404);
  } finally {
    await server.close();
  }
});
