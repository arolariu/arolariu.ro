import type {Plugin, LoadContext} from '@docusaurus/types';

export default function schemaJsonLdPlugin(_context: LoadContext): Plugin {
  return {
    name: 'schema-jsonld',
    injectHtmlTags() {
      const ld = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'arolariu.ro docs',
        url: 'https://docs.arolariu.ro',
        description: 'Unified reference portal for api.arolariu.ro (.NET), arolariu.ro (TypeScript), and exp.arolariu.ro (Python).',
        publisher: {
          '@type': 'Organization',
          name: 'arolariu.ro',
          url: 'https://arolariu.ro',
          logo: {
            '@type': 'ImageObject',
            url: 'https://docs.arolariu.ro/img/og-card.png',
          },
        },
        author: {
          '@type': 'Person',
          name: 'Alexandru-Razvan Olariu',
          url: 'https://arolariu.ro',
        },
      };
      return {
        headTags: [
          {
            tagName: 'script',
            attributes: {type: 'application/ld+json'},
            innerHTML: JSON.stringify(ld),
          },
        ],
      };
    },
  };
}
