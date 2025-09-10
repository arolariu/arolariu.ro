// this file is generated — do not edit it

/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 *
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 *
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 *
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 *
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 *
 * You can override `.env` values from the command line like so:
 *
 * ```sh
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module "$env/static/private" {
  export const ALLUSERSPROFILE: string;
  export const APPDATA: string;
  export const ChocolateyInstall: string;
  export const ChocolateyLastPathUpdate: string;
  export const CHROME_CRASHPAD_PIPE_NAME: string;
  export const CLIENTNAME: string;
  export const COLOR: string;
  export const COLORTERM: string;
  export const CommonProgramFiles: string;
  export const CommonProgramW6432: string;
  export const COMPUTERNAME: string;
  export const ComSpec: string;
  export const DriverData: string;
  export const EDITOR: string;
  export const EFC_18320: string;
  export const GIT_ASKPASS: string;
  export const GOPATH: string;
  export const HOME: string;
  export const HOMEDRIVE: string;
  export const HOMEPATH: string;
  export const INIT_CWD: string;
  export const IsDevBox: string;
  export const LANG: string;
  export const LOCALAPPDATA: string;
  export const LOGONSERVER: string;
  export const NODE: string;
  export const npm_command: string;
  export const npm_config_always_auth: string;
  export const NPM_CONFIG_CACHE: string;
  export const npm_config_email: string;
  export const npm_config_globalconfig: string;
  export const npm_config_global_prefix: string;
  export const npm_config_heading: string;
  export const npm_config_init_module: string;
  export const npm_config_local_prefix: string;
  export const npm_config_node_gyp: string;
  export const npm_config_noproxy: string;
  export const npm_config_npm_version: string;
  export const NPM_CONFIG_PREFIX: string;
  export const npm_config_save_exact: string;
  export const npm_config_userconfig: string;
  export const npm_config_user_agent: string;
  export const npm_execpath: string;
  export const npm_lifecycle_event: string;
  export const npm_lifecycle_script: string;
  export const npm_node_execpath: string;
  export const npm_package_dev: string;
  export const npm_package_dev_optional: string;
  export const npm_package_engines_node: string;
  export const npm_package_integrity: string;
  export const npm_package_json: string;
  export const npm_package_name: string;
  export const npm_package_optional: string;
  export const npm_package_peer: string;
  export const npm_package_resolved: string;
  export const npm_package_version: string;
  export const NUGET_CREDENTIALPROVIDER_FORCE_CANSHOWDIALOG_TO: string;
  export const NUGET_HTTP_CACHE_PATH: string;
  export const NUGET_NETCORE_PLUGIN_PATHS: string;
  export const NUGET_NETFX_PLUGIN_PATHS: string;
  export const NUGET_PACKAGES: string;
  export const NUGET_PLUGINS_CACHE_PATH: string;
  export const NUGET_PLUGIN_PATHS: string;
  export const NUMBER_OF_PROCESSORS: string;
  export const OneDrive: string;
  export const OneDriveCommercial: string;
  export const OPENSSL_CONF: string;
  export const ORIGINAL_XDG_CURRENT_DESKTOP: string;
  export const OS: string;
  export const Path: string;
  export const PATHEXT: string;
  export const POWERSHELL_DISTRIBUTION_CHANNEL: string;
  export const PRIVATE_USER_TOOLS: string;
  export const PROCESSOR_ARCHITECTURE: string;
  export const PROCESSOR_IDENTIFIER: string;
  export const PROCESSOR_LEVEL: string;
  export const PROCESSOR_REVISION: string;
  export const ProgramData: string;
  export const ProgramFiles: string;
  export const ProgramW6432: string;
  export const PROMPT: string;
  export const PSModulePath: string;
  export const PUBLIC: string;
  export const QUICKBUILD_INSTALL_PATH: string;
  export const SESSIONNAME: string;
  export const SystemDrive: string;
  export const SystemRoot: string;
  export const TEMP: string;
  export const TERM_PROGRAM: string;
  export const TERM_PROGRAM_VERSION: string;
  export const TMP: string;
  export const UATDATA: string;
  export const USERDNSDOMAIN: string;
  export const USERDOMAIN: string;
  export const USERDOMAIN_ROAMINGPROFILE: string;
  export const USERNAME: string;
  export const USERPROFILE: string;
  export const VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
  export const VSCODE_GIT_ASKPASS_MAIN: string;
  export const VSCODE_GIT_ASKPASS_NODE: string;
  export const VSCODE_GIT_IPC_HANDLE: string;
  export const VSCODE_INJECTION: string;
  export const WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: string;
  export const windir: string;
  export const WVD_AGENT_CLUSTER: string;
  export const WVD_AGENT_RING: string;
  export const WVD_MONITORING_CONFIG_VERSION: string;
  export const WVD_MONITORING_DATA_DIRECTORY: string;
  export const WVD_MONITORING_ENV: string;
  export const WVD_MONITORING_GCS_ACCOUNT: string;
  export const WVD_MONITORING_GCS_AUTH_ID: string;
  export const WVD_MONITORING_GCS_AUTH_ID_TYPE: string;
  export const WVD_MONITORING_GCS_CERTSTORE: string;
  export const WVD_MONITORING_GCS_ENVIRONMENT: string;
  export const WVD_MONITORING_GCS_NAMESPACE: string;
  export const WVD_MONITORING_GCS_REGION: string;
  export const WVD_MONITORING_MDM_ACCOUNT: string;
  export const WVD_MONITORING_RESOURCE: string;
  export const WVD_MONITORING_ROLE: string;
  export const WVD_MONITORING_ROLE_INSTANCE: string;
  export const WVD_MONITORING_TENANT: string;
  export const YARN_CACHE_FOLDER: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 *
 * Values are replaced statically at build time.
 *
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module "$env/static/public" {}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 *
 * This module cannot be imported into client-side code.
 *
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 *
 * > [!NOTE] In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module "$env/dynamic/private" {
  export const env: {
    ALLUSERSPROFILE: string;
    APPDATA: string;
    ChocolateyInstall: string;
    ChocolateyLastPathUpdate: string;
    CHROME_CRASHPAD_PIPE_NAME: string;
    CLIENTNAME: string;
    COLOR: string;
    COLORTERM: string;
    CommonProgramFiles: string;
    CommonProgramW6432: string;
    COMPUTERNAME: string;
    ComSpec: string;
    DriverData: string;
    EDITOR: string;
    EFC_18320: string;
    GIT_ASKPASS: string;
    GOPATH: string;
    HOME: string;
    HOMEDRIVE: string;
    HOMEPATH: string;
    INIT_CWD: string;
    IsDevBox: string;
    LANG: string;
    LOCALAPPDATA: string;
    LOGONSERVER: string;
    NODE: string;
    npm_command: string;
    npm_config_always_auth: string;
    NPM_CONFIG_CACHE: string;
    npm_config_email: string;
    npm_config_globalconfig: string;
    npm_config_global_prefix: string;
    npm_config_heading: string;
    npm_config_init_module: string;
    npm_config_local_prefix: string;
    npm_config_node_gyp: string;
    npm_config_noproxy: string;
    npm_config_npm_version: string;
    NPM_CONFIG_PREFIX: string;
    npm_config_save_exact: string;
    npm_config_userconfig: string;
    npm_config_user_agent: string;
    npm_execpath: string;
    npm_lifecycle_event: string;
    npm_lifecycle_script: string;
    npm_node_execpath: string;
    npm_package_dev: string;
    npm_package_dev_optional: string;
    npm_package_engines_node: string;
    npm_package_integrity: string;
    npm_package_json: string;
    npm_package_name: string;
    npm_package_optional: string;
    npm_package_peer: string;
    npm_package_resolved: string;
    npm_package_version: string;
    NUGET_CREDENTIALPROVIDER_FORCE_CANSHOWDIALOG_TO: string;
    NUGET_HTTP_CACHE_PATH: string;
    NUGET_NETCORE_PLUGIN_PATHS: string;
    NUGET_NETFX_PLUGIN_PATHS: string;
    NUGET_PACKAGES: string;
    NUGET_PLUGINS_CACHE_PATH: string;
    NUGET_PLUGIN_PATHS: string;
    NUMBER_OF_PROCESSORS: string;
    OneDrive: string;
    OneDriveCommercial: string;
    OPENSSL_CONF: string;
    ORIGINAL_XDG_CURRENT_DESKTOP: string;
    OS: string;
    Path: string;
    PATHEXT: string;
    POWERSHELL_DISTRIBUTION_CHANNEL: string;
    PRIVATE_USER_TOOLS: string;
    PROCESSOR_ARCHITECTURE: string;
    PROCESSOR_IDENTIFIER: string;
    PROCESSOR_LEVEL: string;
    PROCESSOR_REVISION: string;
    ProgramData: string;
    ProgramFiles: string;
    ProgramW6432: string;
    PROMPT: string;
    PSModulePath: string;
    PUBLIC: string;
    QUICKBUILD_INSTALL_PATH: string;
    SESSIONNAME: string;
    SystemDrive: string;
    SystemRoot: string;
    TEMP: string;
    TERM_PROGRAM: string;
    TERM_PROGRAM_VERSION: string;
    TMP: string;
    UATDATA: string;
    USERDNSDOMAIN: string;
    USERDOMAIN: string;
    USERDOMAIN_ROAMINGPROFILE: string;
    USERNAME: string;
    USERPROFILE: string;
    VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
    VSCODE_GIT_ASKPASS_MAIN: string;
    VSCODE_GIT_ASKPASS_NODE: string;
    VSCODE_GIT_IPC_HANDLE: string;
    VSCODE_INJECTION: string;
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: string;
    windir: string;
    WVD_AGENT_CLUSTER: string;
    WVD_AGENT_RING: string;
    WVD_MONITORING_CONFIG_VERSION: string;
    WVD_MONITORING_DATA_DIRECTORY: string;
    WVD_MONITORING_ENV: string;
    WVD_MONITORING_GCS_ACCOUNT: string;
    WVD_MONITORING_GCS_AUTH_ID: string;
    WVD_MONITORING_GCS_AUTH_ID_TYPE: string;
    WVD_MONITORING_GCS_CERTSTORE: string;
    WVD_MONITORING_GCS_ENVIRONMENT: string;
    WVD_MONITORING_GCS_NAMESPACE: string;
    WVD_MONITORING_GCS_REGION: string;
    WVD_MONITORING_MDM_ACCOUNT: string;
    WVD_MONITORING_RESOURCE: string;
    WVD_MONITORING_ROLE: string;
    WVD_MONITORING_ROLE_INSTANCE: string;
    WVD_MONITORING_TENANT: string;
    YARN_CACHE_FOLDER: string;
    [key: `PUBLIC_${string}`]: undefined;
    [key: `${string}`]: string | undefined;
  };
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 *
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 *
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module "$env/dynamic/public" {
  export const env: {
    [key: `PUBLIC_${string}`]: string | undefined;
  };
}
