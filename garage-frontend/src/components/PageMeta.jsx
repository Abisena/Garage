import { useEffect } from 'react';
import { getPageMeta, PAGE_PATHS } from '../lib/pageMeta';

const upsertMeta = (attribute, key, content) => {
  if (!content) return;

  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const upsertLink = (rel, href) => {
  if (!href) return;

  let tag = document.head.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
};

export function PageMeta({ pageId = 'dashboard' }) {
  useEffect(() => {
    const { fullTitle, description } = getPageMeta(pageId);
    const path = PAGE_PATHS[pageId] || PAGE_PATHS.dashboard;
    const canonical = `${window.location.origin}${path}`;

    document.title = fullTitle;

    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertLink('canonical', canonical);
  }, [pageId]);

  return null;
}

export default PageMeta;
