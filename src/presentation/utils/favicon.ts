export const SYSTEM_FAVICON_FALLBACK = '/assets/logo.png';

const faviconFailureCache = new Set<string>();

const normalizeStoreUrl = (site: string | null | undefined): URL | null => {
  const value = site?.trim();
  if (!value) {
    return null;
  }

  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
};

export const getStoreFaviconCandidates = (site: string | null | undefined): string[] => {
  const url = normalizeStoreUrl(site);
  if (!url) {
    return [SYSTEM_FAVICON_FALLBACK];
  }

  const candidates = [
    `${url.origin}/favicon.ico`,
    `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url.href)}&sz=64`,
  ].filter((src) => !faviconFailureCache.has(src));

  return candidates.length > 0 ? [...candidates, SYSTEM_FAVICON_FALLBACK] : [SYSTEM_FAVICON_FALLBACK];
};

export const markStoreFaviconFailed = (src: string) => {
  if (src && src !== SYSTEM_FAVICON_FALLBACK) {
    faviconFailureCache.add(src);
  }
};
