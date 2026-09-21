import { load } from 'cheerio';
import robotsParser from 'robots-parser';
import { setTimeout as delay } from 'node:timers/promises';
import { fetchPage, userAgent } from './fetch-page.js';

export const ceramaOrigin = 'https://ceramamarket.com';
export const ceramaSections = {
  tiles: { path: '/plutka', department: 'Плитка' },
  plumbing: { path: '/santehnica', department: 'Сантехніка' },
  flooring: { path: '/pokryttya-dlya-pidlohy', department: 'Покриття для підлоги' },
  panels: { path: '/paneli', department: 'Панелі' },
};
const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
function sameSite(value) {
  const url = new URL(value, ceramaOrigin);
  if (url.origin !== ceramaOrigin || url.username || url.password) throw new Error('Unexpected Ceramamarket URL');
  return url;
}

export function parseCeramaPage(html, section, page = 1) {
  const config = ceramaSections[section];
  if (!config) throw new Error('Unknown Ceramamarket section');
  const $ = load(html);
  const categories = new Map();
  $('a[href]').each((_, element) => {
    const name = clean($(element).text());
    if (!name) return;
    try {
      const url = sameSite($(element).attr('href'));
      if (url.pathname.startsWith(config.path + '/') && url.pathname.split('/').filter(Boolean).length === 2 && !url.search) categories.set(url.pathname, name);
    } catch { /* Navigation can contain external links. */ }
  });
  const cards = $('.products-list .product-card');
  if (!cards.length) throw new Error('No product cards found; existing section preserved');
  const products = [];
  let skipped = 0;
  const ids = [];
  cards.each((_, element) => {
    const card = $(element);
    const link = card.find('.product-card__title').first();
    // Some real catalog cards have no detail-page link at all. Keep their stable
    // catalog ID and explicit price; do not invent a subcategory or product URL.
    const href = clean(link.attr('href'));
    const url = sameSite(href || config.path);
    if (href && !url.pathname.startsWith(config.path + '/')) throw new Error('Product belongs to another section');
    const externalId = card.find('.like-btn[data-id]').attr('data-id');
    if (!externalId || !/^\d+$/.test(externalId)) throw new Error('Missing product ID');
    ids.push(externalId);
    const rawPrice = clean(card.find('.product-card__price').text()).replace(/\s/g, '').replace(',', '.');
    if (!rawPrice || Number(rawPrice) === 0) { skipped++; return; }
    if (!/^\d+(\.\d+)?$/.test(rawPrice) || !Number.isFinite(Number(rawPrice))) throw new Error(`Invalid price for product ${externalId}`);
    const dimension = clean(card.find('.product-card__dimension').text());
    const unitMatch = dimension.match(/^грн\s*\/\s*(.+)$/iu);
    if (!unitMatch) throw new Error(`Expected explicit UAH unit for product ${externalId}`);
    const name = clean(link.text());
    if (!name) throw new Error('Missing product name');
    const status = clean(card.find('.product-card__warning').text()).toLowerCase();
    const stock = /немає|відсутн|не в наявності/.test(status) ? 'Немає в наявності' : /в наявності/.test(status) ? 'В наявності' : /замовлення/.test(status) ? 'Під замовлення' : 'Наявність невідома';
    const categoryPath = '/' + url.pathname.split('/').filter(Boolean).slice(0, 2).join('/');
    const category = href ? categories.get(categoryPath) : 'Інше';
    if (!category) throw new Error(`Missing category label: ${categoryPath}`);
    const image = card.find('.product-card__img img').attr('src');
    products.push({ sourceId: 'ceramamarket', externalId, sourceUrl: url.href, importedAt: new Date().toISOString(),
      name, article: '', brand: clean(card.find('.product-card__producer:not(.product-card__collection) .producer__name').first().text()),
      category, department: config.department, supplier: 'Ceramamarket', section,
      price: Number(rawPrice), currency: 'UAH', unit: unitMatch[1].replace('м2', 'м²'), stock,
      image: image ? sameSite(image).href : '', color: '', segment: 'Не визначено', installation: '' });
  });
  const pageNumbers = $('.paginator__list a[href]').toArray().flatMap((a) => {
    try { return [Number(sameSite($(a).attr('href')).searchParams.get('page')) || 1]; } catch { return []; }
  });
  const active = clean($('.paginator__list-item.active').text());
  if (active && Number(active) !== page) throw new Error('Server returned the wrong catalog page');
  const pages = Math.max(page, 1, ...pageNumbers);
  const nextHref = $('link[rel="next"]').attr('href');
  if (nextHref) {
    const next = sameSite(nextHref);
    if (next.pathname !== config.path || Number(next.searchParams.get('page')) !== page + 1) throw new Error('Unexpected next catalog page');
  }
  if (page < pages && !nextHref) throw new Error('Missing next catalog page');
  return { products, skipped, ids, pages, hasNext: Boolean(nextHref) };
}

export async function collectCerama(section, { fetcher = fetchPage, sleep = delay, progress = () => {} } = {}) {
  const config = ceramaSections[section];
  if (!config) throw new Error('Unknown Ceramamarket section');
  const robotsResponse = await fetcher(`${ceramaOrigin}/robots.txt`, ceramaOrigin, 3);
  if (![200, 404].includes(robotsResponse.status)) throw new Error('Could not verify robots.txt');
  const robots = robotsParser(`${ceramaOrigin}/robots.txt`, robotsResponse.status === 200 ? robotsResponse.body : '');
  const interval = Math.max(1000, (robots.getCrawlDelay(userAgent) || 0) * 1000);
  if (interval > 60000) throw new Error('Crawl delay too long for interactive import');
  const products = new Map();
  const seen = new Set();
  let skipped = 0;
  let expectedPages;
  for (let page = 1; page <= 1000; page++) {
    const url = `${ceramaOrigin}${config.path}?on_page=150&page=${page}`;
    if (robots.isAllowed(url, userAgent) === false) throw new Error('Disallowed by robots.txt');
    await sleep(interval);
    const response = await fetcher(url, ceramaOrigin, 3);
    if (response.status !== 200) throw new Error(`HTTP ${response.status} on page ${page}`);
    const parsed = parseCeramaPage(response.body, section, page);
    expectedPages ??= parsed.pages;
    if (parsed.pages !== expectedPages) throw new Error('Page count changed during import; retry');
    let added = 0;
    for (const id of parsed.ids) { if (!seen.has(id)) added++; seen.add(id); }
    if (!added) throw new Error('Repeated catalog page; existing section preserved');
    for (const product of parsed.products) products.set(product.externalId, product);
    skipped += parsed.skipped;
    progress({ page, pages: expectedPages, products: products.size });
    if (!parsed.hasNext) return { products: [...products.values()], skipped, pages: page, listed: seen.size };
  }
  throw new Error('Catalog page limit exceeded');
}
