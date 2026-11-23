import { Button, FormControl, TextInput } from '@primer/react';
import { PlusIcon, SearchIcon } from '@primer/octicons-react';
import { useRef, useState } from 'react';
import { geographic, type Row } from './data';
import { compareLink } from './navigation';
import { searchTerritories, territoryName } from './territorySearch';
import { TerritoryLabel } from './TerritoryLabel';

export function CompareSearch({ rows, period, activeIds }: { rows: Row[]; period: string; activeIds: string[] }) {
  const [query, setQuery] = useState('');
  const field = useRef<HTMLInputElement>(null);
  if (activeIds.length >= 5) return <p className="compare-search-status">Limite de 5 sub-regiões. Remova uma para continuar.</p>;
  const available = rows.filter(row => !activeIds.includes(row.id));
  const hits = searchTerritories(available, query).sort((a, b) => a.id.localeCompare(b.id));
  const searching = !!query.trim();
  const shown = searching ? hits : [];

  return <div className="compare-search">
    <FormControl>
      <FormControl.Label>Adicionar sub-região</FormControl.Label>
      <TextInput ref={field} block type="search" name="busca-comparacao" autoComplete="off" spellCheck={false}
        leadingVisual={SearchIcon} placeholder="Cidade, UF, região ou CEP" value={query}
        onChange={event => setQuery(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter' && hits.length === 1 && searching) {
            setQuery('');
            location.hash = compareLink(period, [...activeIds, hits[0].id]);
          }
        }} />
    </FormControl>
    {searching && <p role="status" className="compare-search-status">{hits.length
      ? hits.length === 1 ? '1 sub-região encontrada' : hits.length + ' sub-regiões encontradas'
      : 'Sem resultados. Tente a UF ou os dois primeiros dígitos do CEP.'}</p>}
    {shown.length > 0 && <ul className="compare-search-results" aria-label="Sub-regiões disponíveis">
      {shown.map(row => {
        return <li key={row.id}><Button as="a" variant="invisible" alignContent="start" trailingVisual={PlusIcon}
          aria-label={'Adicionar ' + geographic(row) + ' · ' + territoryName(row, query)}
          href={compareLink(period, [...activeIds, row.id])}
          onClick={event => {
            if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
              setQuery('');
              field.current?.focus({ preventScroll: true });
            }
          }}>
          <TerritoryLabel row={row} query={query} />
        </Button></li>;
      })}
    </ul>}
  </div>;
}
