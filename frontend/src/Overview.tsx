import { Button, SegmentedControl } from '@primer/react';
import { ArrowRightIcon, CheckIcon, CommentDiscussionIcon, GitCompareIcon } from '@primer/octicons-react';
import { lazy, useState } from 'react';
import { MethodLink } from './Controls';
import { geographic, mean, number, type Row } from './data';
import { compareLink, url } from './navigation';
import { TerritoryLabel } from './TerritoryLabel';
import { territoryName } from './territorySearch';
import './Overview.css';

const RiskPlot = lazy(() => import('./Charts').then(module => ({ default: module.RiskPlot })));

export function Overview({ rows, ranking, active, period, select, explain }: {
  rows: Row[]; ranking: Row[]; active?: Row; period: string; select: (id: string) => void; explain: () => void;
}) {
  const [showTable, setShowTable] = useState(false);
  const [preview, setPreview] = useState('');
  const plotted = rows.filter(row => row.risk != null && row.potential != null);
  const baseline = { risk: mean(plotted.map(row => row.risk)), potential: mean(plotted.map(row => row.potential)), count: plotted.length };
  const inspected = rows.find(row => row.id === preview) ?? active;
  const lead = ranking.slice(0, 5);
  const shown = active && !lead.includes(active) ? [...lead.slice(0, 4), active] : lead;

  return <>
    <dl className="overview-metrics">
      <div><dt>Sub-regiões</dt><dd>{number(rows.length, 0)}</dd></div>
      <div><dt>UFs</dt><dd>{number(new Set(rows.map(row => row.uf)).size, 0)}</dd></div>
      <div><dt>Risco médio</dt><dd>{number(baseline.risk)} <small>/ 5</small></dd></div>
      <div><dt>Oportunidade média</dt><dd>{number(baseline.potential)} <small>/ 5</small></dd></div>
    </dl>

    <div className="overview-board">
      {active && <section className="overview-selection" aria-labelledby="selected-territory">
        <div className="overview-selection-head" aria-live="polite">
          <div><h2 id="selected-territory">{territoryName(active)}</h2><p>{geographic(active)}</p></div>
          <div className="overview-score">
            <span>Score</span>
            <div><strong>{number(active.score)}</strong>{active.score != null && <small> / 100</small>}</div>
          </div>
        </div>
        {active.faixa && <p className="overview-band">{active.faixa}</p>}
        <dl className="overview-territory-metrics">
          <div><dt>Posição</dt><dd>{active.ranking == null ? '—' : active.ranking + 'º'}</dd></div>
          <div><dt>Risco</dt><dd>{number(active.risk)}</dd></div>
          <div><dt>Oportunidade</dt><dd>{number(active.potential)}</dd></div>
        </dl>
        <div className="overview-actions">
          <Button as="a" className="overview-open" variant="primary" size="large" trailingVisual={ArrowRightIcon}
            href={url('sub', period, active.id)}>Abrir ficha</Button>
          <Button leadingVisual={CommentDiscussionIcon} onClick={explain}>Explicar com IA</Button>
          <Button as="a" leadingVisual={GitCompareIcon} href={compareLink(period, [active.id])}>Comparar</Button>
        </div>
      </section>}

      <section className="overview-chart" aria-labelledby="overview-chart-title">
        <div className="overview-chart-header">
          <div className="heading-inline"><h2 id="overview-chart-title">Risco × oportunidade</h2>
            {rows.some(row => row.legacyRisk) && <MethodLink period={period} />}</div>
          <SegmentedControl aria-label="Formato da visualização" onChange={index => setShowTable(index === 1)}>
            <SegmentedControl.Button selected={!showTable}>Gráfico</SegmentedControl.Button>
            <SegmentedControl.Button selected={showTable}>Tabela</SegmentedControl.Button>
          </SegmentedControl>
        </div>
        {showTable ? <div className="table-scroll overview-chart-table">
          <table aria-label="Dados de risco e oportunidade">
            <thead><tr><th scope="col">Sub-região</th><th scope="col" className="numeric">Risco</th>
              <th scope="col" className="numeric">Oportunidade</th><th scope="col" className="numeric">Score</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.id} className={row.id === active?.id ? 'current-row' : ''}>
              <th scope="row"><button className="table-link" aria-pressed={row.id === active?.id}
                onClick={() => select(row.id)}><TerritoryLabel row={row} /></button></th>
              <td className="numeric">{number(row.risk)}</td><td className="numeric">{number(row.potential)}</td>
              <td className="numeric">{number(row.score)}</td>
            </tr>)}</tbody>
            {baseline.count > 0 && <tfoot><tr><th scope="row">Média da base</th><td className="numeric">{number(baseline.risk)}</td>
              <td className="numeric">{number(baseline.potential)}</td><td className="numeric">—</td></tr></tfoot>}
          </table>
        </div> : plotted.length ?
          <RiskPlot rows={plotted} baseline={baseline} selected={active?.id || ''} preview={preview} onPreview={setPreview} onSelect={select} /> :
          <p className="overview-empty">Sem notas de risco e oportunidade nesta competência.</p>}
        {!showTable && inspected && <div className="overview-readout">
          <TerritoryLabel row={inspected} />
          <span>Risco <b>{number(inspected.risk)}</b></span>
          <span>Oportunidade <b>{number(inspected.potential)}</b></span>
        </div>}
      </section>

      <section className="overview-ranking" aria-labelledby="overview-ranking-title">
        <div className="overview-ranking-header">
          <h2 id="overview-ranking-title">Ranking</h2><span>Score / 100</span>
        </div>
        {!ranking.length && <p className="inline-note">Sem ranking para esta competência.</p>}
        <div className="overview-ranking-list" onMouseLeave={() => setPreview('')}>
          {shown.map(row => {
            const selected = active?.id === row.id;
            return <button key={row.id} type="button"
              className={'overview-rank-row' + (preview === row.id ? ' is-previewed' : '')}
              aria-pressed={selected} onMouseEnter={() => setPreview(row.id)}
              onFocus={() => setPreview(row.id)} onBlur={() => setPreview('')}
              onClick={() => { setPreview(''); select(row.id); }}>
              <span>{row.ranking == null ? '—' : row.ranking + 'º'}</span><TerritoryLabel row={row} />
              {selected ? <CheckIcon aria-hidden="true" /> : <b>{number(row.score)}</b>}
            </button>;
          })}
        </div>
        <Button as="a" variant="invisible" className="overview-full-ranking" trailingVisual={ArrowRightIcon}
          href={url('subregioes', period)}>Ver ranking completo</Button>
      </section>
    </div>
  </>;
}
