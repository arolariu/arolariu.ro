import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {Config, PluginConfig} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type * as OpenApiPlugin from 'docusaurus-plugin-openapi-docs';
import {themes as prismThemes} from 'prism-react-renderer';

// Docusaurus loads this config via jiti, which transpiles to CJS and does NOT
// support `import.meta.dirname`. Resolve paths relative to the config file by
// using the process cwd fallback to `__dirname` only where available.
const CONFIG_DIR = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));
const GENERATED_ROOT = join(CONFIG_DIR, '_generated');
const OPENAPI_SPEC = join(GENERATED_ROOT, 'dotnet-api', 'openapi.json');
const OPENAPI_PAGES = join(GENERATED_ROOT, 'dotnet-api', 'pages');
const hasOpenApiSpec = existsSync(OPENAPI_SPEC);
const hasOpenApiPages = existsSync(OPENAPI_PAGES);

const dotnetApiPlugins: PluginConfig[] = hasOpenApiSpec
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
  markdown: {format: 'detect'},
  i18n: {defaultLocale: 'en', locales: ['en']},
  presets: [
    [
      'classic',
      {
        docs: false,
        blog: false,
        theme: {customCss: './src/css/custom.css'},
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
    '@easyops-cn/docusaurus-search-local',
  ],
  themes: hasOpenApiSpec ? ['docusaurus-theme-openapi-docs'] : [],
  themeConfig: {
    navbar: {
      title: 'arolariu.ro',
      items: navbarItems,
    },
    footer: {style: 'dark', copyright: `© ${new Date().getFullYear()} arolariu.ro`},
    prism: {theme: prismThemes.github, darkTheme: prismThemes.dracula},
  } satisfies Preset.ThemeConfig,
};

export default config;
