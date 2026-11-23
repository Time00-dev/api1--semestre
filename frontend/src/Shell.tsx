import { Breadcrumbs, Button, CounterLabel, NavList } from '@primer/react';
import { ArrowUpRightIcon, BookIcon, ChevronDownIcon, HomeIcon, GitCompareIcon, GlobeIcon, GraphIcon, MoonIcon, SunIcon } from '@primer/octicons-react';
import { useId, useRef } from 'react';
import { compareLink, pages, url, type Page } from './navigation';

const repo = 'https://github.com/Time00-dev/api1--semestre';
const icons = [HomeIcon, GlobeIcon, GitCompareIcon, GraphIcon, BookIcon];

export function Shell({ page, detailLabel, period, pinned, theme, onTheme }: {
  page: Page; detailLabel?: string; period: string; pinned: string[]; theme: 'light' | 'dark'; onTheme: () => void;
}) {
  const id = useId();
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const active = page === 'sub' ? 'subregioes' : page;
  const activeIndex = pages.findIndex(([key]) => key === active);
  const CurrentIcon = icons[activeIndex];
  const themeLabel = theme === 'dark' ? 'Tema claro' : 'Tema escuro';
  const parents = [{ key: 'geral' as const, label: 'Panorama' }];
  const trail = page === 'sub' ? [...parents, { key: 'subregioes' as const, label: 'Sub-regiões' }] : parents;
  const items = (mobile = false) => pages.map(([key, label], index) => {
    const Icon = icons[index];
    const target = key === 'comparar' && pinned.length ? compareLink(period, pinned) : url(key, period);
    return <NavList.Item key={key} href={target} aria-current={active === key ? 'page' : undefined}
      onClick={mobile ? () => { menu.current?.hidePopover(); trigger.current?.focus({ preventScroll: true }); } : undefined}>
      <NavList.LeadingVisual><Icon /></NavList.LeadingVisual>
      {label}
      {key === 'comparar' && pinned.length > 0 && <NavList.TrailingVisual><CounterLabel>{pinned.length}</CounterLabel></NavList.TrailingVisual>}
    </NavList.Item>;
  });

  return <>
    <aside className="sidebar">
      <a className="brand" href={url('geral', period)}>
        <img src={import.meta.env.BASE_URL + 'time00.svg'} alt="" width="45" height="29" />
        <span>Negado pelo<br />Banco</span>
      </a>
      <NavList className="rail-nav" aria-label="Páginas">{items()}</NavList>
      <div className="rail-footer">
        <a href={repo} target="_blank" rel="noreferrer">GitHub <ArrowUpRightIcon size={14} /></a>
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
          <Breadcrumbs className="breadcrumb">
            {trail.map(item => <Breadcrumbs.Item key={item.key} href={url(item.key, period)}>{item.label}</Breadcrumbs.Item>)}
            <Breadcrumbs.Item as="span" selected aria-current="page">{page === 'sub' ? detailLabel || 'Ficha' : pages[activeIndex][1]}</Breadcrumbs.Item>
          </Breadcrumbs>}
        <div className="mobile-navigation">
          <Button ref={trigger} className="mobile-nav-trigger" popoverTarget={id} alignContent="start"
            leadingVisual={CurrentIcon} trailingVisual={ChevronDownIcon}
            aria-label={'Selecionar página · ' + pages[activeIndex][1]}>
            {pages[activeIndex][1]}
          </Button>
          <div id={id} ref={menu} popover="auto" className="popover page-picker">
            <NavList aria-label="Selecionar página">{items(true)}</NavList>
          </div>
        </div>
        <Button className="theme-switch" onClick={onTheme} leadingVisual={theme === 'dark' ? SunIcon : MoonIcon}
          aria-label={'Ativar ' + themeLabel.toLowerCase()}>
          <span className="theme-label">{themeLabel}</span>
        </Button>
      </div>
    </header>
  </>;
}
