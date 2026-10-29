import assert from "node:assert/strict";
import {execFileSync, spawn} from "node:child_process";
import {randomUUID} from "node:crypto";
import {once} from "node:events";
import {mkdtemp, rm, writeFile} from "node:fs/promises";
import {createServer} from "node:http";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {test} from "node:test";
import {setTimeout as delay} from "node:timers/promises";

const [image, environment] = process.argv.slice(2);
assert.ok(image, "Supply the final website image to test.");
assert.ok(environment === "PRODUCTION" || environment === "DEVELOPMENT", "Supply the expected build-time SITE_ENV.");
assert.equal(process.platform, "linux", "This smoke test uses Linux Docker host networking.");

async function runStartupSmoke(managedIdentity, identityDelayMs, experimentsClientId) {
  const imageEnvironment = JSON.parse(
    execFileSync("docker", ["image", "inspect", "--format", "{{json .Config.Env}}", image], {
      encoding: "utf8",
    }),
  );
  for (const variable of ["SITE_ENV", "EXP_ENTRA_APP_CLIENT_ID", "CLERK_SECRET_KEY", "API_JWT", "RESEND_API_KEY"]) {
    assert.ok(!imageEnvironment.some((entry) => entry.startsWith(`${variable}=`)), `${variable} must not be set in the runner image.`);
  }

  const requests = [];
  const identityRequests = [];
  const identityClientId = "11111111-2222-3333-4444-555555555555";
  const experimentsResource = `api://${experimentsClientId}`;
  const identityHeader = "smoke-test-only-identity-header";
  const accessToken = "smoke-test-only-exp-access-token";
  let fixtureOrigin = "";
  const fixture = createServer((request, response) => {
    const url = new URL(request.url, fixtureOrigin);
    response.setHeader("Content-Type", "application/json");
    if (url.pathname === "/metadata/identity/oauth2/token") {
      identityRequests.push({
        clientId: url.searchParams.get("client_id"),
        resource: url.searchParams.get("resource"),
        identityHeader: request.headers["x-identity-header"],
      });
      void delay(identityDelayMs).then(() => {
        response.end(
          JSON.stringify({
            access_token: accessToken,
            expires_on: String(Math.floor(Date.now() / 1000) + 3600),
            token_type: "Bearer",
            resource: experimentsResource,
          }),
        );
      });
    } else if (url.pathname === "/api/v1/run-time") {
      requests.push({
        target: url.searchParams.get("for"),
        label: url.searchParams.get("label"),
        authorization: request.headers.authorization,
      });
      response.end(
        JSON.stringify({
          target: "website",
          config: {
            "Site:Environment": environment,
            "Auth:Clerk:SecretKey": `sk_${environment === "PRODUCTION" ? "live" : "test"}_${"0".repeat(48)}`,
            "Auth:JWT:Secret": "smoke-test-only-signing-value",
            "Auth:JWT:Issuer": fixtureOrigin,
            "Auth:JWT:Audience": "website-smoke-test",
            "Communication:Email:ApiKey": "",
            "Endpoints:Service:Api": fixtureOrigin,
            "Endpoints:Storage:Blob": `${fixtureOrigin}/storage`,
          },
        }),
      );
    } else if (url.pathname === "/health" || url.pathname === "/api/health") {
      response.end(JSON.stringify({status: "Healthy"}));
    } else {
      response.writeHead(404);
      response.end(JSON.stringify({error: "Unexpected fixture request"}));
    }
  });
  fixture.listen(0, "127.0.0.1");
  await once(fixture, "listening");
  const fixtureAddress = fixture.address();
  assert.ok(fixtureAddress && typeof fixtureAddress === "object");
  fixtureOrigin = `http://127.0.0.1:${fixtureAddress.port}`;
  const fixtureDirectory = await mkdtemp(join(tmpdir(), "website-identity-smoke-"));
  const fetchHook = join(fixtureDirectory, "exp-fetch.mjs");
  await writeFile(
    fetchHook,
    `
    const realFetch = globalThis.fetch;
    globalThis.fetch = (input, options) => {
      const url = new URL(input instanceof Request ? input.url : input);
      if (url.origin === "https://exp.arolariu.ro") {
        return realFetch(new URL(url.pathname + url.search, ${JSON.stringify(fixtureOrigin)}), options);
      }
      return realFetch(input, options);
    };
  `,
  );

  const portReservation = createServer();
  portReservation.listen(0, "127.0.0.1");
  await once(portReservation, "listening");
  const websiteAddress = portReservation.address();
  assert.ok(websiteAddress && typeof websiteAddress === "object");
  await new Promise((resolve, reject) => portReservation.close((error) => (error ? reject(error) : resolve())));

  const name = `website-runtime-smoke-${randomUUID()}`;
  const child = spawn(
    "docker",
    [
      "run",
      "--rm",
      "--name",
      name,
      "--network",
      "host",
      "--env",
      `PORT=${websiteAddress.port}`,
      "--env",
      `EXP_PROXY_URL=${managedIdentity ? "" : fixtureOrigin}`,
      "--env",
      "INFRA=azure",
      "--env",
      `EXP_ENTRA_APP_CLIENT_ID=${experimentsClientId}`,
      "--env",
      `AZURE_CLIENT_ID=${managedIdentity ? identityClientId : ""}`,
      ...(managedIdentity
        ? [
            "--env",
            `IDENTITY_ENDPOINT=${fixtureOrigin}/metadata/identity/oauth2/token`,
            "--env",
            `IDENTITY_HEADER=${identityHeader}`,
            "--env",
            "NODE_OPTIONS=--import=file:///tmp/exp-fetch.mjs",
            "--mount",
            `type=bind,src=${fetchHook},dst=/tmp/exp-fetch.mjs,readonly`,
          ]
        : []),
      "--env",
      "OTEL_SDK_DISABLED=true",
      image,
    ],
    {stdio: ["ignore", "pipe", "pipe"]},
  );
  let output = "";
  let exited = false;
  let spawnError = null;
  const appendOutput = (chunk) => {
    output = `${output}${chunk}`.slice(-32_768);
  };
  child.stdout.on("data", appendOutput);
  child.stderr.on("data", appendOutput);
  child.on("exit", () => {
    exited = true;
  });
  child.on("error", (error) => {
    spawnError = error;
  });

  try {
    const deadline = Date.now() + 45_000;
    let report = null;
    while (Date.now() < deadline && !exited) {
      assert.equal(spawnError, null);
      const response = await fetch(`http://127.0.0.1:${websiteAddress.port}/api/health/`, {
        signal: AbortSignal.timeout(2000),
      }).catch(() => null);
      if (response?.ok) {
        report = await response.json();
        break;
      }
      if (response) await response.body?.cancel();
      await delay(250);
    }
    assert.ok(report, `Final image did not become healthy after runtime registration.\n${output}`);
    assert.equal(report.build.environment, environment);
    assert.equal(report.build.infraMode, "azure");
    assert.equal(report.status, "Healthy");
    assert.ok(report.dependencies.some((dependency) => dependency.url === `${fixtureOrigin}/health` && dependency.status === "Healthy"));
    assert.deepEqual(requests, [
      {
        target: "website",
        label: environment,
        authorization: managedIdentity ? `Bearer ${accessToken}` : undefined,
      },
    ]);
    assert.deepEqual(
      identityRequests,
      managedIdentity
        ? [
            {
              clientId: identityClientId,
              resource: experimentsResource,
              identityHeader,
            },
          ]
        : [],
    );
  } finally {
    const containerId = execFileSync("docker", ["ps", "--all", "--quiet", "--filter", `name=^/${name}$`], {encoding: "utf8"}).trim();
    if (containerId) execFileSync("docker", ["rm", "--force", containerId], {stdio: "ignore"});
    fixture.closeAllConnections();
    await new Promise((resolve, reject) => fixture.close((error) => (error ? reject(error) : resolve())));
    await rm(fixtureDirectory, {recursive: true, force: true});
  }
}

for (const {managedIdentity, identityDelayMs, experimentsClientId} of [
  {managedIdentity: false, identityDelayMs: 0, experimentsClientId: ""},
  {managedIdentity: true, identityDelayMs: 0, experimentsClientId: "22222222-2222-4222-8222-222222222222"},
  {managedIdentity: true, identityDelayMs: 11_000, experimentsClientId: "33333333-3333-4333-8333-333333333333"},
]) {
  const scenario = managedIdentity ? `App Service identity, ${identityDelayMs}ms cold start` : "local exp fixture";
  test(`the final image loads runtime configuration (${scenario})`, {timeout: 60_000}, () =>
    runStartupSmoke(managedIdentity, identityDelayMs, experimentsClientId),
  );
}
