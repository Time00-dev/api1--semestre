import { ArrowRight, ArrowUpRight, Database, X } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { BaseStyles, Button, FormControl, Select, SkeletonBox } from '@primer/react';
import { ThemeProvider } from '@primer/react/next';
import { ArrowDownIcon, CommentDiscussionIcon } from '@primer/octicons-react';
import { geographic, indicators, loadDataWithRetry, mean, month, note, number, potentialKeys,
  previousObservation, rank, regions, riskKeys, scoreDifference, signedNumber, type Dataset, type Indicator, type Row } from './data';
import { compareLink, url, useRoute } from './navigation';
import { MethodLink, Period } from './Controls';
import { Shell } from './Shell';
import { Overview } from './Overview';
import { CompareSearch } from './CompareSearch';
import { ThemeContext, useThemePreference } from './theme';

const Explorer = lazy(() => import('./Explorer').then(module => ({ default: module.Explorer })));
const Assistant = lazy(() => import('./Assistant').then(module => ({ default: module.Assistant })));
const Trend = lazy(() => import('./Charts').then(module => ({ default: module.Trend })));
const TerritoryDetail = lazy(() => import('./TerritoryDetail').then(module => ({ default: module.TerritoryDetail })));
const MetricHistory = lazy(() => import('./MetricHistory').then(module => ({ default: module.MetricHistory })));

const repo = 'https://github.com/Time00-dev/api1--semestre';
const notebook = repo + '/blob/main/backend/GJ00_46.ipynb';

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
  const territory = route.page === 'sub' ? rows.find(row => row.id === route.id) : undefined;
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
    <ThemeProvider contextOnly colorMode={theme} dayScheme="light" nightScheme="dark_dimmed">
    <BaseStyles className="workspace">
    <a href="#conteudo" className="skip" onClick={event => { event.preventDefault(); document.getElementById('conteudo')?.focus(); }}>Pular para o conteúdo</a>
    <Shell page={route.page} detailLabel={territory && geographic(territory)} period={period}
      pinned={pinnedRows} theme={theme} onTheme={toggleTheme}>

    <main id="conteudo" tabIndex={-1} className="shell page">
      {route.page !== 'sub' && <div className={route.page === 'geral' ? 'page-heading overview-heading' : 'page-heading'}>
        <div><h1>{({
          geral: 'Crédito por sub-região', subregioes: 'Sub-regiões',
          comparar: 'Comparar sub-regiões', indicadores: 'Indicadores', metodologia: 'Fontes e metodologia',
        })[route.page]}</h1>
        </div>
        {ready && !isMethod && <Period months={months} value={period} set={changePeriod} />}
      </div>}
      {isMethod ? <Method /> : error ? <div className="empty"><Database size={28} /><h2>Dados indisponíveis</h2><p>{error}</p>
        <Button variant="primary" onClick={() => { setError(''); retry(value => value + 1); }}>Tentar novamente</Button>
      </div> : !data ? <div className="loading-surface" role="status" aria-label="Carregando a base publicada">
        <SkeletonBox width="100%" height={62} /><SkeletonBox width="100%" height={370} />
      </div>
      : !period ? <div className="empty"><h2>Base sem resultados</h2><p>O servidor ainda não forneceu resultados para consultar.</p></div>
      : <Suspense fallback={<SkeletonBox width="100%" height={345} />}>
        {route.page === 'geral' && <Overview rows={rows} ranking={ranking} active={active} period={period} select={select}
          explain={() => active && openAnalysis([active])} />}
        {route.page === 'subregioes' && <Explorer key={period} rows={rows} period={period} queryParams={route.query}
          pinned={pinned} toggle={togglePinned} clearSelection={() => setPinned([])} />}
        {route.page === 'sub' && <TerritoryDetail row={territory} data={data} period={period}
          changePeriod={changePeriod} explain={openAnalysis} rows={rows} />}
        {route.page === 'comparar' && <Compare key={period} rows={rows} data={data}
          period={period} ids={route.query.has('s') ? (route.query.get('s') || '').split(',') : pinnedRows}
          explain={openAnalysis} />}
        {route.page === 'indicadores' && <Indicators rows={rows} data={data} period={period}
          initial={route.query.get('i')} />}
      </Suspense>}
    </main>
    </Shell>
    {analysis && <Suspense fallback={null}><Assistant key={analysis.period + analysis.rows.map(row => row.id).join(',')}
      allRows={rows} rows={analysis.rows} period={analysis.period} close={() => setAnalysis(undefined)} /></Suspense>}
    </BaseStyles>
    </ThemeProvider>
  </ThemeContext.Provider>;
}

function Compare({ rows, data, period, ids, explain }: {
  rows: Row[]; data: Dataset; period: string; ids: string[]; explain: (rows: Row[]) => void;
}) {
  const selected = [...new Set(ids)].map(id => rows.find(row => row.id === id)).filter((row): row is Row => Boolean(row)).slice(0, 5);
  const activeIds = selected.map(row => row.id);
  return <>
    <section className="panel compare-controls">
      <div className="compare-toolbar">
        <CompareSearch rows={rows} period={period} activeIds={activeIds} />
        {selected.length > 0 && <Button leadingVisual={CommentDiscussionIcon} onClick={() => explain(selected)}>
          {selected.length > 1 ? 'Explicar diferenças' : 'Explicar com IA'}
        </Button>}
      </div>
      <div className="comparison-chips">{selected.map(row => <a key={row.id} href={compareLink(period, activeIds.filter(id => id !== row.id))}
        aria-label={'Remover ' + geographic(row)}>{geographic(row)} <X size={14} /></a>)}</div>
    </section>
    {selected.length > 0 && <>
      <section className="panel comparison-panel"><div className="panel-heading"><div><div className="heading-inline"><h2>Resultados</h2>{selected.some(row => row.legacyRisk) && <MethodLink period={period} />}</div><p>{selected.length} de 5 sub-regiões</p></div></div>
        <div className="table-scroll" tabIndex={0} aria-label="Indicadores comparados"><table className="compare-table"><thead><tr><th>Indicador</th>{selected.map(row => <th key={row.id}><a href={url('sub', period, row.id)}>{geographic(row)}</a></th>)}</tr></thead>
          <tbody>
            <tr className="comparison-score"><th scope="row">Score / 100</th>{selected.map(row => <td key={row.id}><strong>{number(row.score)}</strong></td>)}</tr>
            <tr><th scope="row">Posição no ranking</th>{selected.map(row => <td key={row.id}>{row.ranking == null ? '—' : row.ranking + 'º'}</td>)}</tr>
            <tr><th scope="row">Variação mensal</th>{selected.map(row => <td key={row.id}>{signedNumber(scoreDifference(row.score, previousObservation(data, period, row.id)?.row?.score))}</td>)}</tr>
            <tr><th>Faixa</th>{selected.map(row => <td key={row.id}>{row.faixa || '—'}</td>)}</tr>
            <tr><th>Risco médio</th>{selected.map(row => <td key={row.id}>{number(row.risk)}</td>)}</tr>
            <tr><th>Oportunidade média</th>{selected.map(row => <td key={row.id}>{number(row.potential)}</td>)}</tr>
            {([['Risco', riskKeys], ['Inclusão e demografia', potentialKeys]] as const).map(([title, keys]) =>
              <IndicatorRows key={title} title={title} keys={keys} rows={selected} />
            )}
          </tbody></table></div>
      </section>
      <MetricHistory data={data} period={period} rows={selected} />
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
    <div className="panel filters indicator-filter"><FormControl><FormControl.Label>Indicador</FormControl.Label>
      <Select block value={field} onChange={e => setField(e.target.value as Indicator)}>{Object.entries(indicators).map(([key, [label]]) => <Select.Option key={key} value={key}>{label}</Select.Option>)}</Select>
      </FormControl>
      <p>{description} <b>Nível {scope === 'UF' ? 'estadual' : 'sub-regional'}.</b></p></div>
    <div className="detail-grid indicator-grid">
      <section className="panel"><div className="panel-heading"><div><h2>{name}</h2><p>{descending ? '15 maiores notas' : '15 menores notas'} · escala de 1 a 5</p></div>
        <Button leadingVisual={ArrowDownIcon} onClick={() => setDescending(v => !v)}>Inverter ordem</Button></div>
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
