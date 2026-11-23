export const indicators = {
  inadimplenciaReal: ['Inadimplência', 'Sub-região', 'Nota da parcela da carteira de crédito vencida.'],
  fragilidadeRenda: ['Fragilidade da carteira', 'Sub-região', 'Nota da parcela da carteira nas classes de risco D–H, quando disponível.'],
  agingDivida: ['Crescimento da dívida vencida', 'Sub-região', 'Nota da variação anual do saldo vencido há mais de 15 dias.'],
  vulnerabilidadeSocial: ['Vulnerabilidade social', 'UF', 'Nota de vulnerabilidade social no estado.'],
  maturidadePix: ['Maturidade Pix', 'UF', 'Nota de adoção e uso financeiro do Pix no estado.'],
  crescimentoPopulacional: ['Crescimento populacional', 'UF', 'Nota de crescimento da população estadual.'],
  totalHabitantes: ['Total de habitantes', 'UF', 'Nota do porte populacional do estado.'],
  bonusDemografico: ['Bônus demográfico', 'UF', 'Nota da composição etária da população estadual.'],
} as const;
export type Indicator = keyof typeof indicators;
export const riskKeys: Indicator[] = ['inadimplenciaReal', 'fragilidadeRenda', 'agingDivida', 'vulnerabilidadeSocial'];
export const potentialKeys: Indicator[] = ['maturidadePix', 'crescimentoPopulacional', 'totalHabitantes', 'bonusDemografico'];
export const regions = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

type Raw = Partial<Record<Indicator, number | null>> & {
  ano_mes: string; uf: string; sub_regiao: string; regiao: string;
  nome_sub_regiao?: string | null; score?: number | null; ranking?: number | null;
  faixa?: string | null; operacoes?: number | null; peso?: number | null;
};
export type Row = Raw & { id: string; name: string; risk: number | null; potential: number | null; legacyRisk: boolean };
export type Dataset = { months: string[]; byMonth: Map<string, Row[]> };
const validNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
export function mean(list: (number | null | undefined)[]) {
  const values = list.filter(validNumber);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}
export const note = (row: Raw, field: Indicator): number | null => {
  const value = row[field];
  if (field === 'fragilidadeRenda' && row.ano_mes >= '202501') return null;
  return validNumber(value) && value >= 1 && value <= 5 ? value : null;
};
export const number = (n?: number | null, digits = 2) =>
  validNumber(n) ? n.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—';
export const month = (m: string, short = false) => new Intl.DateTimeFormat('pt-BR', {
  year: short ? '2-digit' : 'numeric', month: short ? 'short' : 'long', timeZone: 'UTC',
}).format(new Date(Date.UTC(+m.slice(0, 4), +m.slice(4) - 1)));
export const geographic = (row: Row) => row.uf + ' · CEP ' + row.sub_regiao;
export const rank = (rows: Row[]) => rows.filter(row => validNumber(row.ranking) && validNumber(row.score))
  .sort((a, b) => a.ranking! - b.ranking! || a.id.localeCompare(b.id));
export const series = (data: Dataset, m: string, id: string) => data.months.filter(v => v <= m).slice(-12)
  .map(period => ({ period, row: data.byMonth.get(period)?.find(row => row.id === id) }));

export function previousObservation(data: Dataset, period: string, id: string) {
  const previous = data.months[data.months.indexOf(period) - 1];
  return previous ? { period: previous, row: data.byMonth.get(previous)?.find(row => row.id === id) } : null;
}

export const scoreDifference = (now?: number | null, before?: number | null) =>
  now == null || before == null ? null : now - before;

export const signedNumber = (value: number | null) => value == null ? '—' : (value > 0 ? '+' : '') + number(value);

export async function loadDataWithRetry(signal: AbortSignal): Promise<Dataset> {
  try {
    return await loadData(AbortSignal.any([signal, AbortSignal.timeout(6000)]));
  } catch (error) {
    if (signal.aborted || !(error instanceof TypeError || (error instanceof DOMException && error.name === 'TimeoutError'))) throw error;
  }
  try {
    return await loadData(AbortSignal.any([signal, AbortSignal.timeout(11000)]));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') throw new Error('A fonte demorou para responder.');
    throw error;
  }
}

async function loadData(signal: AbortSignal): Promise<Dataset> {
  const url = import.meta.env.VITE_DATA_URL || 'api/sub-regioes';
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('A fonte respondeu com o status ' + response.status + '.');
  const data: { eixo_i?: Raw[]; eixo_ii?: Raw[] } = await response.json();
  if (!Array.isArray(data.eixo_i) || !Array.isArray(data.eixo_ii)) throw new Error('A fonte retornou um formato inesperado.');
  return normalizeData(data.eixo_i, data.eixo_ii);
}

export function normalizeData(riskRows: Raw[], opportunityRows: Raw[]): Dataset {
  const items = new Map<string, Raw>();
  const names = new Map<string, string>();
  const publishedScore = (value: unknown) => validNumber(value) && value >= 0 && value <= 100 ? value : null;
  const publishedRank = (value: unknown) => validNumber(value) && Number.isInteger(value) && value > 0 ? value : null;
  for (const row of [...riskRows, ...opportunityRows]) {
    if (!/^\d{4}(0[1-9]|1[0-2])$/.test(row.ano_mes) || !/^[A-Z]{2}$/.test(row.uf) || !/^\d{2}$/.test(row.sub_regiao)) continue;
    const id = row.uf + '-' + row.sub_regiao;
    const key = row.ano_mes + '/' + id;
    const prior = items.get(key);
    items.set(key, {
      ...prior, ...row,
      score: publishedScore(prior?.score) ?? publishedScore(row.score),
      ranking: publishedRank(prior?.ranking) ?? publishedRank(row.ranking),
      faixa: prior?.faixa?.trim() || row.faixa?.trim() || null,
    });
    if (row.nome_sub_regiao?.trim()) names.set(id, row.nome_sub_regiao.trim());
  }
  const byMonth = new Map<string, Row[]>();
  for (const raw of items.values()) {
    const id = raw.uf + '-' + raw.sub_regiao;
    const row: Row = {
      ...raw, id, name: names.get(id) || raw.uf + ' · CEP ' + raw.sub_regiao,
      risk: mean(riskKeys.map(k => note(raw, k))), potential: mean(potentialKeys.map(k => note(raw, k))),
      legacyRisk: raw.ano_mes >= '202501' && validNumber(raw.fragilidadeRenda) && raw.fragilidadeRenda > 0,
    };
    if (!byMonth.has(raw.ano_mes)) byMonth.set(raw.ano_mes, []);
    byMonth.get(raw.ano_mes)!.push(row);
  }
  return { byMonth, months: [...byMonth.keys()].sort() };
}
