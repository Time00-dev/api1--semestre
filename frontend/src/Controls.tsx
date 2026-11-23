import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, CircleHelp } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { month } from './data';
import { url } from './navigation';

const monthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function Period({ months, value, set }: { months: string[]; value: string; set: (m: string) => void }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const years = [...new Set(months.map(m => m.slice(0, 4)))].reverse();
  const [year, setYear] = useState(value.slice(0, 4));
  const index = years.indexOf(year);
  const available = new Set(months);
  const latest = months.at(-1)!;
  function choose(m: string) {
    popover.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
    set(m);
  }
  return <div className="period-control">
    <button type="button" ref={trigger} className="period-trigger" popoverTarget={id} onClick={() => setYear(value.slice(0, 4))}>
      <CalendarDays size={18} />
      <span><small>Competência</small><strong>{month(value)}</strong></span>
      <ChevronDown size={16} className="period-caret" />
    </button>
    <div id={id} ref={popover} className="period-picker popover" popover="auto" aria-label="Escolher competência">
      <div className="year-controls">
        <button type="button" className="icon-button" aria-label="Ano anterior" onClick={() => setYear(years[index + 1])} disabled={index >= years.length - 1}><ChevronLeft size={18} /></button>
        <label><span className="sr-only">Ano da competência</span><select value={year} onChange={event => setYear(event.target.value)}>
          {years.map(option => <option key={option}>{option}</option>)}
        </select></label>
        <button type="button" className="icon-button" aria-label="Próximo ano" onClick={() => setYear(years[index - 1])} disabled={index <= 0}><ChevronRight size={18} /></button>
      </div>
      <div className="month-grid" role="group" aria-label={'Meses de ' + year}>
        {monthsShort.map((label, i) => {
          const key = year + String(i + 1).padStart(2, '0');
          const exists = available.has(key);
          return <button type="button" key={key} disabled={!exists} aria-pressed={key === value}
            aria-label={month(key) + (exists ? '' : ' · indisponível')} onClick={() => choose(key)}>{label}</button>;
        })}
      </div>
      <button type="button" className="latest-period" onClick={() => choose(latest)}>Último disponível <span>{month(latest, true)}</span></button>
    </div>
  </div>;
}

export function MethodLink({ period, onNavigate }: { period: string; onNavigate?: () => void }) {
  const id = useId();
  const [dismissed, setDismissed] = useState(false);
  return <span className={'method-hint' + (dismissed ? ' dismissed' : '')}
    onMouseEnter={() => setDismissed(false)} onFocus={() => setDismissed(false)}
    onKeyDown={event => {
      if (event.key === 'Escape' && !dismissed) {
        setDismissed(true);
        event.preventDefault();
        event.stopPropagation();
      }
    }}>
    <a className="hint-button" href={url('metodologia', period, undefined, { secao: 'fragilidade' })}
      aria-label="Metodologia da nota de fragilidade" aria-describedby={id} onClick={onNavigate}>
      <CircleHelp size={17} />
    </a>
    <span id={id} role="tooltip" className="method-tooltip">A nota de fragilidade deixou de ser informada a partir de jan/2025. O risco exibido usa as notas disponíveis e o ranking mantém o score publicado. Consulte o método.</span>
  </span>;
}
