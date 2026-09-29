import satori from 'satori';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const fontDir = path.resolve('node_modules/@fontsource/inter/files');
let fonts: { name: string; data: Buffer; weight: 400 | 700; style: 'normal' }[] | null = null;
async function loadFonts() {
  if (!fonts) {
    fonts = [
      { name: 'Inter', data: await fs.readFile(path.join(fontDir, 'inter-latin-400-normal.woff')), weight: 400, style: 'normal' },
      { name: 'Inter', data: await fs.readFile(path.join(fontDir, 'inter-latin-700-normal.woff')), weight: 700, style: 'normal' },
    ];
  }
  return fonts;
}

const h = (type: string, style: Record<string, unknown>, children?: unknown) => ({ type, props: { style, children } });

/** 1200×630 OG card: dark background, "LL" monogram, title (64px), metric subtitle. */
export async function renderOg(title: string, subtitle: string): Promise<Buffer> {
  const tree = h(
    'div',
    { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0B0F14', padding: '72px 80px', fontFamily: 'Inter', color: '#E6EDF3' },
    [
      h('div', { display: 'flex', alignItems: 'center', gap: '20px' }, [
        h('div', { width: '72px', height: '72px', borderRadius: '18px', background: '#2DD4BF', color: '#0B0F14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 700, letterSpacing: '-1px' }, 'LL'),
        h('div', { fontSize: '28px', color: '#9AA7B4', fontWeight: 400 }, 'Lakshit Lohar · Backend Software Engineer'),
      ]),
      h('div', { display: 'flex', flexDirection: 'column', gap: '24px' }, [
        h('div', { fontSize: '64px', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-2px', maxWidth: '1040px' }, title),
        h('div', { fontSize: '30px', color: '#2DD4BF', fontWeight: 400 }, subtitle),
      ]),
      h('div', { display: 'flex', height: '6px', width: '120px', background: '#2DD4BF', borderRadius: '3px' }),
    ],
  );
  const svg = await satori(tree as any, { width: 1200, height: 630, fonts: await loadFonts() });
  return sharp(Buffer.from(svg)).png().toBuffer();
}
