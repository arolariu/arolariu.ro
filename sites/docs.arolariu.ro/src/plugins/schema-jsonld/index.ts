/**
 * @fileoverview Local Docusaurus plugin that injects a site-level
 * schema.org JSON-LD block into every page.
 *
 * @remarks
 * Emits a `WebSite` schema with `publisher` (Organization) and
 * `author` (Person) sub-objects so search engines have a consistent
 * site identity across every doc page. Per-page `TechArticle`
 * enrichment is a future enhancement (flagged in the spec) — it
 * would require reading per-doc metadata that isn't uniformly
 * exposed through the `injectHtmlTags` lifecycle.
 */

import type {Plugin, LoadContext} from '@docusaurus/types';

/**
 * Docusaurus plugin factory. Docusaurus calls this during site load
 * and invokes the returned plugin's lifecycle hooks at build time.
 */
export default function schemaJsonLdPlugin(_context: LoadContext): Plugin {
  return {
    name: 'schema-jsonld',
    /**
     * `injectHtmlTags` runs once per locale and its return value is
     * inlined into the `<head>` of every generated HTML page. We emit
     * a single `application/ld+json` script describing the site.
     */
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
