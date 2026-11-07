import childProcess from "node:child_process";
import {registerHooks, syncBuiltinESMExports} from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (/^(?:effect(?:\/|$)|@effect\/|nx(?:\/|$)|@nx\/)/.test(specifier)) throw new Error(`Root runtime dependency denied: ${specifier}`);
    return next(specifier, context);
  },
});

if (process.env.CI_IMPORT_ONLY === "1") {
  const unexpected = () => {
    throw new Error("Unexpected workflow execution during import");
  };
  childProcess.spawn = unexpected;
  childProcess.exec = unexpected;
  childProcess.execFile = unexpected;
  globalThis.fetch = unexpected;
  syncBuiltinESMExports();
}
