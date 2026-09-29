import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/caseStudies' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    order: z.number(),
    tagline: z.string(),
    role: z.string(),
    period: z.string(),
    status: z.enum(['Production', 'System design']),
    stack: z.array(z.string()),
    metrics: z.array(z.object({ value: z.string(), label: z.string() })).max(4),
    summary: z.string(),
    ogTitle: z.string(),
    ogSubtitle: z.string().optional(),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
  }),
});

export const collections = { caseStudies, posts };
