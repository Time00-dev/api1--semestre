import { Button, Dialog, FormControl, Textarea, TextInput } from '@primer/react';
import { BookIcon, ChevronRightIcon, PaperAirplaneIcon } from '@primer/octicons-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { month, number, rank, type Row } from './data';
import { url } from './navigation';
import { MethodLink } from './Controls';
import { TerritoryLabel } from './TerritoryLabel';

const analysisUrl = import.meta.env.VITE_ANALYSIS_URL || (!import.meta.env.VITE_DATA_URL ? 'api/analise' : '');
const errors: Record<number, string> = {
  401: 'A credencial não foi aceita. Confira e tente novamente.',
  403: 'A análise não está disponível neste endereço.',
  429: 'A cota de análises foi atingida. Tente novamente mais tarde.',
  503: 'A análise com IA ainda não foi habilitada neste servidor.',
};

export function Assistant({ rows, period, allRows, close }: {
  rows: Row[]; period: string; allRows: Row[]; close: () => void;
}) {
  const request = useRef<AbortController | null>(null);
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [access, setAccess] = useState('');
  const [accessRequired, setAccessRequired] = useState(false);
  const accessField = useRef<HTMLInputElement>(null);
  const length = question.trim().length;
  const canSend = !!analysisUrl && rows.length > 0 && length >= 2 && length <= 500;
  const rankedCount = rank(allRows).length;

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (accessRequired) accessField.current?.focus(); }, [accessRequired]);

  async function ask(event: FormEvent) {
    event.preventDefault();
    if (!canSend || request.current || (accessRequired && !access.trim())) return;
    setError('');
    setReply('');
    setPending(true);
    const abort = new AbortController();
    request.current = abort;
    try {
      const response = await fetch(analysisUrl, {
        method: 'POST', signal: abort.signal,
        headers: { 'Content-Type': 'application/json', ...(access.trim() && { Authorization: 'Bearer ' + access.trim() }) },
        body: JSON.stringify({ mes: period, sub_regioes: rows.map(row => row.id), pergunta: question.trim() }),
      });
      if (response.status === 401) {
        setAccessRequired(true);
        if (access.trim()) setError(errors[401]);
        return;
      }
      if (!response.ok) throw new Error(errors[response.status] || 'Não foi possível gerar a explicação agora. Tente novamente.');
      const result = await response.json();
      if (typeof result.resumo !== 'string' || !result.resumo.trim()) throw new Error('A resposta veio vazia. Tente novamente.');
      setAccessRequired(false);
      setReply(result.resumo);
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
        {accessRequired && <FormControl>
          <FormControl.Label>Credencial de acesso</FormControl.Label>
          <TextInput ref={accessField} block type="password" value={access} autoComplete="off" disabled={pending}
            onChange={event => setAccess(event.target.value)} />
        </FormControl>}
        <Button variant="primary" type="submit" leadingVisual={PaperAirplaneIcon} loading={pending}
          loadingAnnouncement="Gerando explicação" disabled={!canSend || pending || (accessRequired && !access.trim())}>
          {accessRequired ? 'Confirmar e gerar' : 'Gerar explicação'}
        </Button>
      </form> : <p className="analysis-notice">A análise com IA ainda não foi habilitada nesta publicação.</p>}
      <div aria-live="polite" aria-atomic="true">
        {error && <p className="analysis-notice">{error}</p>}
        {reply && <section className="analysis-answer"><h3>Explicação gerada por IA</h3><p>{reply}</p></section>}
      </div>
      <a className="text-link" href={url('metodologia', period)} onClick={close}><BookIcon /> Fontes e metodologia</a>
    </div>
  </Dialog>;
}
