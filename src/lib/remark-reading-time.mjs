import getReadingTime from 'reading-time';
import { toString } from 'mdast-util-to-string';

/** Adds `readingTime` (e.g. "6 min read") to each MDX file's frontmatter. */
export function remarkReadingTime() {
  return function (tree, { data }) {
    const stats = getReadingTime(toString(tree));
    data.astro.frontmatter.readingTime = `${Math.max(1, Math.round(stats.minutes))} min read`;
  };
}
