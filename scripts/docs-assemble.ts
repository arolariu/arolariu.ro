import {cpSync, rmSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, existsSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {normalizeDirectory} from './docs-assemble.normalize.ts';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const DOCS_V2_ROOT = join(REPO_ROOT, 'sites', 'docs.arolariu.ro-v2');
const GENERATED_ROOT = join(DOCS_V2_ROOT, '_generated');
const PROSE_DEST = join(DOCS_V2_ROOT, 'docs', 'monorepo');
const PROSE_SRC = join(REPO_ROOT, 'docs');

const NPM_FAMILY_COMMANDS = new Set(['npm', 'npx', 'node']);

function resolveCommand(command: string): string {
  if (process.platform !== 'win32') return command;
  if (NPM_FAMILY_COMMANDS.has(command)) return `${command}.cmd`;
  return command;
}

export async function syncProse(src: string, dest: string): Promise<void> {
  rmSync(dest, {recursive: true, force: true});
  mkdirSync(dest, {recursive: true});
  cpSync(src, dest, {recursive: true});
  rmSync(join(dest, 'superpowers'), {recursive: true, force: true});
}

export function runCommand(command: string, args: readonly string[], cwd: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(resolveCommand(command), args, {cwd, stdio: 'inherit', shell: process.platform === 'win32'});
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

export function assertNonEmpty(dir: string, label: string): void {
  if (!existsSync(dir)) throw new Error(`${label}: expected directory not found at ${dir}`);
  let count = 0;
  const walk = (d: string): void => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.mdx?$|\.json$/i.test(name)) count++;
    }
  };
  walk(dir);
  if (count === 0) throw new Error(`${label}: extracted 0 files into ${dir}`);
}

export function cleanGenerated(): void {
  rmSync(GENERATED_ROOT, {recursive: true, force: true});
  mkdirSync(GENERATED_ROOT, {recursive: true});
}

const TS_REFERENCE_DIR = join(GENERATED_ROOT, 'ts-reference');
const PYTHON_DIR = join(GENERATED_ROOT, 'experimental');
const DOTNET_INTERNALS_DIR = join(GENERATED_ROOT, 'dotnet-internals');
const DOTNET_API_DIR = join(GENERATED_ROOT, 'dotnet-api');
const API_ROOT = join(REPO_ROOT, 'sites', 'api.arolariu.ro');

type DotnetProject = {
  readonly csproj: string;
  readonly assemblyName: string;
  readonly binRelative: string;
};

const DOTNET_PROJECTS: readonly DotnetProject[] = [
  {csproj: 'src/Common/arolariu.Backend.Common.csproj', assemblyName: 'arolariu.Backend.Common', binRelative: 'src/Common/bin/Release/net10.0'},
  {csproj: 'src/Core/arolariu.Backend.Core.csproj', assemblyName: 'arolariu.Backend.Core', binRelative: 'src/Core/bin/Release/net10.0'},
  {csproj: 'src/Core.Auth/arolariu.Backend.Core.Auth.csproj', assemblyName: 'arolariu.Backend.Core.Auth', binRelative: 'src/Core.Auth/bin/Release/net10.0'},
  {csproj: 'src/Invoices/arolariu.Backend.Domain.Invoices.csproj', assemblyName: 'arolariu.Backend.Domain.Invoices', binRelative: 'src/Invoices/bin/Release/net10.0'},
];

async function runDotnetInternals(): Promise<void> {
  await runCommand('dotnet', ['build', 'src/Core/arolariu.Backend.Core.csproj', '-c', 'Release'], API_ROOT);
  mkdirSync(DOTNET_INTERNALS_DIR, {recursive: true});
  for (const proj of DOTNET_PROJECTS) {
    const outDir = join(DOTNET_INTERNALS_DIR, proj.assemblyName);
    mkdirSync(outDir, {recursive: true});
    const dll = join(API_ROOT, proj.binRelative, `${proj.assemblyName}.dll`);
    await runCommand(
      'dotnet',
      ['tool', 'run', 'DefaultDocumentation', '--',
       '--AssemblyFilePath', dll,
       '--OutputDirectoryPath', outDir,
       '--FileNameFactory', 'Name',
       '--GeneratedPages', 'Namespaces'],
      API_ROOT,
    );
  }
  assertNonEmpty(DOTNET_INTERNALS_DIR, 'defaultdocumentation');
}

async function runDotnetOpenApi(): Promise<void> {
  mkdirSync(DOTNET_API_DIR, {recursive: true});
  // Microsoft.AspNetCore.OpenApi emits the build-time spec into obj/<Config>/net10.0/EndpointInfo.
  // Preference order: Release (matches runDotnetInternals), then Debug (dev builds), so we pick
  // whichever exists. If neither exists we warn and continue — Task 8 will treat the empty
  // dotnet-api dir as a gap (the openapi-docs plugin will simply have no pages to generate).
  const releaseSpec = join(API_ROOT, 'src', 'Core', 'obj', 'Release', 'net10.0', 'EndpointInfo', 'arolariu.Backend.Core.json');
  const debugSpec = join(API_ROOT, 'src', 'Core', 'obj', 'Debug', 'net10.0', 'EndpointInfo', 'arolariu.Backend.Core.json');
  const specSource = existsSync(releaseSpec) ? releaseSpec : existsSync(debugSpec) ? debugSpec : null;
  if (!specSource) {
    console.warn(`dotnet-openapi: no spec found at ${releaseSpec} or ${debugSpec}. Skipping copy. ` +
      `Microsoft.AspNetCore.OpenApi build-time emission requires Microsoft.Extensions.ApiDescription.Server ` +
      `targets; verify the csproj still wires those in before Task 8 wires the openapi-docs plugin.`);
    return;
  }
  cpSync(specSource, join(DOTNET_API_DIR, 'openapi.json'));
  // Task 8 will wire docusaurus-plugin-openapi-docs into docusaurus.config.ts and
  // then call `npx docusaurus gen-api-docs all` here to generate MDX pages.
  // assertNonEmpty(join(DOTNET_API_DIR, 'pages'), 'openapi-pages');
}

async function runTypedoc(): Promise<void> {
  await runCommand('npx', ['typedoc', '--options', 'typedoc.components.json'], REPO_ROOT);
  await runCommand('npx', ['typedoc', '--options', 'typedoc.website.json'], REPO_ROOT);
  assertNonEmpty(TS_REFERENCE_DIR, 'typedoc');
}

function normalizeLineEndings(dir: string): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) normalizeLineEndings(full);
    else if (/\.mdx?$|\.json$/i.test(name)) {
      const content = readFileSync(full, 'utf8');
      if (content.includes('\r\n')) writeFileSync(full, content.replaceAll('\r\n', '\n'));
    }
  }
}

async function runPydocMarkdown(): Promise<void> {
  const expDir = join(REPO_ROOT, 'sites', 'exp.arolariu.ro');
  await runCommand('python', ['-m', 'pydoc_markdown.main'], expDir);
  assertNonEmpty(PYTHON_DIR, 'pydoc-markdown');
  // pydoc-markdown emits CRLF on Windows; normalize so downstream frontmatter parsers match on \n.
  normalizeLineEndings(PYTHON_DIR);
}

async function main(): Promise<void> {
  cleanGenerated();
  await Promise.all([runTypedoc(), runPydocMarkdown(), runDotnetInternals()]);
  await runDotnetOpenApi();
  await normalizeDirectory(TS_REFERENCE_DIR, {slugRoot: '/reference/typescript'});
  await normalizeDirectory(PYTHON_DIR, {slugRoot: '/internals/experimental'});
  await normalizeDirectory(DOTNET_INTERNALS_DIR, {slugRoot: '/internals/dotnet'});
  await syncProse(PROSE_SRC, PROSE_DEST);
}

if (import.meta.filename === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
