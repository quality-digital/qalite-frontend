export const normalizeEmailDomain = (domain: string | null | undefined): string | null => {
  const normalized = (domain ?? '').replace(/^@+/, '').trim().toLowerCase();
  return normalized || null;
};

const getEmailDomain = (email: string): string | null => {
  const [, domain = ''] = email.split('@');
  return domain ? domain.trim() : null;
};

export const getNormalizedEmailDomain = (email: string): string | null =>
  normalizeEmailDomain(getEmailDomain(email));
