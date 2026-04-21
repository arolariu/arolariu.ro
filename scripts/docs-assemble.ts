import {cpSync, rmSync, mkdirSync, readdirSync, statSync, existsSync} from 'node:fs';
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

async function runTypedoc(): Promise<void> {
  await runCommand('npx', ['typedoc', '--options', 'typedoc.components.json'], REPO_ROOT);
  await runCommand('npx', ['typedoc', '--options', 'typedoc.website.json'], REPO_ROOT);
  assertNonEmpty(TS_REFERENCE_DIR, 'typedoc');
}

async function main(): Promise<void> {
  cleanGenerated();
  await Promise.all([runTypedoc()]);
  await normalizeDirectory(TS_REFERENCE_DIR, {slugRoot: '/reference/typescript'});
  await syncProse(PROSE_SRC, PROSE_DEST);
}

if (import.meta.filename === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
