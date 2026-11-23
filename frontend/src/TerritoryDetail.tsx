import { Button } from '@primer/react';
import { ArrowDownIcon, ArrowUpIcon, CommentDiscussionIcon, GitCompareIcon } from '@primer/octicons-react';
import { MethodLink, Period } from './Controls';
import { MetricHistory } from './MetricHistory';
import { geographic, indicators, month, note, number, potentialKeys, previousObservation, rank, riskKeys,
  scoreDifference, signedNumber, type Dataset, type Indicator, type Row } from './data';
import { compareLink, url } from './navigation';
import { territoryName } from './territorySearch';

export function TerritoryDetail({ row, data, period, changePeriod, explain, rows }: {
  row?: Row; data: Dataset; period: string; changePeriod: (value: string) => void;
  explain: (rows: Row[]) => void; rows: Row[];
}) {
  if (!row) return <div className="empty">
    <h2>Sub-região indisponível nesta competência</h2>
    <Period months={data.months} value={period} set={changePeriod} />
    <Button as="a" href={url('subregioes', period)}>Voltar para sub-regiões</Button>
  </div>;
  const prior = previousObservation(data, period, row.id);
  const delta = scoreDifference(row.score, prior?.row?.score);
  const ChangeIcon = delta != null && delta < 0 ? ArrowDownIcon : ArrowUpIcon;
  const rankedCount = rank(rows).length;

  return <>
    <div className="page-heading territory-heading">
      <div><h1>{territoryName(row)}</h1><p>{geographic(row)} · {row.regiao}</p></div>
      <Period months={data.months} value={period} set={changePeriod} />
    </div>

    <section className="panel territory-score" aria-labelledby="score-title">
      <div className="score-feature">
        <div className="heading-inline"><h2 id="score-title">Score de oportunidade</h2>
          {row.legacyRisk && <MethodLink period={period} />}</div>
        {row.score != null ? <>
          <div className="score-figure"><strong>{number(row.score)}</strong><span>/ 100</span></div>
          <div className="score-meta">
            {row.faixa && <strong>{row.faixa}</strong>}
            {delta != null && prior && <span className="score-delta">
              {delta !== 0 && <ChangeIcon size={14} aria-hidden="true" />}
              <b>{signedNumber(delta)} pts</b> vs. {month(prior.period)}
            </span>}
          </div>
        </> : <p className="unavailable-score">Sem score publicado para {month(period)}.</p>}
      </div>
      <div className="score-context">
        <dl className="score-related">
          <div><dt>Posição no ranking</dt><dd>{row.ranking == null ? '—' : row.ranking + 'º'}{row.ranking != null && rankedCount > 0 && <small> de {rankedCount}</small>}</dd></div>
          <div><dt>Risco</dt><dd>{number(row.risk)}<small> / 5</small></dd></div>
          <div><dt>Oportunidade</dt><dd>{number(row.potential)}<small> / 5</small></dd></div>
        </dl>
        <div className="result-actions">
          <Button variant="primary" leadingVisual={CommentDiscussionIcon} onClick={() => explain([row])}>Explicar com IA</Button>
          <Button as="a" leadingVisual={GitCompareIcon} href={compareLink(period, [row.id])}>Comparar</Button>
          <a className="text-link" href={url('metodologia', period, undefined, { secao: 'score' })}>Como ler o score</a>
        </div>
      </div>
    </section>

    <div className="detail-grid">
      <MetricHistory data={data} period={period} rows={[row]} />
      <section className="panel indicator-panel">
        <div className="panel-heading"><div><h2>Indicadores</h2><p>Notas de 1 a 5</p></div></div>
        <IndicatorList row={row} keys={riskKeys} title="Risco" />
        <IndicatorList row={row} keys={potentialKeys} title="Inclusão e demografia" />
        {(row.operacoes != null || row.peso != null) && <div className="source-metadata">
          {row.operacoes != null && <span>{number(row.operacoes, 0)} operações</span>}
          {row.peso != null && <span>Peso amostral {number(row.peso)}</span>}
        </div>}
      </section>
    </div>
  </>;
}

function IndicatorList({ row, keys, title }: { row: Row; keys: Indicator[]; title: string }) {
  return <div className="indicator-list"><h3>{title}</h3><dl>{keys.map(key => <div key={key}>
    <dt>{indicators[key][0]} <small>{indicators[key][1]}</small></dt>
    <dd aria-label={note(row, key) === null ? 'Sem dado' : undefined}>{number(note(row, key))}</dd>
  </div>)}</dl></div>;
}
