import { Breadcrumbs, Button, CounterLabel, IconButton, NavList } from '@primer/react';
import { ArrowUpRightIcon, BookIcon, ChevronDownIcon, HomeIcon, GitCompareIcon, GlobeIcon, GraphIcon, MarkGithubIcon, MoonIcon, SunIcon } from '@primer/octicons-react';
import { QrCode } from 'lucide-react';
import { lazy, Suspense, useId, useRef, useState, type ReactNode } from 'react';
import { compareLink, pages, url, type Page } from './navigation';

const repo = 'https://github.com/Time00-dev/api1--semestre';
const icons = [HomeIcon, GlobeIcon, GitCompareIcon, GraphIcon, BookIcon];
const SharePanel = lazy(() => import('./SharePanel').then(module => ({ default: module.SharePanel })));

export function Shell({ page, detailLabel, period, pinned, theme, onTheme, children }: {
  page: Page; detailLabel?: string; period: string; pinned: string[]; theme: 'light' | 'dark'; onTheme: () => void; children: ReactNode;
}) {
  const id = useId();
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const shareTrigger = useRef<HTMLButtonElement>(null);
  const [sharing, setSharing] = useState(false);
  const active = page === 'sub' ? 'subregioes' : page;
  const activeIndex = pages.findIndex(([key]) => key === active);
  const CurrentIcon = icons[activeIndex];
  const themeLabel = theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro';
  const parents = [{ key: 'geral' as const, label: 'Panorama' }];
  const trail = page === 'geral' ? [] : page === 'sub'
    ? [...parents, { key: 'subregioes' as const, label: 'Sub-regiões' }] : parents;
  const breadcrumbs = trail.map(item =>
    <Breadcrumbs.Item key={item.key} href={url(item.key, period)}>{item.label}</Breadcrumbs.Item>);
  const currentLabel = page === 'sub' ? detailLabel || 'Ficha' : pages[activeIndex][1];
  breadcrumbs.push(page === 'geral'
    ? <Breadcrumbs.Item key={page} href={url(page, period)} selected aria-current="page">{currentLabel}</Breadcrumbs.Item>
    : <Breadcrumbs.Item key={page} as="span" selected aria-current="page">{currentLabel}</Breadcrumbs.Item>);
  const pageLink = (key: typeof pages[number][0]) =>
    key === 'comparar' && pinned.length ? compareLink(period, pinned) : url(key, period);
  const mobileItems = pages.map(([key, label], index) => {
    const Icon = icons[index];
    const target = pageLink(key);
    return <NavList.Item key={key} href={target} aria-current={active === key ? 'page' : undefined}
      onClick={() => { menu.current?.hidePopover(); trigger.current?.focus({ preventScroll: true }); }}>
      <NavList.LeadingVisual><Icon /></NavList.LeadingVisual>
      {label}
      {key === 'comparar' && pinned.length > 0 && <NavList.TrailingVisual><CounterLabel>{pinned.length}</CounterLabel></NavList.TrailingVisual>}
    </NavList.Item>;
  });

  return <>
    <aside className="sidebar">
      <a className="brand" href={url('geral', period)}>
        <img src={import.meta.env.BASE_URL + 'time00.svg'} alt="" width="45" height="29" />
        <span>Negado pelo Banco</span>
      </a>
      <nav className="rail-nav" aria-label="Páginas">
        <ul>{pages.map(([key, label], index) => {
          const Icon = icons[index];
          return <li key={key}><a className="rail-item" href={pageLink(key)} aria-current={active === key ? 'page' : undefined}>
            <Icon /><span>{label}</span>
            {key === 'comparar' && pinned.length > 0 && <CounterLabel>{pinned.length}</CounterLabel>}
          </a></li>;
        })}</ul>
      </nav>
      <div className="rail-footer">
        <a href={repo} target="_blank" rel="noreferrer"><MarkGithubIcon /> GitHub <ArrowUpRightIcon size={13} /></a>
        <span>Time00.dev · FATEC</span>
      </div>
    </aside>
    <header className="site-header">
      <div className="shell topline">
        <a className="mobile-brand" href={url('geral', period)}>
          <img src={import.meta.env.BASE_URL + 'time00.svg'} alt="" width="40" height="25" />
          <span>Negado pelo Banco</span>
        </a>
        <Breadcrumbs className="breadcrumb" aria-label="Caminho da página">{breadcrumbs}</Breadcrumbs>
        <div className="mobile-navigation">
          <Button ref={trigger} className="mobile-nav-trigger" popoverTarget={id} alignContent="start"
            leadingVisual={CurrentIcon} trailingVisual={ChevronDownIcon}
            aria-label={'Selecionar página · ' + pages[activeIndex][1]}>
            {pages[activeIndex][1]}
          </Button>
          <div id={id} ref={menu} popover="auto" className="popover page-picker">
            <NavList aria-label="Selecionar página">{mobileItems}</NavList>
          </div>
        </div>
        <div className="header-actions">
          <IconButton className="theme-switch" variant="invisible" icon={theme === 'dark' ? SunIcon : MoonIcon}
            aria-label={themeLabel} onClick={onTheme} />
        </div>
      </div>
    </header>
    {children}
    <footer className="site-footer">
      <div className="shell">
        <span className="footer-credit">Time00.dev · FATEC</span>
        <nav className="footer-actions" aria-label="Informações do painel">
          <a className="footer-repo" href={repo} target="_blank" rel="noreferrer"><MarkGithubIcon /> GitHub</a>
          <a href={url('metodologia', period)}><BookIcon /> Metodologia</a>
          <Button ref={shareTrigger} variant="invisible" leadingVisual={() => <QrCode size={16} />}
            onClick={() => setSharing(true)} aria-label="Compartilhar painel por QR Code">QR Code</Button>
        </nav>
      </div>
    </footer>
    {sharing && <Suspense fallback={null}><SharePanel close={() => {
      setSharing(false);
      requestAnimationFrame(() => shareTrigger.current?.focus());
    }} /></Suspense>}
  </>;
}
