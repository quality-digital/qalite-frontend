export const buildExternalLink = (value?: string | null) => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return { label: '', href: null };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return { label: trimmed, href: trimmed };
  }

  if (trimmed.includes('.')) {
    return { label: trimmed, href: `https://${trimmed}` };
  }

  return { label: trimmed, href: null };
};
