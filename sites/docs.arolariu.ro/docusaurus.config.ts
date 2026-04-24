/**
 * @fileoverview Docusaurus site configuration for docs.arolariu.ro.
 *
 * @remarks
 * Registers four content-docs plugin instances (one per extractor
 * tier — monorepo prose, .NET internals, TypeScript reference,
 * Python experimental), the local schema.org JSON-LD plugin, local
 * search, Mermaid, custom head tags, and the console-aesthetic
 * theme customizations.
 *
 * HTTP API reference is intentionally not hosted here:
 * `api.arolariu.ro` serves Swagger UI at runtime from the live spec,
 * so the navbar links out to it rather than duplicating the browser.
 */

import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import {themes as prismThemes} from 'prism-react-renderer';
import schemaJsonLdPlugin from './src/plugins/schema-jsonld';

const navbarItems = [
  {to: '/', label: 'Docs', position: 'left' as const},
  {to: '/internals/dotnet', label: '.NET internals', position: 'left' as const},
  {to: '/reference/typescript', label: 'TypeScript', position: 'left' as const},
  {to: '/internals/experimental', label: 'Experimental', position: 'left' as const},
  {href: 'https://api.arolariu.ro/index.html', label: 'HTTP API', position: 'right' as const},
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
  onBrokenMarkdownLinks: 'throw',
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
  themes: ['@docusaurus/theme-mermaid'],
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
