import { Button, Dialog, FormControl, Textarea } from '@primer/react';
import { BookIcon, ChevronRightIcon, PaperAirplaneIcon } from '@primer/octicons-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { geographic, month, number, rank, type Row } from './data';
import { url } from './navigation';
import { MethodLink } from './Controls';
import { TerritoryLabel } from './TerritoryLabel';
import { territoryName } from './territorySearch';

type ComparisonValue = { id: string; score?: number; risco?: number; oportunidade?: number };
type Comparison = { tipo: 'score' | 'grafico'; diferenca?: number; valores: ComparisonValue[] };
type Answer = { resumo: string; detalhes?: string; comparacao?: Comparison };

const analysisUrl = import.meta.env.VITE_ANALYSIS_URL || (!import.meta.env.VITE_DATA_URL ? 'api/analise' : '');
const errors: Record<number, string> = {
  403: 'A análise não está disponível neste endereço.',
  503: 'A análise com IA ainda não foi habilitada neste servidor.',
};

export function Assistant({ rows, period, allRows, close }: {
  rows: Row[]; period: string; allRows: Row[]; close: () => void;
}) {
  const request = useRef<AbortController | null>(null);
  const answerSection = useRef<HTMLElement>(null);
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState<Answer>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const length = question.trim().length;
  const canSend = !!analysisUrl && rows.length > 0 && length >= 2 && length <= 500;
  const rankedCount = rank(allRows).length;

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (reply) answerSection.current?.scrollIntoView({ block: 'nearest' });
  }, [reply]);

  async function ask(event: FormEvent) {
    event.preventDefault();
    if (!canSend || request.current) return;
    setError('');
    setReply(undefined);
    setPending(true);
    const abort = new AbortController();
    request.current = abort;
    try {
      const response = await fetch(analysisUrl, {
        method: 'POST', signal: abort.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes: period, sub_regioes: rows.map(row => row.id), pergunta: question.trim() }),
      });
      if (response.status === 429) {
        const seconds = Number(response.headers.get('Retry-After'));
        throw new Error(seconds > 0 ? `Muitas análises neste minuto. Tente em ${seconds} s.`
          : 'Muitas análises neste minuto. Tente novamente em instantes.');
      }
      if (!response.ok) throw new Error(errors[response.status] || 'Não foi possível gerar a explicação agora. Tente novamente.');
      const result = await response.json();
      if (typeof result.resumo !== 'string' || !result.resumo.trim()) throw new Error('A resposta veio vazia. Tente novamente.');
      setReply(result);
    } catch (reason) {
      if (!abort.signal.aborted) setError(reason instanceof TypeError || reason instanceof SyntaxError
        ? 'Não foi possível conectar ao serviço de análise. Tente novamente.'
        : reason instanceof Error ? reason.message : 'Não foi possível gerar a explicação agora.');
    } finally {
      request.current = null;
      if (!abort.signal.aborted) setPending(false);
    }
  }

  return <Dialog className="analysis-dialog" position={{ narrow: 'fullscreen', regular: 'right' }} width="large"
    title={rows.length === 1 ? 'Explicar score' : 'Explicar diferenças'} subtitle={month(period)} onClose={close}>
    <div className="analysis-content">
      <section aria-labelledby="analysis-context">
        <div className="heading-inline"><h3 id="analysis-context">Dados da análise</h3>
          {rows.some(row => row.legacyRisk) && <MethodLink period={period} onNavigate={close} />}</div>
        <ul className="analysis-territories">
          {rows.map(row => <li key={row.id}><a href={url('sub', period, row.id)} onClick={close}>
            <TerritoryLabel row={row} />
            <span className="analysis-score">
              <strong>{number(row.score)}</strong>
              {row.ranking != null && <small>{row.ranking}º de {rankedCount}</small>}
            </span>
            <ChevronRightIcon />
          </a></li>)}
        </ul>
      </section>
      {analysisUrl ? <form className="analysis-form" onSubmit={ask}>
        <FormControl>
          <FormControl.Label>Sua pergunta</FormControl.Label>
          <Textarea block maxLength={500} rows={3} value={question} disabled={pending}
            onChange={event => setQuestion(event.target.value)} />
          {question.length >= 450 && <FormControl.Caption>{question.length}/500 caracteres</FormControl.Caption>}
        </FormControl>
        <Button variant="primary" type="submit" leadingVisual={PaperAirplaneIcon} loading={pending}
          loadingAnnouncement="Gerando explicação" disabled={!canSend || pending}>
          Gerar explicação
        </Button>
      </form> : <p className="analysis-notice">A análise com IA ainda não foi habilitada nesta publicação.</p>}
      <div aria-live="polite" aria-atomic="true">
        {error && <p className="analysis-notice">{error}</p>}
        {reply && <section className="analysis-answer" ref={answerSection}>
          <h3>Resposta</h3>
          <p>{formatAnswer(reply.resumo, rows)}</p>
          {reply.comparacao && <AnalysisComparison comparison={reply.comparacao} rows={rows} />}
          {reply.detalhes && <details className="answer-details">
            <summary>Ver detalhes</summary><p>{formatAnswer(reply.detalhes, rows)}</p>
          </details>}
        </section>}
      </div>
      <a className="text-link" href={url('metodologia', period)} onClick={close}><BookIcon /> Fontes e metodologia</a>
    </div>
  </Dialog>;
}

function formatAnswer(text: string, rows: Row[]) {
  return text.replace(/\b[A-Z]{2}-[0-9]{2}\b/g, id => {
    const row = rows.find(item => item.id === id);
    if (!row) return id;
    const name = territoryName(row);
    return rows.some(item => item.id !== id && territoryName(item) === name)
      ? name + ' (' + geographic(row) + ')'
      : name;
  });
}

function AnalysisComparison({ comparison, rows }: { comparison: Comparison; rows: Row[] }) {
  const score = comparison.tipo === 'score';
  const baseline = comparison.valores.find(value => value.id === 'media');
  const selected = comparison.valores.find(value => value.id !== 'media');
  const riskGain = baseline?.risco != null && selected?.risco != null ? baseline.risco - selected.risco : 0;
  const opportunityGain = baseline?.oportunidade != null && selected?.oportunidade != null
    ? selected.oportunidade - baseline.oportunidade : 0;
  return <div className="answer-comparison">
    {score && comparison.diferenca != null && <p className="answer-difference">
      <strong>{number(comparison.diferenca)}</strong> pontos de diferença no score
    </p>}
    {score && <p className="answer-rule">
      {riskGain > 0 && riskGain < opportunityGain
        ? `A oportunidade está ${number(opportunityGain)} acima da média. O risco está só ${number(riskGain)} abaixo e tem mais peso no score.`
        : 'Risco menor melhora a capacidade de crédito, que pesa mais no cálculo do score que a oportunidade.'}
    </p>}
    <ul className="answer-values" aria-label={score && !baseline ? 'Scores comparados' : 'Risco e oportunidade comparados'}>
      {comparison.valores.map(value => {
        const row = rows.find(item => item.id === value.id);
        return <li key={value.id}>
          <span className="answer-place">{row ? territoryName(row) : value.id === 'media' ? 'Média do painel' : value.id}</span>
          {row && <span className="answer-code">{geographic(row)}</span>}
          {score && value.score != null && <strong className="answer-score">{number(value.score)}</strong>}
          {value.risco != null && <span>Risco <b>{number(value.risco)}</b></span>}
          {value.oportunidade != null && <span>Oportunidade <b>{number(value.oportunidade)}</b></span>}
        </li>;
      })}
    </ul>
    {score && baseline && <p className="answer-scope">
      O score cobre o prefixo de CEP. Os indicadores de oportunidade são estaduais.
    </p>}
  </div>;
}
