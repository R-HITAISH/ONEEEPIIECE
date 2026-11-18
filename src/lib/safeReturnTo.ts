export function safeReturnTo(value: string | null | undefined, fallback = '/account'): string {
  if (!value || value.length > 300) return fallback;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 32 || code === 127) return fallback;
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}
