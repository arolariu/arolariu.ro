import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import {themes as prismThemes} from 'prism-react-renderer';

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
        docs: {
          sidebarPath: './sidebars/monorepo.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/arolariu/arolariu.ro/tree/main/',
        },
        blog: false,
        theme: {customCss: './src/css/custom.css'},
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'arolariu.ro',
      items: [{type: 'docSidebar', sidebarId: 'monorepoSidebar', position: 'left', label: 'Docs'}],
    },
    footer: {style: 'dark', copyright: `© ${new Date().getFullYear()} arolariu.ro`},
    prism: {theme: prismThemes.github, darkTheme: prismThemes.dracula},
  } satisfies Preset.ThemeConfig,
};

export default config;
