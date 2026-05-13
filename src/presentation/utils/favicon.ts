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

export const getStoreFaviconUrl = (site: string | null | undefined): string => {
  const url = normalizeStoreUrl(site);
  if (!url) {
    return SYSTEM_FAVICON_FALLBACK;
  }

  const faviconUrl = `${url.origin}/favicon.ico`;
  return faviconFailureCache.has(faviconUrl) ? SYSTEM_FAVICON_FALLBACK : faviconUrl;
};

export const markStoreFaviconFailed = (src: string) => {
  if (src && src !== SYSTEM_FAVICON_FALLBACK) {
    faviconFailureCache.add(src);
  }
};
