import { useSyncExternalStore } from 'react';

export const pages = [
  ['geral', 'Panorama'], ['subregioes', 'Sub-regiões'], ['comparar', 'Comparar'],
  ['indicadores', 'Indicadores'], ['metodologia', 'Metodologia'],
] as const;
export type Page = typeof pages[number][0] | 'sub';
const subscribe = (notify: () => void) => {
  window.addEventListener('hashchange', notify);
  return () => window.removeEventListener('hashchange', notify);
};
export function useRoute() {
  const hash = useSyncExternalStore(subscribe, () => location.hash);
  const [path, search] = hash.replace(/^#\/?/, '').split('?');
  const [name, id = ''] = path.split('/');
  const page: Page = name === 'sub' ? 'sub' : pages.find(([p]) => p === name)?.[0] || 'geral';
  return { page, id, query: new URLSearchParams(search) };
}
export function url(page: Page, m?: string, id?: string, additional?: Record<string, string>) {
  const query = new URLSearchParams(additional);
  if (m) query.set('mes', m);
  const path = page === 'geral' ? '' : page + (id ? '/' + encodeURIComponent(id) : '');
  return '#/' + path + (query.size ? '?' + query.toString() : '');
}

export const compareLink = (period: string, ids: string[]) => url('comparar', period, undefined, { s: ids.join(',') });
