import { defineConfig } from 'astro/config';
import { remarkQuantities } from './src/lib/remark-quantities.ts';
import { rehypeSections } from './src/lib/rehype-sections.ts';

export default defineConfig({
  site: 'https://janitaberlin.github.io',
  base: '/recipebook',
  image: { layout: 'constrained' },
  markdown: {
    remarkPlugins: [remarkQuantities],
    rehypePlugins: [rehypeSections],
  },
});
