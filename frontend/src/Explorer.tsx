import { useRef, useState } from 'react';
import { Button, Checkbox, CounterLabel, FormControl, Pagination, Select, TextInput } from '@primer/react';
import { ArrowDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon, GitCompareIcon, SearchIcon, XIcon } from '@primer/octicons-react';
import { geographic, number, regions, type Row } from './data';
import { compareLink, url } from './navigation';

type SortKey = 'territory' | 'ranking' | 'score' | 'risk' | 'potential';
type Filters = { query: string; region: string; uf: string };
const emptyFilters: Filters = { query: '', region: '', uf: '' };
const pageSize = 20;
const norm = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function Explorer({ rows, period, queryParams, pinned, toggle, clearSelection }: {
  rows: Row[]; period: string; queryParams: URLSearchParams; pinned: string[];
  toggle: (id: string) => void; clearSelection: () => void;
}) {
  const [filters, setFilters] = useState<Filters>(() => {
    const region = regions.find(value => value === queryParams.get('regiao')) || '';
    const uf = queryParams.get('uf') || '';
    return { query: queryParams.get('q') || '', region, uf: rows.some(row => row.uf === uf && (!region || row.regiao === region)) ? uf : '' };
  });
  const [page, setPage] = useState(1);
  const results = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({ key: 'ranking', descending: false });
  const { query, region, uf } = filters;
  const states = [...new Set(rows.filter(row => !region || row.regiao === region).map(row => row.uf))].sort();
  const terms = norm(query.trim()).split(/\s+/).filter(Boolean);
  const shown = rows.filter(row => {
    if ((region && row.regiao !== region) || (uf && row.uf !== uf)) return false;
    const searchable = norm(row.name + ' ' + geographic(row) + ' ' + row.regiao);
    return terms.every(term => searchable.includes(term));
  }).sort((a, b) => {
    const direction = sort.descending ? -1 : 1;
    if (sort.key === 'territory') return a.id.localeCompare(b.id) * direction;
    const av = a[sort.key], bv = b[sort.key];
    if (av == null) return bv == null ? a.id.localeCompare(b.id) : 1;
    if (bv == null) return -1;
    return (av - bv) * direction || a.id.localeCompare(b.id);
  });
  const selected = pinned.filter(id => rows.some(row => row.id === id));
  const start = (page - 1) * pageSize;
  const pageCount = Math.ceil(shown.length / pageSize);

  function updateFilters(next: Filters) {
    setFilters(next);
    setPage(1);
    const params: Record<string, string> = {};
    if (next.query.trim()) params.q = next.query.trim();
    if (next.region) params.regiao = next.region;
    if (next.uf) params.uf = next.uf;
    window.history.replaceState(null, '', url('subregioes', period, undefined, params));
  }

  function heading(key: SortKey, name: string, className = '') {
    const current = sort.key === key;
    const Icon = sort.descending ? ArrowDownIcon : ArrowUpIcon;
    return <th scope="col" className={className} aria-sort={current ? (sort.descending ? 'descending' : 'ascending') : undefined}>
      <Button variant="invisible" size="small" className="sort-button" trailingVisual={current ? Icon : undefined}
        onClick={() => { setSort({ key, descending: current ? !sort.descending : key !== 'ranking' && key !== 'territory' }); setPage(1); }}>{name}</Button>
    </th>;
  }

  return <section className="data-surface explorer" aria-label="Explorar sub-regiões">
    <div className="explorer-toolbar">
      <FormControl className="territory-search">
        <FormControl.Label>Buscar</FormControl.Label>
        <TextInput block leadingVisual={SearchIcon} placeholder="Nome, UF ou prefixo de CEP"
          type="search" value={query} onChange={e => updateFilters({ ...filters, query: e.target.value })} />
      </FormControl>
      <FormControl>
        <FormControl.Label>Região</FormControl.Label>
        <Select block value={region} onChange={e => updateFilters({ ...filters, region: e.target.value, uf: '' })}>
          <Select.Option value="">Todas</Select.Option>{regions.map(r => <Select.Option value={r} key={r}>{r}</Select.Option>)}
        </Select>
      </FormControl>
      <FormControl>
        <FormControl.Label>UF</FormControl.Label>
        <Select block value={uf} onChange={e => updateFilters({ ...filters, uf: e.target.value })}>
          <Select.Option value="">Todas</Select.Option>{states.map(r => <Select.Option value={r} key={r}>{r}</Select.Option>)}
        </Select>
      </FormControl>
      {(query || region || uf) && <Button variant="invisible" leadingVisual={XIcon} onClick={() => updateFilters(emptyFilters)}>Limpar filtros</Button>}
    </div>
    <div className="results-bar">
      <p role="status"><strong>{shown.length}</strong> {shown.length === 1 ? 'sub-região' : 'sub-regiões'}</p>
      {selected.length > 0 && <div className="bulk-actions">
        <Button variant="invisible" onClick={clearSelection}>Limpar seleção</Button>
        <Button as="a" variant="primary" leadingVisual={GitCompareIcon} href={compareLink(period, selected)}>
          Comparar <CounterLabel>{selected.length}</CounterLabel>
        </Button>
      </div>}
    </div>
    {shown.length ? <>
      <div ref={results} className="table-scroll explorer-results" tabIndex={0} aria-label="Tabela de sub-regiões">
        <table className="territory-table">
          <thead><tr>
            <th scope="col" className="check-column"><span className="sr-only">Selecionar para comparar</span></th>
            {heading('territory', 'Sub-região')}
            <th scope="col" className="secondary-column">Região</th>
            {heading('ranking', 'Posição', 'numeric rank-column')}
            {heading('score', 'Score', 'numeric score-column')}
            {heading('risk', 'Risco', 'numeric secondary-column')}
            {heading('potential', 'Oportunidade', 'numeric secondary-column')}
            <th scope="col" className="secondary-column">Faixa</th>
          </tr></thead>
          <tbody>{shown.slice(start, start + pageSize).map(row => {
            const checked = selected.includes(row.id);
            return <tr key={row.id} className={checked ? 'current-row' : undefined}>
              <td className="check-column"><label className="check-target">
                <Checkbox aria-label={'Comparar ' + geographic(row)} checked={checked} disabled={selected.length >= 5 && !checked} onChange={() => toggle(row.id)} />
              </label></td>
              <th scope="row"><a href={url('sub', period, row.id)}>{geographic(row)}</a>
                {row.name !== geographic(row) && <small className="territory-alias">{row.name}</small>}
                <small className="mobile-data">Risco {number(row.risk)} · Oport. {number(row.potential)}</small>
              </th>
              <td className="secondary-column">{row.regiao}</td>
              <td className="numeric rank-column">{row.ranking != null ? row.ranking + 'º' : '—'}</td>
              <td className="numeric score-column"><strong>{number(row.score)}</strong></td>
              <td className="numeric secondary-column">{number(row.risk)}</td>
              <td className="numeric secondary-column">{number(row.potential)}</td>
              <td className="secondary-column">{row.faixa || '—'}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>{start + 1}–{Math.min(start + pageSize, shown.length)} de {shown.length}</span>
        {pageCount > 1 && <Pagination currentPage={page} pageCount={pageCount}
          aria-label="Páginas da tabela"
          showPages={{ narrow: false, regular: true, wide: true }}
          onPageChange={(event, next) => {
            event.preventDefault();
            setPage(next);
            results.current?.scrollTo({ top: 0 });
            results.current?.focus({ preventScroll: true });
            results.current?.scrollIntoView({ block: 'nearest' });
          }}
          renderPage={({ key, number: value, children: _label, ...props }) => <a key={key} {...props}
            data-component={props.rel === 'prev' ? 'Pagination.PreviousPage' : props.rel === 'next' ? 'Pagination.NextPage' : 'Pagination.Page'}
            aria-label={props.rel === 'prev' ? 'Página anterior' : props.rel === 'next' ? 'Próxima página' : 'Página ' + value}>
            {props.rel === 'prev' ? <><ChevronLeftIcon /> Anterior</> : props.rel === 'next' ? <>Próxima <ChevronRightIcon /></> : value}
          </a>} />}
      </div>
    </> : <div className="empty table-empty"><SearchIcon size={28} /><h2>Nenhuma sub-região encontrada</h2>
      <p>Revise a busca ou limpe os filtros para voltar à lista.</p><Button onClick={() => updateFilters(emptyFilters)}>Limpar filtros</Button></div>}
  </section>;
}
