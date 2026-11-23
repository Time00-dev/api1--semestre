import { ArrowUpRight, BookOpenText, ChartNoAxesCombined, ChevronDown, ChevronRight, Compass, GitCompareArrows, Map, Moon, Sun } from 'lucide-react';
import { useId, useRef } from 'react';
import { pages, url, type Page } from './navigation';

const repo = 'https://github.com/Time00-dev/api1--semestre';
const icons = [Compass, Map, GitCompareArrows, ChartNoAxesCombined, BookOpenText];

export function Shell({ page, detailLabel, period, pinned, theme, onTheme }: {
  page: Page; detailLabel?: string; period: string; pinned: string[]; theme: 'light' | 'dark'; onTheme: () => void;
}) {
  const id = useId();
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const active = page === 'sub' ? 'subregioes' : page;
  const activeIndex = pages.findIndex(([key]) => key === active);
  const CurrentIcon = icons[activeIndex];
  const items = (mobile = false) => pages.map(([key, label], index) => {
    const Icon = icons[index];
    const target = key === 'comparar' && pinned.length ? url(key, period, undefined, { s: pinned.join(',') }) : url(key, period);
    return <a key={key} href={target} aria-current={active === key ? 'page' : undefined}
      onClick={mobile ? () => { menu.current?.hidePopover(); trigger.current?.focus({ preventScroll: true }); } : undefined}>
      <Icon size={18} /><span>{label}</span>{key === 'comparar' && pinned.length > 0 && <small>{pinned.length}</small>}
    </a>;
  });

  return <>
    <aside className="sidebar">
      <a className="brand" href={url('geral', period)}>
        <img src={import.meta.env.BASE_URL + 'time00.svg'} alt="" width="45" height="29" />
        <span>Negado pelo<br />Banco</span>
      </a>
      <nav className="rail-nav" aria-label="Páginas">{items()}</nav>
      <div className="rail-footer">
        <a href={repo} target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={15} /></a>
        <span>Time00.dev · FATEC</span>
      </div>
    </aside>
    <header className="site-header">
      <div className="shell topline">
        <a className="mobile-brand" href={url('geral', period)}>
          <img src={import.meta.env.BASE_URL + 'time00.svg'} alt="" width="40" height="25" />
          <span>Negado pelo Banco</span>
        </a>
        {page === 'geral' ? <span className="section-path">Panorama</span> :
          <nav className="breadcrumb" aria-label="Caminho da página">
            <ol>
              <li><a href={url('geral', period)}>Panorama</a></li>
              {page === 'sub' && <li><ChevronRight size={13} aria-hidden="true" /><a href={url('subregioes', period)}>Sub-regiões</a></li>}
              <li><ChevronRight size={13} aria-hidden="true" />
                <span aria-current="page">{page === 'sub' ? detailLabel || 'Ficha' : pages[activeIndex][1]}</span></li>
            </ol>
          </nav>}
        <div className="mobile-navigation">
          <button ref={trigger} className="mobile-nav-trigger" popoverTarget={id}
            aria-label={'Selecionar página · ' + pages[activeIndex][1]}>
            <CurrentIcon size={17} /><span>{pages[activeIndex][1]}</span><ChevronDown size={16} />
          </button>
          <div id={id} ref={menu} popover="auto" className="popover page-picker">
            <nav aria-label="Selecionar página">{items(true)}</nav>
          </div>
        </div>
        <button className="theme-switch" type="button" onClick={onTheme}
          aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>
        </button>
      </div>
    </header>
  </>;
}
