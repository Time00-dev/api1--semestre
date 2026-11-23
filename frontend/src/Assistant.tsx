import { ArrowUpRight, BookOpen } from 'lucide-react';
import { Button, FormControl, IconButton, Textarea, TextInput } from '@primer/react';
import { PaperAirplaneIcon, XIcon } from '@primer/octicons-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { geographic, month, number, rank, type Row } from './data';
import { url } from './navigation';
import { MethodLink } from './Controls';

type Answer = { resumo: string; modelo: string };
export function Assistant({ rows, period, allRows, close }: {
  rows: Row[]; period: string; allRows: Row[]; close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const [question, setQuestion] = useState(rows.length > 1 ? 'Compare os scores e os indicadores destas sub-regiões.' : 'Como interpretar o score desta sub-região?');
  const [reply, setReply] = useState<Answer>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [access, setAccess] = useState('');
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); request.current?.abort(); };
  }, []);

  async function ask(event: FormEvent) {
    event.preventDefault();
    if (!question.trim() || pending || !rows.length) return;
    if (import.meta.env.VITE_DATA_URL && !import.meta.env.VITE_ANALYSIS_URL) {
      setError('A geração por IA ainda não foi habilitada nesta publicação.');
      return;
    }
    setError('');
    setReply(undefined);
    setPending(true);
    const abort = new AbortController();
    request.current = abort;
    try {
      const response = await fetch(import.meta.env.VITE_ANALYSIS_URL || 'api/analise', {
        method: 'POST', signal: abort.signal, headers: {
          'Content-Type': 'application/json', ...(access ? { Authorization: 'Bearer ' + access } : {}),
        },
        body: JSON.stringify({ mes: period, sub_regioes: rows.map(row => row.id), pergunta: question.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.resumo !== 'string') throw new Error(result.erro || 'Serviço de análise temporariamente indisponível.');
      setReply(result);
    } catch (err) {
      if (!abort.signal.aborted) setError(err instanceof Error ? err.message : 'Serviço de análise indisponível.');
    } finally {
      if (!abort.signal.aborted) setPending(false);
    }
  }

  return <dialog ref={dialog} className="assistant" onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => { if (event.target === event.currentTarget) close(); }}
    aria-labelledby="assistant-title">
    <section className="assistant-content">
      <header><h2 id="assistant-title">{rows.length === 1 ? 'Explicar score' : 'Explicar diferenças'}</h2>
        <IconButton icon={XIcon} aria-label="Fechar análise" onClick={close} /></header>
      <div className="heading-inline"><p className="muted">{month(period)} · {rows.length === 1 ? geographic(rows[0]) : rows.length + ' sub-regiões'}</p>{rows.some(row => row.legacyRisk) && <MethodLink period={period} onNavigate={close} />}</div>
      <div className="assistant-records">
        <h3>Na análise</h3>
        {rows.map(row => <a key={row.id} href={url('sub', period, row.id)} onClick={close}>
          <span>{geographic(row)}<small>{row.ranking == null ? 'Sem posição publicada' : row.ranking + 'º de ' + rank(allRows).length + ' no ranking'}</small></span>
          <strong>{number(row.score)}</strong><ArrowUpRight size={15} />
        </a>)}
      </div>
      <form onSubmit={ask}>
        <FormControl required>
          <FormControl.Label>Pergunta</FormControl.Label>
          <Textarea block maxLength={500} rows={3} value={question} onChange={event => setQuestion(event.target.value)} />
        </FormControl>
        <details className="ai-access">
          <summary>Código de acesso da equipe</summary>
          <TextInput block type="password" aria-label="Código de acesso da equipe" value={access} autoComplete="off"
            onChange={event => setAccess(event.target.value)} />
        </details>
        <Button variant="primary" type="submit" leadingVisual={PaperAirplaneIcon} loading={pending} loadingAnnouncement="Consultando a base"
          disabled={!question.trim()}>Gerar explicação</Button>
      </form>
      <div aria-live="polite">
        {error && <p className="notice ai-error">{error}</p>}
        {reply && <section className="ai-reply"><h3>Explicação gerada por IA</h3><p>{reply.resumo}</p></section>}
      </div>
      <a className="text-link" href={url('metodologia', period)} onClick={close}><BookOpen size={15} /> Fontes e metodologia <ArrowUpRight size={13} /></a>
    </section>
  </dialog>;
}
