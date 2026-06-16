export function resolveLanguage(
  lang: string,
  supported: readonly string[],
  fallback: string,
): string {
  if (supported.includes(lang)) return lang;
  const primary = lang.split("-")[0];
  return supported.find((s) => s.split("-")[0] === primary) ?? fallback;
}
