import i18n from '../../lib/i18n';

type UserDisplaySource = {
  displayName?: string | null;
  email?: string | null;
};

export const getReadableUserName = (user: UserDisplaySource) => {
  const safeDisplayName = user.displayName?.trim();
  if (safeDisplayName) {
    return safeDisplayName;
  }

  const safeEmail = user.email?.trim();
  if (safeEmail) {
    return safeEmail;
  }

  return i18n.t('generic.user');
};

export const getUserInitials = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('') || i18n.t('generic.userInitial');
