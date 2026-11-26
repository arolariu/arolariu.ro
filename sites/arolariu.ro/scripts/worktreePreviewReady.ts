/**
 * Preview-only preload for the checkout's Next CLI. Next logs "Ready in" at
 * bind, then initializes the application handlers before sending its worker's
 * `nextServerReady` IPC message. Observe that exact child, not a network address.
 */
import childProcess, {type ChildProcess, type ForkOptions} from "node:child_process";
import {realpathSync, writeSync} from "node:fs";
import {dirname, relative, resolve} from "node:path";

function isArgumentList(value: unknown): value is readonly string[] {
  return Array.isArray(value);
}

function observeNextWorker(entry: string, run: string, port: string): void {
  const worker = realpathSync(resolve(dirname(entry), "../server/lib/start-server.js"));
  const originalFork = childProcess.fork;
  let observed = false;

  childProcess.fork = (modulePath: string | URL, args?: readonly string[] | ForkOptions, options?: ForkOptions): ChildProcess => {
    const child = isArgumentList(args) ? originalFork(modulePath, args, options) : originalFork(modulePath, args ?? options);
    if (observed || typeof modulePath !== "string" || relative(worker, modulePath) !== "") return child;
    observed = true;
    childProcess.fork = originalFork;

    let ready = false;
    child.on("message", (message: unknown) => {
      if (
        !ready
        && message !== null
        && typeof message === "object"
        && "nextServerReady" in message
        && message.nextServerReady === true
        && "port" in message
        && message.port === port
        && child.exitCode === null
        && child.signalCode === null
      ) {
        ready = true;
        process.stdout.write(`Worktree preview application ready: ${run}\n`);
      }
    });
    child.once("exit", (code, signal) => {
      if (ready) return;
      writeSync(process.stderr.fd, `Worktree preview worker exited before application readiness (${code ?? signal}).\n`);
      process.exit(1);
    });
    return child;
  };
}

const [, entry, command] = process.argv;
const run = process.env["AROLARIU_PLAYWRIGHT_PREVIEW_RUN"];
const portFlag = process.argv.indexOf("--port");
const port = portFlag === -1 ? undefined : process.argv[portFlag + 1];
if (entry && command === "dev" && run && port) observeNextWorker(entry, run, String(Number(port)));
