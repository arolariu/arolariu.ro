/**
 * @fileoverview One-off renderer for the OG social card.
 *
 * @remarks
 * Reads `static/img/og-card.source.svg`, rasterizes it to
 * `static/img/og-card.png` (1200×630) via `@resvg/resvg-js`, and
 * writes the PNG to disk. The PNG is committed so normal builds
 * don't depend on this script; run it manually only when the
 * source SVG changes.
 *
 * Invoke with: `node sites/docs.arolariu.ro/scripts/render-og-card.ts`
 */

import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Resvg} from '@resvg/resvg-js';

/** Absolute path to the docs-site root (sibling of `static/`). */
const ROOT = resolve(import.meta.dirname, '..');
/** Source SVG used as input to the rasterizer. */
const SVG = resolve(ROOT, 'static/img/og-card.source.svg');
/** Output path for the rendered PNG (committed alongside the SVG). */
const PNG = resolve(ROOT, 'static/img/og-card.png');

const svg = readFileSync(SVG, 'utf8');
const resvg = new Resvg(svg, {fitTo: {mode: 'width', value: 1200}});
const png = resvg.render().asPng();
writeFileSync(PNG, png);
console.log(`rendered ${png.length} bytes -> ${PNG}`);
