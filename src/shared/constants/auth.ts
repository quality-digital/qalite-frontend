export const ALLOWED_EMAIL_DOMAINS = ['qualitydigital.global', 'quality.com.br'] as const;

export const ALLOWED_EMAIL_DOMAINS_LABEL = ALLOWED_EMAIL_DOMAINS.map((domain) => `@${domain}`).join(
  ' ou ',
);
