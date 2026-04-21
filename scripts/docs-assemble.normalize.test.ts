import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {normalizeDirectory} from './docs-assemble.normalize';

describe('normalizeDirectory', () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'norm-'));
  });
  afterEach(() => {
    rmSync(root, {recursive: true, force: true});
  });

  it('inserts title from first H1 when frontmatter is absent', async () => {
    writeFileSync(join(root, 'alpha.md'), '# Alpha Module\n\nBody.\n');
    await normalizeDirectory(root, {slugRoot: '/ref'});
    const out = readFileSync(join(root, 'alpha.md'), 'utf8');
    expect(out).toMatch(/^---\ntitle: Alpha Module\n/);
    expect(out).toMatch(/sidebar_position: 1\n/);
    expect(out).toMatch(/slug: \/ref\/alpha\n/);
    expect(out).toContain('# Alpha Module');
  });

  it('preserves existing frontmatter keys and only fills missing ones', async () => {
    writeFileSync(join(root, 'beta.md'), '---\ntitle: Custom Title\n---\n# Beta\n\nBody.\n');
    await normalizeDirectory(root, {slugRoot: '/ref'});
    const out = readFileSync(join(root, 'beta.md'), 'utf8');
    expect(out).toMatch(/title: Custom Title/);
    expect(out).toMatch(/sidebar_position: /);
    expect(out).toMatch(/slug: /);
  });

  it('skips paths listed in skipPaths', async () => {
    mkdirSync(join(root, 'skipme'));
    writeFileSync(join(root, 'skipme', 'x.md'), '# X\n');
    await normalizeDirectory(root, {slugRoot: '/ref', skipPaths: [join(root, 'skipme')]});
    const out = readFileSync(join(root, 'skipme', 'x.md'), 'utf8');
    expect(out).toBe('# X\n');
  });

  it('forces position 0 for index/README files', async () => {
    writeFileSync(join(root, 'zzz.md'), '# ZZZ\n');
    writeFileSync(join(root, 'index.md'), '# Overview\n');
    await normalizeDirectory(root, {slugRoot: '/ref'});
    const zzz = readFileSync(join(root, 'zzz.md'), 'utf8');
    const idx = readFileSync(join(root, 'index.md'), 'utf8');
    expect(idx).toMatch(/sidebar_position: 0/);
    expect(zzz).toMatch(/sidebar_position: 1/);
  });
});
