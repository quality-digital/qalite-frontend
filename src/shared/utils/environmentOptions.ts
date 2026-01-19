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
