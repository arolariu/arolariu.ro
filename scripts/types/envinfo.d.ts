/**
 * @fileoverview Minimal ambient declaration for the `envinfo` default export used by the isolated
 * inspection worker. Only the exact CLI surface the aggregate worker invokes is declared; no named
 * ESM API is introduced and the third-party surface is intentionally not broadened.
 * @module scripts/types/envinfo
 */

declare module "envinfo" {
  export interface EnvinfoCliOptions {
    readonly all: true;
    readonly json: true;
    readonly console: false;
    readonly duplicates: true;
    readonly fullTree: true;
  }

  export interface EnvinfoModule {
    readonly cli: (options: Readonly<EnvinfoCliOptions>) => Promise<string>;
  }

  const envinfo: EnvinfoModule;
  export default envinfo;
}
