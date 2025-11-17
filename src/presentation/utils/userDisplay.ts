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

  return 'Usuário';
};

export const getUserInitials = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('') || 'U';
