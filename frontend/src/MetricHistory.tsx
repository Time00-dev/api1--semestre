import { SegmentedControl } from '@primer/react';
import { useState } from 'react';
import { Trend } from './Charts';
import { territoryName } from './territorySearch';
import { geographic, month, number, type Dataset, type Row } from './data';

const metrics = [
  { key: 'score', label: 'Score', scale: 100 },
  { key: 'risk', label: 'Risco', scale: 5 },
  { key: 'potential', label: 'Oportunidade', scale: 5 },
] as const;

export function MetricHistory({ data, period, rows }: { data: Dataset; period: string; rows: Row[] }) {
  const [active, select] = useState(0);
  const current = metrics[active];
  const periods = data.months.filter(m => m <= period).slice(-12);
  const lines = rows.map(row => ({
    id: row.id,
    label: territoryName(row) + ' · ' + geographic(row),
    values: periods.map(m => data.byMonth.get(m)?.find(entry => entry.id === row.id)?.[current.key] ?? null),
  }));
  const hasData = lines.some(line => line.values.some(value => value !== null));

  return <section className="panel history-panel">
    <div className="panel-heading">
      <div><h2>Histórico</h2><p>{current.label} / {current.scale} · {periods.length} competências</p></div>
      <SegmentedControl aria-label="Indicador do histórico" size="small" onChange={select}>
        {metrics.map((metric, index) =>
          <SegmentedControl.Button key={metric.key} selected={index === active}>{metric.label}</SegmentedControl.Button>)}
      </SegmentedControl>
    </div>
    {hasData ? <>
      <Trend periods={periods} lines={lines} label={'Histórico de ' + current.label.toLowerCase()} />
      <details>
        <summary>Ver dados do gráfico</summary>
        <div className="table-scroll">
          <table>
            <thead><tr><th scope="col">Competência</th>{lines.map(line => <th className="numeric" scope="col" key={line.id}>{line.label}</th>)}</tr></thead>
            <tbody>{periods.map((m, index) => <tr key={m}>
              <th scope="row">{month(m)}</th>
              {lines.map(line => <td className="numeric" key={line.id}>{number(line.values[index])}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
      </details>
    </> : <div className="empty-history">Sem valores de {current.label.toLowerCase()} nessas competências.</div>}
  </section>;
}
