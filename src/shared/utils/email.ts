import { ALLOWED_EMAIL_DOMAINS } from '../constants/auth';

export const isAllowedEmailDomain = (email: string) => {
  const [, domain = ''] = email.split('@');
  const normalizedDomain = domain.trim().toLowerCase();

  if (!normalizedDomain) {
    return false;
  }

  return ALLOWED_EMAIL_DOMAINS.some((allowedDomain) => allowedDomain === normalizedDomain);
};
