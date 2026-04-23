/**
 * @fileoverview Docusaurus site configuration for docs.arolariu.ro.
 *
 * @remarks
 * Registers four content-docs plugin instances (one per extractor
 * tier — monorepo prose, .NET internals, TypeScript reference,
 * Python experimental) plus the `docusaurus-plugin-openapi-docs`
 * pair when a .NET OpenAPI spec is present. Also wires the local
 * schema.org JSON-LD plugin, local search, Mermaid, custom head
 * tags, and the console-aesthetic theme customizations.
 *
 * Loaded at build time by Docusaurus via `jiti` (CJS transpile),
 * which is why `__dirname` is the primary way to derive paths.
 */

import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {Config, PluginConfig} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type * as OpenApiPlugin from 'docusaurus-plugin-openapi-docs';
import {themes as prismThemes} from 'prism-react-renderer';
import schemaJsonLdPlugin from './src/plugins/schema-jsonld';

// Docusaurus loads this config via jiti, which transpiles to CJS and does NOT
// support `import.meta.dirname`. Resolve paths relative to the config file by
// using the process cwd fallback to `__dirname` only where available.
const CONFIG_DIR = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));
const GENERATED_ROOT = join(CONFIG_DIR, '_generated');
const OPENAPI_SPEC = join(GENERATED_ROOT, 'dotnet-api', 'openapi.json');
const OPENAPI_PAGES = join(GENERATED_ROOT, 'dotnet-api', 'pages');

/** True when `docs:assemble` copied the OpenAPI spec into staging. */
const hasOpenApiSpec = existsSync(OPENAPI_SPEC);
/**
 * True when `docusaurus gen-api-docs` has produced MDX for every path
 * in the spec. Keeps the content-docs plugin from pointing at a path
 * that doesn't exist yet, and hides the navbar entry until content
 * is available.
 */
const hasOpenApiPages = existsSync(OPENAPI_PAGES);

/**
 * Conditional plugin pair for the .NET HTTP API:
 *
 *   1. A `plugin-content-docs` instance rendering the MDX pages
 *      emitted by `docusaurus-plugin-openapi-docs`.
 *   2. The OpenAPI docs generator itself, pointed at the copied
 *      `openapi.json`.
 *
 * Only registered when both the spec AND the generated pages exist,
 * otherwise Docusaurus would error on the missing content directory.
 */
const dotnetApiPlugins: PluginConfig[] = hasOpenApiSpec && hasOpenApiPages
  ? [
      [
        '@docusaurus/plugin-content-docs',
        {
          id: 'dotnet-api',
          path: '_generated/dotnet-api/pages',
          routeBasePath: 'api/dotnet',
          sidebarPath: './sidebars/dotnet-api.ts',
          docItemComponent: '@theme/ApiItem',
        },
      ],
      [
        'docusaurus-plugin-openapi-docs',
        {
          id: 'dotnet-openapi',
          docsPluginId: 'dotnet-api',
          config: {
            core: {
              specPath: '_generated/dotnet-api/openapi.json',
              outputDir: '_generated/dotnet-api/pages',
              sidebarOptions: {groupPathsBy: 'tag'},
            } satisfies OpenApiPlugin.Options,
          },
        },
      ],
    ]
  : [];

const navbarItems = [
  {to: '/', label: 'Docs', position: 'left' as const},
  ...(hasOpenApiPages ? [{to: '/api/dotnet', label: '.NET API', position: 'left' as const}] : []),
  {to: '/internals/dotnet', label: '.NET internals', position: 'left' as const},
  {to: '/reference/typescript', label: 'TypeScript', position: 'left' as const},
  {to: '/internals/experimental', label: 'Experimental', position: 'left' as const},
  {href: 'https://github.com/arolariu/arolariu.ro', label: 'GitHub', position: 'right' as const},
];

const config: Config = {
  title: 'arolariu.ro docs',
  tagline: 'Unified documentation portal',
  favicon: 'img/favicon.ico',
  url: 'https://docs.arolariu.ro',
  baseUrl: '/',
  organizationName: 'arolariu',
  projectName: 'arolariu.ro',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  markdown: {format: 'detect', mermaid: true},
  i18n: {defaultLocale: 'en', locales: ['en']},
  headTags: [
    {tagName: 'meta', attributes: {name: 'theme-color', content: '#0a0b0d'}},
    {tagName: 'meta', attributes: {property: 'og:site_name', content: 'arolariu.ro docs'}},
    {tagName: 'meta', attributes: {property: 'og:type', content: 'article'}},
    {tagName: 'meta', attributes: {property: 'og:image', content: 'https://docs.arolariu.ro/img/og-card.png'}},
    {tagName: 'meta', attributes: {property: 'og:image:width', content: '1200'}},
    {tagName: 'meta', attributes: {property: 'og:image:height', content: '630'}},
    {tagName: 'meta', attributes: {name: 'twitter:card', content: 'summary_large_image'}},
    {tagName: 'meta', attributes: {name: 'twitter:image', content: 'https://docs.arolariu.ro/img/og-card.png'}},
  ],
  scripts: [
    {src: '/js/clarity.js', async: true},
  ],
  presets: [
    [
      'classic',
      {
        docs: false,
        blog: false,
        theme: {customCss: './src/css/custom.css'},
        sitemap: {
          changefreq: 'weekly',
          priority: 0.7,
          ignorePatterns: ['/404', '/search'],
          filename: 'sitemap.xml',
        },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'monorepo',
        path: 'docs',
        routeBasePath: '/',
        sidebarPath: './sidebars/monorepo.ts',
        editUrl: 'https://github.com/arolariu/arolariu.ro/tree/main/',
      },
    ],
    ...dotnetApiPlugins,
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'dotnet-internals',
        path: '_generated/dotnet-internals',
        routeBasePath: 'internals/dotnet',
        sidebarPath: './sidebars/dotnet-internals.ts',
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'ts-reference',
        path: '_generated/ts-reference',
        routeBasePath: 'reference/typescript',
        sidebarPath: './sidebars/ts-reference.ts',
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'python-internals',
        path: '_generated/experimental',
        routeBasePath: 'internals/experimental',
        sidebarPath: './sidebars/experimental.ts',
      },
    ],
    schemaJsonLdPlugin,
    '@easyops-cn/docusaurus-search-local',
  ],
  themes: [
    ...(hasOpenApiSpec ? ['docusaurus-theme-openapi-docs'] : []),
    '@docusaurus/theme-mermaid',
  ],
  themeConfig: {
    mermaid: {
      // Let Mermaid's built-in themes pick sensible colors per mode.
      // We only override the font family so diagrams match the site's mono type.
      // Diagrams themselves should avoid hardcoded fills/text colors so both modes render cleanly.
      theme: {light: 'neutral', dark: 'dark'},
      options: {
        themeVariables: {
          fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
        },
      },
    },
    navbar: {
      title: 'arolariu.ro',
      items: navbarItems,
    },
    footer: {style: 'dark', copyright: `© ${new Date().getFullYear()} arolariu.ro`},
    prism: {theme: prismThemes.github, darkTheme: prismThemes.dracula},
  } satisfies Preset.ThemeConfig,
};

export default config;
