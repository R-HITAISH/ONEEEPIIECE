export type DevDataMode = 'demo' | 'worst' | 'empty' | 'one' | '300';

export function getDevMode(): DevDataMode | null {
  if (!import.meta.env.DEV) return null;
  const value = new URLSearchParams(window.location.search).get('data');
  return value === 'demo' || value === 'worst' || value === 'empty' || value === 'one' || value === '300' ? value : null;
}
