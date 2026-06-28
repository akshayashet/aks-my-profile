import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

function createSiteName(fragment) {
  const navRoot = fragment?.querySelector('nav') || fragment;
  const titleElement = navRoot?.querySelector('h1, h2, .site-name, .brand, .logo');
  if (titleElement?.textContent.trim()) {
    const heading = document.createElement('h1');
    heading.textContent = titleElement.textContent.trim();
    return heading;
  }

  const metadataTitle = getMetadata('title') || getMetadata('og:title');
  if (metadataTitle) {
    const heading = document.createElement('h1');
    heading.textContent = metadataTitle;
    return heading;
  }

  if (document.title) {
    const heading = document.createElement('h1');
    heading.textContent = document.title;
    return heading;
  }

  return null;
}

function createNavLinks(fragment) {
  const navRoot = fragment?.querySelector('nav') || fragment;
  const anchors = [...(navRoot?.querySelectorAll('a[href]') || [])]
    .filter((anchor) => {
      const href = anchor.getAttribute('href');
      return href && !href.startsWith('mailto:') && !href.startsWith('tel:');
    });
  if (anchors.length) {
    const list = document.createElement('ul');
    anchors.forEach((anchor) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = anchor.href;
      link.textContent = anchor.textContent.trim() || anchor.href;
      link.className = 'header-nav-link';
      item.append(link);
      list.append(item);
    });
    return list;
  }

  const listItems = [...(navRoot?.querySelectorAll('li') || [])]
    .filter((li) => li.textContent.trim());
  if (!listItems.length) return null;

  const list = document.createElement('ul');
  listItems.forEach((sourceItem) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    const text = sourceItem.textContent.trim();
    link.textContent = text;
    link.className = 'header-nav-link';
    const normalizedHref = text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    link.href = `#${normalizedHref}`;
    item.append(link);
    list.append(item);
  });
  return list;
}

export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  const nav = document.createElement('nav');
  const container = document.createElement('div');
  container.className = 'header-inner';

  const siteName = createSiteName(fragment);
  const navLinks = createNavLinks(fragment);

  if (siteName) {
    const brand = document.createElement('div');
    brand.className = 'header-brand';
    brand.append(siteName);
    container.append(brand);
  }

  if (navLinks) {
    const navBlock = document.createElement('div');
    navBlock.className = 'header-nav';
    navBlock.append(navLinks);
    container.append(navBlock);
  }

  if (!siteName && !navLinks) {
    block.textContent = '';
    return;
  }

  nav.append(container);
  block.append(nav);
}