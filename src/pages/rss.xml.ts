import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { site } from '../data/site';

export async function GET(context: APIContext) {
  const posts = (await getCollection('posts', (p) => !p.data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );
  return rss({
    title: `${site.name} — Engineering notes`,
    description: "Short write-ups on problems I've actually hit in production.",
    site: context.site!,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      link: `/blog/${p.data.slug}`,
      categories: p.data.tags,
      author: `${site.email} (${site.name})`,
    })),
    customData: '<language>en</language>',
  });
}
