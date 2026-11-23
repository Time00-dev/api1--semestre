import { ArrowDown, ArrowUp, ArrowLeft, ArrowRight, ArrowUpRight,
  Database, GitCompareArrows,
  MessageSquareText, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Assistant } from './Assistant';
import { RiskPlot, Trend } from './Charts';
import { geographic, indicators, loadDataWithRetry, mean, month, note, number, potentialKeys,
  rank, regions, riskKeys, series, type Dataset, type Indicator, type Row } from './data';
import { url, useRoute } from './navigation';
import { MethodLink, Period } from './Controls';
import { Shell } from './Shell';
import { ThemeContext, useThemePreference } from './theme';

const norm = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const repo = 'https://github.com/Time00-dev/api1--semestre';
const notebook = repo + '/blob/main/backend/GJ00_46.ipynb';
const compareLink = (m: string, ids: string[]) => url('comparar', m, undefined, { s: ids.join(',') });
const diff = (a?: number | null, b?: number | null) => a == null || b == null ? null : a - b;
const change = (d: number | null) => d == null ? '—' : (d > 0 ? '+' : '') + number(d);

function App() {
  const route = useRoute();
  const { theme, toggleTheme } = useThemePreference();
  const [data, setData] = useState<Dataset>();
  const [error, setError] = useState('');
  const [attempt, retry] = useState(0);
  const [analysis, setAnalysis] = useState<{ period: string; rows: Row[] }>();
  const [selected, setSelected] = useState('');
  const [pinned, setPinned] = useState<string[]>([]);
  const months = data?.months || [];
  const candidate = route.query.get('mes') || '';
  const period = months.includes(candidate) ? candidate : months.at(-1) || '';
  const rows = data?.byMonth.get(period) || [];
  const ranking = useMemo(() => rank(rows), [rows]);
  const active = rows.find(row => row.id === (route.query.get('foco') || selected)) || ranking[0] || rows[0];
  const pinnedRows = pinned.filter(id => rows.some(row => row.id === id));
  useEffect(() => {
    const controller = new AbortController();
    loadDataWithRetry(controller.signal).then(setData).catch(err => {
      if (!controller.signal.aborted) setError(err.message);
    });
    return () => controller.abort();
  }, [attempt]);

  const openAnalysis = (items: Row[]) => setAnalysis({ period, rows: items });
  function select(id: string) {
    setSelected(id);
    window.history.replaceState(null, '', url('geral', period, undefined, { foco: id }));
  }
  function togglePinned(id: string) {
    setPinned(current => current.includes(id) ? current.filter(item => item !== id) :
      current.length < 5 ? [...current, id] : current);
  }
  const changePeriod = (next: string) => {
    location.hash = url(route.page, next, route.id, Object.fromEntries(route.query));
    setAnalysis(undefined);
  };
  const isMethod = route.page === 'metodologia';
  const ready = data && period;
  const methodSection = isMethod ? route.query.get('secao') : null;
  const routeId = route.page + '/' + route.id;
  const previousRoute = useRef(routeId);
  useEffect(() => {
    if (methodSection) {
      const element = document.getElementById('method-' + methodSection);
      element?.focus({ preventScroll: true });
      element?.scrollIntoView({ block: 'start' });
    } else if (previousRoute.current !== routeId) {
      window.scrollTo({ top: 0 });
      document.getElementById('conteudo')?.focus({ preventScroll: true });
    }
    previousRoute.current = routeId;
  }, [methodSection, routeId]);

  return <ThemeContext.Provider value={theme}>
    <div className="workspace">
    <a href="#conteudo" className="skip" onClick={event => { event.preventDefault(); document.getElementById('conteudo')?.focus(); }}>Pular para o conteúdo</a>
    <Shell page={route.page} period={period} pinned={pinnedRows} theme={theme} onTheme={toggleTheme} />

    <main id="conteudo" tabIndex={-1} className="shell page">
      {route.page !== 'sub' && <div className="page-heading">
        <div><h1>{({
          geral: 'Crédito por sub-região', subregioes: 'Sub-regiões',
          comparar: 'Comparar sub-regiões', indicadores: 'Indicadores', metodologia: 'Fontes e metodologia',
        })[route.page]}</h1>
        </div>
        {ready && !isMethod && <Period months={months} value={period} set={changePeriod} />}
      </div>}
      {isMethod ? <Method /> : error ? <div className="empty"><Database size={28} /><h2>Dados indisponíveis</h2><p>{error}</p>
        <button className="button primary" onClick={() => { setError(''); retry(value => value + 1); }}>Tentar novamente</button>
      </div> : !data ? <div className="empty" role="status"><span className="loader" />Carregando a base publicada…</div>
      : !period ? <div className="empty"><h2>Base sem resultados</h2><p>O servidor ainda não forneceu resultados para consultar.</p></div>
      : <>
        {route.page === 'geral' && <Overview rows={rows} ranking={ranking} active={active} period={period} select={select}
          explain={() => active && openAnalysis([active])} />}
        {route.page === 'subregioes' && <Explorer key={period} rows={rows} period={period} pinned={pinned}
          toggle={togglePinned} />}
        {route.page === 'sub' && <Detail row={rows.find(row => row.id === route.id)} data={data} period={period}
          months={months} changePeriod={changePeriod} explain={openAnalysis} rows={rows} />}
        {route.page === 'comparar' && <Compare key={period + route.query.get('s')} rows={rows} data={data}
          period={period} ids={route.query.has('s') ? (route.query.get('s') || '').split(',') : pinnedRows}
          explain={openAnalysis} />}
        {route.page === 'indicadores' && <Indicators rows={rows} data={data} period={period}
          initial={route.query.get('i')} />}
      </>}
    </main>
    <footer className="site-footer"><div className="shell"><span>Time00.dev · FATEC · Aprendizagem por Projetos Integrados</span>
      <a href={url('metodologia', period)}>Fontes e metodologia <ArrowUpRight size={13} /></a></div></footer>
    {analysis && <Assistant key={analysis.period + analysis.rows.map(row => row.id).join(',')}
      allRows={rows} rows={analysis.rows} period={analysis.period} close={() => setAnalysis(undefined)} />}
    </div>
  </ThemeContext.Provider>;
}

function Overview({ rows, ranking, active, period, select, explain }: {
  rows: Row[]; ranking: Row[]; active?: Row; period: string; select: (id: string) => void; explain: () => void;
}) {
  const [mode, setMode] = useState<'gráfico' | 'tabela'>('gráfico');
  const [preview, setPreview] = useState('');
  const inspected = (preview && rows.find(row => row.id === preview)) || active;
  const displayed = ranking.length ? ranking : rows;
  const shown = active && !displayed.slice(0, 6).includes(active) ? [...displayed.slice(0, 5), active] : displayed.slice(0, 6);
  return <>
    <dl className="metric-bar">
      <div><dt>Sub-regiões</dt><dd>{number(rows.length, 0)}</dd></div>
      <div><dt>Unidades da Federação</dt><dd>{number(new Set(rows.map(row => row.uf)).size, 0)}</dd></div>
      <div><dt>Risco médio <small>/ 5</small></dt><dd>{number(mean(rows.map(row => row.risk)))}</dd></div>
      <div><dt>Oportunidade média <small>/ 5</small></dt><dd>{number(mean(rows.map(row => row.potential)))}</dd></div>
    </dl>
    <div className="overview">
      <section className="panel chart-panel">
        <div className="panel-heading">
          <div className="heading-inline"><h2>Risco × oportunidade</h2>
            {rows.some(row => row.legacyRisk) && <MethodLink period={period} />}</div>
          <div className="segmented" aria-label="Formato da visualização">
            {(['gráfico', 'tabela'] as const).map(label => <button aria-pressed={mode === label} key={label} onClick={() => setMode(label)}>{label}</button>)}
          </div>
        </div>
        {mode === 'gráfico' ? <RiskPlot rows={rows} selected={active?.id || ''} preview={preview} onPreview={setPreview} onSelect={select} /> :
          <div className="table-scroll plot-table"><table><thead><tr><th>Sub-região</th><th>Risco</th><th>Oportunidade</th></tr></thead><tbody>
            {rows.map(row => <tr key={row.id} className={row.id === active?.id ? 'current-row' : ''}>
              <th scope="row"><button className="table-link" onClick={() => select(row.id)}>{geographic(row)}</button></th>
              <td>{number(row.risk)}</td><td>{number(row.potential)}</td></tr>)}
          </tbody></table></div>}
        {inspected && <div className="chart-caption"><span className="selected-point" /> <strong>{geographic(inspected)}</strong>
          <span>Risco {number(inspected.risk)} · Oportunidade {number(inspected.potential)}</span></div>}
      </section>
      <section className="panel ranking-panel">
        <div className="panel-heading"><div><h2>Ranking</h2><p>Score de oportunidade / 100</p></div>
          <a className="text-link" href={url('subregioes', period)}>Ver ranking <ArrowUpRight size={15} /></a></div>
        {!ranking.length && <p className="inline-note">Sem ranking para esta competência.</p>}
        <div className="ranking-list" aria-label="Sub-regiões destacadas" onMouseLeave={() => setPreview('')}>
          {shown.map(row => <button key={row.id}
            className={'rank-row' + (active?.id === row.id ? ' selected' : '') + (preview === row.id ? ' preview' : '')}
            aria-pressed={active?.id === row.id} onMouseEnter={() => setPreview(row.id)} onFocus={() => setPreview(row.id)} onBlur={() => setPreview('')}
            onClick={() => { setPreview(''); select(row.id); }}>
            <span className="position">{row.ranking == null ? '—' : row.ranking + 'º'}</span>
            <strong>{geographic(row)}</strong><strong className="rank-score">{number(row.score)}</strong>
          </button>)}
        </div>
        {active && <div className="ranking-selection">
          <div className="ranking-selection-head"><div><h3>{geographic(active)}</h3><p>{active.faixa || active.regiao}</p></div>
            <a className="text-link result-sheet" href={url('sub', period, active.id)}>Ficha <ArrowRight size={15} /></a></div>
          <div className="result-actions">
            <button className="button primary" onClick={explain}><MessageSquareText size={16} /> Explicar com IA</button>
            <a className="button subtle" href={compareLink(period, [active.id])}>Comparar</a>
          </div>
        </div>}
      </section>
    </div>
  </>;
}

type SortKey = 'territory' | 'ranking' | 'score' | 'risk' | 'potential';

function Explorer({ rows, period, pinned, toggle }: {
  rows: Row[]; period: string; pinned: string[]; toggle: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const [uf, setUf] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({ key: 'ranking', descending: false });
  const states = [...new Set(rows.filter(row => !region || row.regiao === region).map(row => row.uf))].sort();
  const shown = rows.filter(row => (!region || row.regiao === region) && (!uf || row.uf === uf) &&
    norm(row.name + ' ' + geographic(row) + ' ' + row.regiao).includes(norm(query.trim())))
    .sort((a, b) => {
      const direction = sort.descending ? -1 : 1;
      if (sort.key === 'territory') return a.id.localeCompare(b.id) * direction;
      const av = a[sort.key], bv = b[sort.key];
      if (av == null) return bv == null ? a.id.localeCompare(b.id) : 1;
      if (bv == null) return -1;
      return (av - bv) * direction || a.id.localeCompare(b.id);
    });
  const selected = pinned.filter(id => rows.some(row => row.id === id));
  function heading(key: SortKey, name: string) {
    const current = sort.key === key;
    const Icon = sort.descending ? ArrowDown : ArrowUp;
    return <th scope="col" aria-sort={current ? (sort.descending ? 'descending' : 'ascending') : undefined}>
      <button className="sort-button" onClick={() => setSort({
        key, descending: current ? !sort.descending : key !== 'ranking' && key !== 'territory',
      })}>{name}{current && <Icon size={14} />}</button>
    </th>;
  }
  return <section className="panel explorer">
    <div className="filters">
      <label className="search"><Search size={18} /><input type="search" placeholder="Buscar nome, UF ou CEP" aria-label="Buscar sub-região" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <label>Região<select value={region} onChange={e => { setRegion(e.target.value); setUf(''); }}><option value="">Todas</option>{regions.map(r => <option key={r}>{r}</option>)}</select></label>
      <label>UF<select value={uf} onChange={e => setUf(e.target.value)}><option value="">Todas</option>{states.map(s => <option key={s}>{s}</option>)}</select></label>
    </div>
    <div className="results-bar"><p role="status">{shown.length} sub-regiões</p>
      {selected.length > 0 && <a className="button primary" href={compareLink(period, selected)}><GitCompareArrows size={16} /> Comparar ({selected.length}/5)</a>}</div>
    {shown.length ? <div className="table-scroll"><table className="territory-table"><thead><tr><th scope="col"><span className="sr-only">Comparar</span></th>
      {heading('territory', 'Sub-região')}<th scope="col" className="secondary-column">Região</th>
      {heading('ranking', 'Posição')}{heading('score', 'Score')}{heading('risk', 'Risco')}
      {heading('potential', 'Oportunidade')}<th scope="col" className="secondary-column">Faixa</th></tr></thead>
      <tbody>{shown.map(row => <tr key={row.id}><td><input type="checkbox" aria-label={'Comparar ' + geographic(row)} checked={pinned.includes(row.id)}
        disabled={pinned.length >= 5 && !pinned.includes(row.id)} onChange={() => toggle(row.id)} /></td>
        <th scope="row"><a href={url('sub', period, row.id)}>{geographic(row)}</a>{row.name !== geographic(row) && <small>{row.name}</small>}</th>
        <td className="secondary-column">{row.regiao}</td><td>{row.ranking != null ? row.ranking + 'º' : '—'}</td><td><strong>{number(row.score)}</strong></td><td>{number(row.risk)}</td><td>{number(row.potential)}</td><td className="secondary-column">{row.faixa || '—'}</td></tr>)}</tbody>
    </table></div> : <div className="empty"><Search size={25} /><h2>Nenhuma sub-região encontrada</h2><p>Altere a busca ou os filtros.</p></div>}
  </section>;
}

function Detail({ row, data, period, months, changePeriod, explain, rows }: {
  row?: Row; data: Dataset; period: string; months: string[]; changePeriod: (v: string) => void;
  explain: (rows: Row[]) => void; rows: Row[];
}) {
  if (!row) return <div className="empty"><h2>Sub-região indisponível nesta competência</h2>
    <Period months={months} value={period} set={changePeriod} /><a href={url('subregioes', period)}>Voltar para sub-regiões</a></div>;
  const history = series(data, period, row.id);
  const ranked = rank(rows).length;
  const prev = history.at(-2)?.row;
  return <>
    <div className="page-heading"><div><a className="text-link back" href={url('subregioes', period)}><ArrowLeft size={15} /> Sub-regiões</a>
      <h1>{geographic(row)}</h1><p>{row.name !== geographic(row) ? row.name + ' · ' : ''}{row.regiao} · prefixo de CEP</p></div>
      <Period months={months} value={period} set={changePeriod} /></div>
    <div className="overview-strip">
      <div><span>Score publicado <small>/ 100</small></span><strong>{number(row.score)}</strong></div>
      <div><span>Posição publicada</span><strong>{row.ranking == null ? '—' : row.ranking + 'º'}{row.ranking != null && <small> / {ranked}</small>}</strong></div>
      <div><span>Risco <small>/ 5</small></span><strong>{number(row.risk)}</strong></div>
      <div><span>Oportunidade <small>/ 5</small></span><strong>{number(row.potential)}</strong></div>
    </div>
    <div className="detail-summary"><div><div className="heading-inline"><h2>{row.faixa || 'Faixa indisponível'}</h2>{row.legacyRisk && <MethodLink period={period} />}</div>
      <p>Variação do score ante a competência anterior da base: <b>{change(diff(row.score, prev?.score))}</b> {row.operacoes != null && ' · ' + number(row.operacoes, 0) + ' operações'}{row.peso != null && ' · peso amostral ' + number(row.peso)}</p></div>
      <div className="result-actions"><button className="button primary" onClick={() => explain([row])}><MessageSquareText size={16} /> Explicar com IA</button><a className="button subtle" href={compareLink(period, [row.id])}><GitCompareArrows size={15} /> Comparar</a></div></div>
    <div className="detail-grid">
      <section className="panel"><div className="panel-heading"><div><h2>Evolução do score</h2><p>Até 12 competências · escala de 0 a 100</p></div></div>
        <Trend periods={history.map(p => p.period)} lines={[{ label: geographic(row), values: history.map(p => p.row?.score ?? null) }]} label="Evolução do score publicado" />
        <details><summary>Valores do histórico</summary><div className="table-scroll"><table><thead><tr><th>Competência</th><th>Score</th><th>Inadimplência (nota)</th></tr></thead>
          <tbody>{history.map(p => <tr key={p.period}><th>{month(p.period)}</th><td>{number(p.row?.score)}</td><td>{number(p.row && note(p.row, 'inadimplenciaReal'))}</td></tr>)}</tbody></table></div></details></section>
      <section className="panel"><div className="panel-heading"><div><h2>Notas dos indicadores</h2><p>Escala de 1 a 5 · — significa ausência de dado</p></div></div>
        <IndicatorList row={row} keys={riskKeys} title="Eixo I · Risco" />
        <IndicatorList row={row} keys={potentialKeys} title="Eixo II · Oportunidade" />
      </section>
    </div>
  </>;
}

function IndicatorList({ row, keys, title }: { row: Row; keys: Indicator[]; title: string }) {
  return <div className="indicator-list"><h3>{title}</h3><dl>{keys.map(key => <div key={key}>
    <dt>{indicators[key][0]} <small>{indicators[key][1]}</small></dt><dd>{number(note(row, key))}</dd>
  </div>)}</dl></div>;
}

function Compare({ rows, data, period, ids, explain }: {
  rows: Row[]; data: Dataset; period: string; ids: string[]; explain: (rows: Row[]) => void;
}) {
  const [candidate, setCandidate] = useState('');
  const selected = [...new Set(ids)].map(id => rows.find(row => row.id === id)).filter((row): row is Row => Boolean(row)).slice(0, 5);
  const activeIds = selected.map(row => row.id);
  const chartHistory = selected.map(row => series(data, period, row.id));
  return <>
    <section className="panel compare-controls">
      <div className="filters"><label>Adicionar sub-região<select value={candidate} onChange={event => setCandidate(event.target.value)} disabled={selected.length >= 5}>
        <option value="">Selecione UF e prefixo de CEP</option>
        {rows.filter(row => !activeIds.includes(row.id)).sort((a, b) => a.id.localeCompare(b.id)).map(row => <option value={row.id} key={row.id}>{geographic(row)} · {row.regiao}</option>)}</select></label>
        {candidate && <a className="button primary" href={compareLink(period, [...activeIds, candidate])}>Adicionar</a>}
        {selected.length > 0 && <button className="button subtle" onClick={() => explain(selected)}><MessageSquareText size={15} /> {selected.length > 1 ? 'Explicar diferenças' : 'Explicar com IA'}</button>}
      </div>
      <div className="comparison-chips">{selected.map(row => <a key={row.id} href={compareLink(period, activeIds.filter(id => id !== row.id))}
        aria-label={'Remover ' + geographic(row)}>{geographic(row)} <X size={14} /></a>)}</div>
      {selected.length === 0 && <p>Nenhuma sub-região selecionada. Você também pode escolher pela <a href={url('subregioes', period)}>tabela de sub-regiões</a>.</p>}
    </section>
    {selected.length > 0 && <>
      <section className="panel comparison-panel"><div className="panel-heading"><div><div className="heading-inline"><h2>Resultados</h2>{selected.some(row => row.legacyRisk) && <MethodLink period={period} />}</div><p>{selected.length} de 5 sub-regiões</p></div></div>
        <div className="table-scroll"><table className="compare-table"><thead><tr><th>Indicador</th>{selected.map(row => <th key={row.id}><a href={url('sub', period, row.id)}>{geographic(row)}</a></th>)}</tr></thead>
          <tbody>
            <tr><th>Score publicado</th>{selected.map(row => <td key={row.id}><strong>{number(row.score)}</strong></td>)}</tr>
            <tr><th>Faixa</th>{selected.map(row => <td key={row.id}>{row.faixa || '—'}</td>)}</tr>
            <tr><th>Risco médio</th>{selected.map(row => <td key={row.id}>{number(row.risk)}</td>)}</tr>
            <tr><th>Oportunidade média</th>{selected.map(row => <td key={row.id}>{number(row.potential)}</td>)}</tr>
            {([['Risco', riskKeys], ['Inclusão e demografia', potentialKeys]] as const).map(([title, keys]) =>
              <IndicatorRows key={title} title={title} keys={keys} rows={selected} />
            )}
          </tbody></table></div>
      </section>
      <section className="panel comparison-panel"><div className="panel-heading"><div><h2>Evolução do score</h2><p>Até 12 competências · escala de 0 a 100</p></div></div>
        <Trend periods={chartHistory[0].map(p => p.period)} lines={selected.map((row, i) => ({
          label: geographic(row), values: chartHistory[i].map(p => p.row?.score ?? null),
        }))} label="Histórico de scores das sub-regiões selecionadas" />
        <details><summary>Valores do histórico</summary><div className="table-scroll"><table><thead><tr><th>Competência</th>{selected.map(row => <th key={row.id}>{geographic(row)}</th>)}</tr></thead>
          <tbody>{chartHistory[0].map((item, index) => <tr key={item.period}><th>{month(item.period)}</th>{chartHistory.map((history, i) => <td key={selected[i].id}>{number(history[index].row?.score)}</td>)}</tr>)}</tbody></table></div></details>
      </section>
    </>}
  </>;
}

function IndicatorRows({ title, keys, rows }: { title: string; keys: Indicator[]; rows: Row[] }) {
  return <>
    <tr className="group-row"><th colSpan={rows.length + 1}>{title}</th></tr>
    {keys.map(key => <tr key={key}><th scope="row">{indicators[key][0]} <small>{indicators[key][1]}</small></th>
      {rows.map(row => <td key={row.id}>{number(note(row, key))}</td>)}</tr>)}
  </>;
}

const onePerUF = (rows: Row[]) => [...new Map(rows.map(row => [row.uf, row])).values()];

function Indicators({ rows, data, period, initial }: { rows: Row[]; data: Dataset; period: string; initial: string | null }) {
  const [field, setField] = useState<Indicator>(initial && Object.hasOwn(indicators, initial) ? initial as Indicator : 'inadimplenciaReal');
  const [descending, setDescending] = useState(true);
  const [name, scope, description] = indicators[field];
  const compareRows = scope === 'UF' ? onePerUF(rows) : rows;
  const shown = compareRows.filter(row => note(row, field) != null).sort((a, b) => (note(b, field)! - note(a, field)!) * (descending ? 1 : -1)).slice(0, 15);
  const periods = data.months.filter(m => m <= period).slice(-12);
  const regional = regions.map(region => ({
    label: region,
    values: periods.map(m => {
      const sample = (data.byMonth.get(m) || []).filter(row => row.regiao === region);
      return mean((scope === 'UF' ? onePerUF(sample) : sample).map(row => note(row, field)));
    }),
  }));
  return <>
    <div className="panel filters indicator-filter"><label>Indicador<select value={field} onChange={e => setField(e.target.value as Indicator)}>{Object.entries(indicators).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <p>{description} <b>Nível {scope === 'UF' ? 'estadual' : 'sub-regional'}.</b></p></div>
    <div className="detail-grid indicator-grid">
      <section className="panel"><div className="panel-heading"><div><h2>{name}</h2><p>{descending ? '15 maiores notas' : '15 menores notas'} · escala de 1 a 5</p></div>
        <button className="button subtle" onClick={() => setDescending(v => !v)}><ArrowDown size={15} /> Inverter ordem</button></div>
        {shown.length ? <div className="table-scroll"><table><thead><tr><th>Território</th><th>Região</th><th>Nota</th></tr></thead>
          <tbody>{shown.map(row => <tr key={row.id}><th>{scope === 'UF' ? row.uf : <a href={url('sub', period, row.id)}>{geographic(row)}</a>}</th><td>{row.regiao}</td><td>{number(note(row, field))}</td></tr>)}</tbody></table></div>
          : <p className="inline-note">Sem valores disponíveis nesta competência.</p>}</section>
      <section className="panel indicator-history"><div className="panel-heading"><div><h2>Histórico por região</h2><p>Média das notas disponíveis em cada período</p></div></div>
        <Trend periods={periods} lines={regional} label={'Histórico regional de ' + name} />
        <details><summary>Valores do histórico</summary><div className="table-scroll"><table><thead><tr><th>Competência</th>{regions.map(region => <th key={region}>{region}</th>)}</tr></thead>
          <tbody>{periods.map((m, index) => <tr key={m}><th>{month(m)}</th>{regional.map(line => <td key={line.label}>{number(line.values[index])}</td>)}</tr>)}</tbody></table></div></details>
      </section>
    </div>
  </>;
}

function Method() {
  return <div className="method-grid">
    <article className="panel method-document"><h2>Unidade geográfica</h2>
      <p>A unidade de análise é a combinação de UF e dos dois primeiros dígitos do CEP. Os resultados são agregados por mês.</p>
      <p>Os eixos usam notas de 1 a 5. O painel calcula médias simples das notas disponíveis em cada eixo. A média nacional no panorama considera as sub-regiões da base.</p>
      <h2 id="method-score" tabIndex={-1}>Score de Oportunidade</h2><p>O notebook calcula o score de 0 a 100 combinando oportunidade e capacidade, com expoentes de 0,4 e 0,6. A posição é calculada no lote mensal pelo notebook.</p>
      <h2 id="method-fragilidade" tabIndex={-1}>Fragilidade da carteira</h2><p>A classificação D–H deixou de ser enviada pela fonte para os períodos a partir de janeiro de 2025. O painel exibe essa nota como ausente nesses meses. Alguns lotes publicados ainda incluem a nota histórica, que pode afetar o score e a classificação.</p>
      <p>A análise é territorial e acadêmica. Os indicadores se destinam ao estudo de crédito agregado.</p>
    </article>
    <section className="panel"><h2>Fontes</h2><ul className="source-list">
      <li><a href="https://olinda.bcb.gov.br/olinda/servico/scr_sub_regiao/versao/v1/documentacao" target="_blank" rel="noreferrer">Banco Central · SCR por sub-região <ArrowUpRight size={14} /></a><p>Dados de crédito por UF e prefixo de CEP.</p></li>
      <li><a href="https://www.bcb.gov.br/estabilidadefinanceira/estatisticaspix" target="_blank" rel="noreferrer">Banco Central · Estatísticas do Pix <ArrowUpRight size={14} /></a><p>Base para o indicador de maturidade Pix.</p></li>
      <li><a href="https://www.ibge.gov.br/cidades-e-estados" target="_blank" rel="noreferrer">IBGE · Dados demográficos <ArrowUpRight size={14} /></a><p>Indicadores demográficos e estaduais.</p></li>
      <li><a href={notebook} target="_blank" rel="noreferrer">Notebook e cálculo do Time00.dev <ArrowUpRight size={14} /></a><p>Transformação, score, faixa e ranking.</p></li></ul></section>
  </div>;
}

export default App;
