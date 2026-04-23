import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Resvg} from '@resvg/resvg-js';

const ROOT = resolve(import.meta.dirname, '..');
const SVG = resolve(ROOT, 'static/img/og-card.source.svg');
const PNG = resolve(ROOT, 'static/img/og-card.png');

const svg = readFileSync(SVG, 'utf8');
const resvg = new Resvg(svg, {fitTo: {mode: 'width', value: 1200}});
const png = resvg.render().asPng();
writeFileSync(PNG, png);
console.log(`rendered ${png.length} bytes -> ${PNG}`);
