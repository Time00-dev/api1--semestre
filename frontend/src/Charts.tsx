import { useMemo, useRef, useSyncExternalStore } from 'react';
import { Chart as ChartJS, ScatterController, LineController, LinearScale, CategoryScale,
  PointElement, LineElement, Tooltip, Legend, Filler, type Plugin } from 'chart.js';
import { Line, Scatter } from 'react-chartjs-2';
import { geographic, month, number, regions, type Row } from './data';
ChartJS.register(ScatterController, LineController, LinearScale, CategoryScale, PointElement, LineElement, Tooltip, Legend, Filler);
ChartJS.defaults.font.family = 'IBM Plex Sans, system-ui, sans-serif';
ChartJS.defaults.color = '#536371';

export const chartColors = ['#21838a', '#5273a5', '#a66243', '#7c5e9c', '#927809'];
const grid = '#e4e8ee';
const dark = '#153749';
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const subscribe = (update: () => void) => {
  motionQuery.addEventListener('change', update);
  return () => motionQuery.removeEventListener('change', update);
};
const useReducedMotion = () => useSyncExternalStore(subscribe, () => motionQuery.matches);

export function RiskPlot({ rows, selected, onSelect }: {
  rows: Row[]; selected: string; onSelect: (id: string) => void;
}) {
  const reduced = useReducedMotion();
  const data = useMemo(() => ({
    datasets: regions.map((region, i) => {
      const items = rows.filter(row => row.regiao === region && row.risk != null && row.potential != null);
      return {
        label: region,
        data: items.map(row => ({ x: row.risk!, y: row.potential!, id: row.id, row })),
        pointRadius: items.map(row => row.id === selected ? 7 : 4),
        pointBackgroundColor: items.map(row => row.id === selected ? dark : chartColors[i] + 'a8'),
        pointBorderColor: items.map(row => row.id === selected ? '#eef8fa' : '#fff'),
        pointBorderWidth: items.map(row => row.id === selected ? 2 : 0.5),
        pointHoverRadius: 7,
        pointHitRadius: 8,
      };
    }),
  }), [rows, selected]);

  const selection = useRef({ data, selected });
  selection.current = { data, selected };
  const guide: Plugin<'scatter'> = {
    id: 'selectedTerritory',
    beforeDatasetsDraw(chart) {
      const datasets = selection.current.data.datasets;
      const index = datasets.findIndex(dataset => dataset.data.some(item => item.id === selection.current.selected));
      if (index < 0) return;
      const item = datasets[index].data.find(point => point.id === selection.current.selected)!;
      const x = chart.scales.x.getPixelForValue(item.x);
      const y = chart.scales.y.getPixelForValue(item.y);
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.strokeStyle = '#16739190';
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(chartArea.left, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();
      ctx.restore();
    },
  };
  return <>
    <div className="plot scatter"><Scatter aria-label="Dispersão de risco e oportunidade. A tabela de ranking permite selecionar por teclado."
      data={data} plugins={[guide]}
      options={{
        maintainAspectRatio: false, animation: reduced ? false : { duration: 160 },
        interaction: { mode: 'nearest', intersect: true },
        onClick: (_, active) => {
          const item = active[0];
          if (item) onSelect(data.datasets[item.datasetIndex].data[item.index].id);
        },
        onHover: (event, active) => {
          const canvas = event.native?.target;
          if (canvas instanceof HTMLCanvasElement) canvas.style.cursor = active.length ? 'pointer' : 'default';
        },
        scales: {
          x: { min: 1, max: 5, ticks: { stepSize: 1 }, grid: { color: grid },
            title: { display: true, text: 'Risco · nota de 1 a 5' } },
          y: { min: 1, max: 5, ticks: { stepSize: 1 }, grid: { color: grid },
            title: { display: true, text: 'Oportunidade · nota de 1 a 5' } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: dark,
            callbacks: {
              title: ([item]) => geographic(data.datasets[item.datasetIndex].data[item.dataIndex].row),
              label: item => 'Risco ' + number(item.parsed.x) + ' · Oportunidade ' + number(item.parsed.y),
            },
          },
        },
      }} />
    </div>
    <div className="legend" aria-label="Regiões">
      {regions.map((region, i) => <span key={region}><i style={{ backgroundColor: chartColors[i] }} />{region}</span>)}
    </div>
  </>;
}

export function Trend({ periods, lines, label }: {
  periods: string[];
  lines: { label: string; values: (number | null)[] }[];
  label: string;
}) {
  const reduced = useReducedMotion();
  return <div className="plot trend"><Line aria-label={label} data={{
    labels: periods.map(p => month(p, true)),
    datasets: lines.map((line, i) => ({
      label: line.label, data: line.values, borderColor: chartColors[i % chartColors.length],
      pointBackgroundColor: chartColors[i % chartColors.length], borderWidth: 2,
      pointRadius: 2.5, pointHoverRadius: 5, tension: 0.1, spanGaps: false,
    })),
  }} options={{
    maintainAspectRatio: false, animation: reduced ? false : { duration: 160 },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
      y: { grid: { color: grid } },
    },
    plugins: { legend: { display: lines.length > 1, labels: { usePointStyle: true, boxWidth: 7 } } },
  }} /></div>;
}
