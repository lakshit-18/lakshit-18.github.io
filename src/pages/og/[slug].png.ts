import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { renderOg } from '../../lib/og';

export const getStaticPaths: GetStaticPaths = async () => {
  const cases = await getCollection('caseStudies');
  const posts = await getCollection('posts', (p) => !p.data.draft);
  return [
    { params: { slug: 'home' }, props: { title: 'Lakshit Lohar — Backend Software Engineer', subtitle: '~25K orders/month · 99.57% completion' } },
    { params: { slug: 'blog' }, props: { title: 'Engineering notes', subtitle: "Short write-ups on problems I've actually hit in production." } },
    { params: { slug: 'connecthub' }, props: { title: 'ConnectHub — Microservices Backend', subtitle: '6 microservices · Kafka · PostgreSQL + Neo4j' } },
    ...cases.map((c) => ({
      params: { slug: c.data.slug },
      props: { title: c.data.ogTitle, subtitle: c.data.ogSubtitle ?? c.data.metrics.slice(0, 2).map((m) => `${m.value} ${m.label}`).join(' · ') },
    })),
    ...posts.map((p) => ({ params: { slug: p.data.slug }, props: { title: p.data.title, subtitle: p.data.tags.join(' · ') } })),
  ];
};

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOg(props.title as string, props.subtitle as string);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
