import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {syncProse} from './docs-assemble';

describe('syncProse', () => {
  let srcDir: string;
  let destDir: string;
  beforeEach(() => {
    srcDir = mkdtempSync(join(tmpdir(), 'prose-src-'));
    destDir = mkdtempSync(join(tmpdir(), 'prose-dst-'));
  });
  afterEach(() => {
    rmSync(srcDir, {recursive: true, force: true});
    rmSync(destDir, {recursive: true, force: true});
  });

  it('copies markdown files recursively from source to destination', async () => {
    mkdirSync(join(srcDir, 'rfc'));
    writeFileSync(join(srcDir, 'README.md'), '# Root');
    writeFileSync(join(srcDir, 'rfc', '0001.md'), '# RFC 0001');
    await syncProse(srcDir, destDir);
    expect(existsSync(join(destDir, 'README.md'))).toBe(true);
    expect(readFileSync(join(destDir, 'rfc', '0001.md'), 'utf8')).toBe('# RFC 0001');
  });

  it('wipes destination before copying', async () => {
    writeFileSync(join(destDir, 'stale.md'), 'stale');
    writeFileSync(join(srcDir, 'fresh.md'), 'fresh');
    await syncProse(srcDir, destDir);
    expect(existsSync(join(destDir, 'stale.md'))).toBe(false);
    expect(existsSync(join(destDir, 'fresh.md'))).toBe(true);
  });
});
