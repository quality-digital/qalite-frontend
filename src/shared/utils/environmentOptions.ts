export const translateEnvironmentOption = (
  value: string | null | undefined,
  t: (key: string) => string,
) => {
  if (!value) {
    return '';
  }

  if (value.startsWith('environmentOptions.')) {
    return t(value);
  }

  const key = `environmentOptions.${value}`;
  const translated = t(key);
  return translated === key ? value : translated;
};

export const requiresReleaseField = (environmentType: string | null | undefined): boolean => {
  const normalized =
    typeof environmentType === 'string' ? environmentType.trim().toUpperCase() : '';
  return normalized === 'TM';
};
