import { useMemo, useRef, useSyncExternalStore } from 'react';
import { Chart as ChartJS, ScatterController, LineController, LinearScale, CategoryScale,
  PointElement, LineElement, Tooltip, Legend, Filler, type Plugin } from 'chart.js';
import { Line, Scatter } from 'react-chartjs-2';
import { useTheme } from './theme';
import { geographic, month, number, regions, type Row } from './data';
ChartJS.register(ScatterController, LineController, LinearScale, CategoryScale, PointElement, LineElement, Tooltip, Legend, Filler);
ChartJS.defaults.font.family = 'IBM Plex Sans, system-ui, sans-serif';
ChartJS.defaults.color = '#536371';

const chartThemes = {
  light: {
    colors: ['#137a80', '#426597', '#a65335', '#785c9f', '#886d0b'],
    grid: '#e3e9ed', text: '#485d6a', selected: '#075e7b', guide: '#3298b5',
    border: '#edf8fb', tooltip: '#173848',
  },
  dark: {
    colors: ['#68d1bf', '#81abef', '#f1a384', '#be9de3', '#dac36f'],
    grid: '#303e4b', text: '#bdcbd7', selected: '#6fdcf5', guide: '#58b9d3',
    border: '#1b2631', tooltip: '#27485c',
  },
};
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const subscribe = (update: () => void) => {
  motionQuery.addEventListener('change', update);
  return () => motionQuery.removeEventListener('change', update);
};
const useReducedMotion = () => useSyncExternalStore(subscribe, () => motionQuery.matches);

export function RiskPlot({ rows, selected, preview, onPreview, onSelect }: {
  rows: Row[]; selected: string; preview: string; onPreview: (id: string) => void; onSelect: (id: string) => void;
}) {
  const reduced = useReducedMotion();
  const palette = chartThemes[useTheme()];
  const focused = preview || selected;
  const data = useMemo(() => ({
    datasets: regions.map((region, i) => {
      const items = rows.filter(row => row.regiao === region && row.risk != null && row.potential != null);
      return {
        label: region,
        data: items.map(row => ({ x: row.risk!, y: row.potential!, id: row.id, row })),
        pointRadius: items.map(row => row.id === focused ? 7 : 4.25),
        pointBackgroundColor: items.map(row => row.id === focused ? palette.selected : palette.colors[i] + 'c0'),
        pointBorderColor: items.map(row => palette.border),
        pointBorderWidth: items.map(row => row.id === focused ? 2 : 0.75),
        pointHoverRadius: 7,
        pointHitRadius: 8,
      };
    }),
  }), [rows, focused, palette]);

  const selection = useRef({ data, focused, palette });
  selection.current = { data, focused, palette };
  const guide: Plugin<'scatter'> = {
    id: 'selectedTerritory',
    beforeDatasetsDraw(chart) {
      const datasets = selection.current.data.datasets;
      const index = datasets.findIndex(dataset => dataset.data.some(item => item.id === selection.current.focused));
      if (index < 0) return;
      const item = datasets[index].data.find(point => point.id === selection.current.focused)!;
      const x = chart.scales.x.getPixelForValue(item.x);
      const y = chart.scales.y.getPixelForValue(item.y);
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.strokeStyle = selection.current.palette.guide + '95';
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
    <div className="plot scatter" onMouseLeave={() => onPreview('')}><Scatter aria-label="Dispersão de risco e oportunidade. A tabela de ranking permite selecionar por teclado."
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
          const item = active[0];
          onPreview(item ? data.datasets[item.datasetIndex].data[item.index].id : '');
        },
        scales: {
          x: { min: 1, max: 5, ticks: { stepSize: 1, color: palette.text }, grid: { color: palette.grid }, border: { color: palette.grid },
            title: { display: true, color: palette.text, text: 'Risco / 5' } },
          y: { min: 1, max: 5, ticks: { stepSize: 1, color: palette.text }, grid: { color: palette.grid }, border: { color: palette.grid },
            title: { display: true, color: palette.text, text: 'Oportunidade / 5' } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: palette.tooltip,
            callbacks: {
              title: ([item]) => geographic(data.datasets[item.datasetIndex].data[item.dataIndex].row),
              label: item => 'Risco ' + number(item.parsed.x) + ' · Oportunidade ' + number(item.parsed.y),
            },
          },
        },
      }} />
    </div>
    <div className="legend" aria-label="Regiões">
      {regions.map((region, i) => <span key={region}><i style={{ backgroundColor: palette.colors[i] }} />{region}</span>)}
    </div>
  </>;
}

export function Trend({ periods, lines, label }: {
  periods: string[];
  lines: { label: string; values: (number | null)[] }[];
  label: string;
}) {
  const reduced = useReducedMotion();
  const palette = chartThemes[useTheme()];
  return <div className="plot trend"><Line aria-label={label} data={{
    labels: periods.map(p => month(p, true)),
    datasets: lines.map((line, i) => ({
      label: line.label, data: line.values, borderColor: palette.colors[i % palette.colors.length],
      pointBackgroundColor: palette.colors[i % palette.colors.length], borderWidth: 2,
      pointRadius: 2.5, pointHoverRadius: 5, tension: 0.1, spanGaps: false,
    })),
  }} options={{
    maintainAspectRatio: false, animation: reduced ? false : { duration: 160 },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 8, color: palette.text }, border: { color: palette.grid } },
      y: { grid: { color: palette.grid }, ticks: { color: palette.text }, border: { color: palette.grid } },
    },
    plugins: { legend: { display: lines.length > 1, labels: { usePointStyle: true, pointStyleWidth: 9, boxHeight: 8, padding: 13, color: palette.text } } },
  }} /></div>;
}
