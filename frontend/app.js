// Protótipo GJ00-43: software de análise navegável sobre mock_sub_regioes.json (formato de saída do notebook).
// Cálculo do fim da Sprint 2 (backend/api_refatorada.ipynb + sub-região): nota 0 = "sem dado".
const EIXO_I = { inadimplenciaReal: "Inadimplência", fragilidadeRenda: "Fragilidade (risco D-H)", agingDivida: "Cresc. da dívida vencida", vulnerabilidadeSocial: "Vulnerab. social" };
const EIXO_II = { maturidadePix: "Maturidade Pix", crescimentoPopulacional: "Crescimento pop.", totalHabitantes: "Habitantes", bonusDemografico: "Bônus demográfico" };
const INDICADORES = { risco: "Risco (média do Eixo I)", oport: "Oportunidade (média do Eixo II)", ...EIXO_I, ...EIXO_II };
const EXPLICA = {
  risco: "Média dos indicadores do Eixo I com dado, calculada no protótipo (o notebook entrega os 4 indicadores separados).",
  oport: "Média dos indicadores do Eixo II com dado, calculada no protótipo (o notebook entrega os 4 indicadores separados).",
  fragilidadeRenda: "Parte da carteira com risco D-H. A API do SCR não envia risco D-H desde jan/2025, então está sem dado no período.",
  agingDivida: "Crescimento da carteira vencida (acima de 15 dias) em relação ao mesmo mês do ano anterior.",
};
const MAIOR_E_PIOR = new Set(["risco", ...Object.keys(EIXO_I)]);
const REGIOES = ["Nordeste", "Norte", "Centro-Oeste", "Sudeste", "Sul"];
const CORES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"]; // paleta dataviz (escuro), validada para 5 séries
const CINZA = "#5b616b", BRANCO = "#f1f3f5", TXT = "#b8bfc9", GRID = "#2a2f36", ACENTO = "#3fc7f2";
const MAX_COMPARAR = 5;

const fmt = (n) => (n == null || Number.isNaN(n) ? "sem dado" : n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const sinal = (n) => `${n >= 0 ? "+" : "−"}${fmt(Math.abs(n))}`;
const mesTxt = (m) => new Date(+m.slice(0, 4), +m.slice(4) - 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
const mesCurto = (m) => `${new Date(+m.slice(0, 4), +m.slice(4) - 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}/${m.slice(2, 4)}`;
const media = (xs) => { const v = xs.filter(Number.isFinite); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN; }; // ignora "sem dado"
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

Chart.defaults.color = TXT;
Chart.defaults.font.family = "Inter, Arial, sans-serif";
Chart.defaults.borderColor = GRID;

const estado = { dados: [], meses: [], mes: null, porMes: new Map(), porChave: new Map(), selecao: new Set() };
let graficos = [];
const corDe = new Map(); // cor fixa por sub-região: segue a entidade, não a posição
const cor = (k) => { if (!corDe.has(k)) corDe.set(k, CORES[corDe.size % CORES.length]); return corDe.get(k); };

// ---------------- dados ----------------
fetch("dados/mock_sub_regioes.json").then((r) => r.json()).then((json) => {
  const reg = new Map();
  for (const r of [...json.eixo_i, ...json.eixo_ii]) {
    const chave = `${r.uf}-${r.sub_regiao}`, id = `${r.ano_mes}|${chave}`;
    reg.set(id, { ...(reg.get(id) || {}), ...r, chave, nome: r.nome_sub_regiao || `${r.uf} · CEP ${r.sub_regiao}` });
  }
  for (const r of reg.values()) for (const k of [...Object.keys(EIXO_I), ...Object.keys(EIXO_II)]) if (r[k] === 0) r[k] = null; // 0 = sem dado (fillna(0) do notebook)
  estado.dados = [...reg.values()].map((r) => ({ ...r, risco: media(Object.keys(EIXO_I).map((k) => r[k])), oport: media(Object.keys(EIXO_II).map((k) => r[k])) }));
  for (const r of estado.dados) {
    (estado.porMes.get(r.ano_mes) || estado.porMes.set(r.ano_mes, []).get(r.ano_mes)).push(r);
    (estado.porChave.get(r.chave) || estado.porChave.set(r.chave, []).get(r.chave)).push(r);
  }
  estado.porChave.forEach((v) => v.sort((a, b) => a.ano_mes.localeCompare(b.ano_mes)));
  estado.meses = [...estado.porMes.keys()].sort();
  estado.mes = estado.meses.at(-1);
  const sel = $("f-periodo");
  sel.innerHTML = estado.meses.map((m) => `<option value="${m}">${mesTxt(m)}</option>`).join("");
  sel.value = estado.mes;
  sel.onchange = () => { estado.mes = sel.value; render(); };
  window.addEventListener("hashchange", render);
  render();
});

const doMes = (mes = estado.mes) => estado.porMes.get(mes) || [];
const reg = (chave, mes = estado.mes) => doMes(mes).find((r) => r.chave === chave);
const serie = (chave) => estado.porChave.get(chave) || [];
const mediaDe = (rows, k) => media(rows.map((r) => r[k]));
const brasil = (mes = estado.mes) => { const rs = doMes(mes); return Object.fromEntries(Object.keys(INDICADORES).map((k) => [k, mediaDe(rs, k)])); };
const posicao = (r, k) => { const rs = doMes().slice().sort((a, b) => b[k] - a[k]); return rs.findIndex((x) => x.chave === r.chave) + 1; };
function top5Risco(regiao) {
  const pior = new Map();
  for (const r of doMes()) if (!regiao || r.regiao === regiao) if (!pior.has(r.uf) || r.risco > pior.get(r.uf).risco) pior.set(r.uf, r);
  return [...pior.values()].sort((a, b) => b.risco - a.risco).slice(0, 5);
}
const umPorUF = (rows) => rows.filter((r, i) => rows.findIndex((x) => x.uf === r.uf) === i);
const PROPRIOS_DA_SUB = new Set(["inadimplenciaReal", "agingDivida", "fragilidadeRenda", "risco", "oport"]); // os demais indicadores são estaduais
const linkSub = (r) => `<a href="#/sub/${r.chave}">${esc(r.nome)}</a>`;

// ---------------- roteamento ----------------
function rota() {
  const [caminho, qs] = location.hash.replace(/^#/, "").split("?");
  const partes = caminho.split("/").filter(Boolean);
  return { nome: partes[0] || "geral", arg: partes[1], q: new URLSearchParams(qs || "") };
}
function render() {
  graficos.forEach((g) => g.destroy()); graficos = [];
  const r = rota();
  const telas = { geral: telaGeral, subregioes: telaLista, sub: telaDetalhe, comparar: telaComparar, indicadores: telaIndicadores };
  (telas[r.nome] || telaGeral)(r);
  const ativo = r.nome === "sub" ? "subregioes" : r.nome;
  document.querySelectorAll(".menu a").forEach((a) => a.classList.toggle("ativo", a.dataset.rota === ativo));
}
const titulo = (t) => ($("titulo").textContent = t);
const tela = (html) => ($("tela").innerHTML = html);
const painel = (id, h, largo = false) => `<article class="painel${largo ? " largo" : ""}"><h2>${h}</h2><div class="canvas"><canvas id="g-${id}"></canvas></div></article>`;
const kpi = (rot, val, sub = "") => `<div class="kpi"><span>${rot}</span><strong>${val}</strong><small>${sub}</small></div>`;
const novo = (id, cfg) => graficos.push(new Chart($("g-" + id), cfg));
const eixoNota = (t) => ({ min: 1, max: 5, title: { display: true, text: t }, grid: { color: GRID } });

// rótulos dos pontos em destaque + linhas da média Brasil + quadrante
const extras = {
  id: "extras",
  afterDraw(ch, _a, o) {
    const { ctx, chartArea: ca, scales: { x, y } } = ch;
    ctx.save();
    if (o.br) {
      ctx.setLineDash([5, 4]); ctx.strokeStyle = BRANCO; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
      const bx = x.getPixelForValue(o.br.risco), by = y.getPixelForValue(o.br.oport);
      ctx.beginPath(); ctx.moveTo(bx, ca.top); ctx.lineTo(bx, ca.bottom); ctx.moveTo(ca.left, by); ctx.lineTo(ca.right, by); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.fillStyle = ACENTO; ctx.font = "600 12px Inter"; ctx.fillText("↖ menor risco, maior oportunidade", ca.left + 8, ca.top + 16);
      ctx.fillStyle = TXT; ctx.font = "12px Inter"; ctx.fillText("média Brasil", bx + 4, ca.bottom - 6);
    }
    const pts = ch.data.datasets.map((ds, i) => ({ ds, p: ch.getDatasetMeta(i).data[0] })).filter((o) => o.ds.rotulo && o.p).sort((a, b) => a.p.x - b.p.x);
    ctx.fillStyle = BRANCO; ctx.font = "600 12px Inter";
    pts.forEach(({ ds, p }, i) => { ctx.textAlign = i % 2 ? "left" : "right"; ctx.fillText(ds.rotulo, p.x + (i % 2 ? 10 : -10), p.y + (i % 2 ? 18 : -10)); });
    ctx.restore();
  },
};

// dispersão risco x oportunidade; clicar num ponto abre o detalhe
function mapa(id, destaques) {
  const br = brasil(), dk = new Set(destaques.map((d) => d.chave));
  const ponto = (r) => ({ x: r.risco, y: r.oport, nome: r.nome, chave: r.chave });
  novo(id, {
    type: "scatter",
    data: { datasets: [
      { label: "Sub-regiões", data: doMes().filter((r) => !dk.has(r.chave)).map(ponto), backgroundColor: CINZA, pointRadius: 4, pointHoverRadius: 7 },
      ...destaques.map((r) => ({ label: r.nome, rotulo: r.nome, data: [ponto(r)], backgroundColor: r.cor || cor(r.chave), borderColor: "#1b1e23", borderWidth: 2, pointRadius: 8, pointHoverRadius: 10 })),
    ] },
    options: { maintainAspectRatio: false,
      onClick: (_e, els, ch) => { if (els[0]) location.hash = `#/sub/${ch.data.datasets[els[0].datasetIndex].data[els[0].index].chave}`; },
      onHover: (e, els) => (e.native.target.style.cursor = els.length ? "pointer" : "default"),
      scales: { x: eixoNota("Risco (Eixo I) →  maior é pior"), y: eixoNota("Oportunidade (Eixo II) →  maior é melhor") },
      plugins: { extras: { br }, legend: { labels: { usePointStyle: true } },
        tooltip: { callbacks: { label: (c) => `${c.raw.nome}: risco ${fmt(c.raw.x)} · oportunidade ${fmt(c.raw.y)} (clique para abrir)` } } } },
    plugins: [extras],
  });
}

const quebra = (t) => { const p = t.split(" "); return p.length > 1 ? [p.slice(0, Math.ceil(p.length / 2)).join(" "), p.slice(Math.ceil(p.length / 2)).join(" ")] : t; }; // rótulo em 2 linhas, sem inclinar
function barrasComparativas(id, eixo, series) {
  const ks = Object.keys(eixo).filter((k) => series.some((s) => Number.isFinite(s.r[k]))); // indicador sem dado não ocupa espaço
  novo(id, {
    type: "bar",
    data: { labels: ks.map((k) => quebra(eixo[k])), datasets: series.map((s) => s.ref
      ? { label: s.nome, data: ks.map((k) => s.r[k]), backgroundColor: "rgba(241,243,245,0.16)", borderColor: BRANCO, borderWidth: 1, borderRadius: 4, borderSkipped: "bottom", maxBarThickness: 48 }
      : { label: s.nome, data: ks.map((k) => s.r[k]), backgroundColor: s.cor, borderRadius: 4, borderSkipped: "bottom", maxBarThickness: 48 }) },
    options: { maintainAspectRatio: false, scales: { y: eixoNota("Nota (1 a 5)"), x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: false } } },
      plugins: { legend: { labels: { boxWidth: 12 } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.raw)}` } } } },
  });
}

function linhas(id, series, rotY, minmax = false) { // escala automática: variações pequenas não ficam achatadas em 1–5
  novo(id, {
    type: "line",
    data: { labels: estado.meses.map(mesCurto), datasets: series.map((s) => ({ label: s.nome, data: s.dados, borderColor: s.cor, backgroundColor: s.cor, borderWidth: 2,
      borderDash: s.ref ? [5, 4] : [], pointRadius: 0, pointHoverRadius: 5, tension: 0.25 })) },
    options: { maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
      scales: { y: minmax ? eixoNota(rotY) : { title: { display: true, text: rotY }, grid: { color: GRID } }, x: { grid: { display: false }, ticks: { maxRotation: 0 } } },
      plugins: { legend: { labels: { boxWidth: 12 } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.raw)}` } } } },
  });
}
const serieBrasil = (k) => estado.meses.map((m) => mediaDe(doMes(m), k));

// ---------------- telas ----------------
function telaGeral() {
  titulo("Visão geral");
  const br = brasil(), rs = doMes();
  const ini = brasil(estado.meses[0]);
  const vulneraveisBons = umPorUF(rs.filter((r) => r.vulnerabilidadeSocial >= 4).sort((a, b) => (b.vulnerabilidadeSocial - b.inadimplenciaReal) - (a.vulnerabilidadeSocial - a.inadimplenciaReal))).slice(0, 5);
  const oport = rs.slice().sort((a, b) => (b.oport - b.risco) - (a.oport - a.risco)).slice(0, 5);
  const riscos = top5Risco();
  const lista = (rows, val) => `<ul class="lista">${rows.map((r) => `<li>${linkSub(r)} <span>${r.regiao} · ${val(r)}</span></li>`).join("")}</ul>`;
  const btnComparar = (rows) => `<a class="btn" href="#/comparar?s=${rows.map((r) => r.chave).join(",")}">Comparar estas</a>`;
  tela(`
    <div class="kpis">
      ${kpi("Sub-regiões analisadas", rs.length, `${new Set(rs.map((r) => r.uf)).size} estados`)}
      ${kpi("Risco médio Brasil", fmt(br.risco), "Eixo I, de 1 a 5")}
      ${kpi("Oportunidade média Brasil", fmt(br.oport), "Eixo II, de 1 a 5")}
      ${kpi("Inadimplência média", fmt(br.inadimplenciaReal), `${sinal(br.inadimplenciaReal - ini.inadimplenciaReal)} desde ${mesTxt(estado.meses[0])}`)}
    </div>
    <div class="grade dupla">
      ${painel("mapa", "Risco × oportunidade de cada sub-região (clique num ponto para abrir)", true)}
      <article class="painel"><h2>Maior risco: a pior sub-região de cada estado</h2>${lista(riscos, (r) => `risco ${fmt(r.risco)}`)}<p>${btnComparar(riscos)}</p></article>
      <article class="painel"><h2>Vulneráveis que pagam bem (vulnerabilidade ≥ 4, menor inadimplência)</h2>${lista(vulneraveisBons, (r) => `vulnerab. ${fmt(r.vulnerabilidadeSocial)} · inad. ${fmt(r.inadimplenciaReal)}`)}<p>${btnComparar(vulneraveisBons)}</p></article>
      <article class="painel"><h2>Melhor equilíbrio: mais oportunidade com menos risco</h2>${lista(oport, (r) => `oport. ${fmt(r.oport)} · risco ${fmt(r.risco)}`)}<p>${btnComparar(oport)}</p></article>
      ${painel("reg", "Risco e oportunidade médios por região")}
    </div>`);
  mapa("mapa", []);
  const porReg = REGIOES.map((g) => ({ g, rs: rs.filter((r) => r.regiao === g) }));
  novo("reg", { type: "bar",
    data: { labels: REGIOES, datasets: [
      { label: "Risco", data: porReg.map((x) => mediaDe(x.rs, "risco")), backgroundColor: CORES[1], borderRadius: 4 },
      { label: "Oportunidade", data: porReg.map((x) => mediaDe(x.rs, "oport")), backgroundColor: CORES[0], borderRadius: 4 }] },
    options: { maintainAspectRatio: false, scales: { y: eixoNota("Nota (1 a 5)"), x: { grid: { display: false } } }, plugins: { legend: { labels: { boxWidth: 12 } } } } });
}

function telaLista(r) {
  titulo("Sub-regiões");
  const q = r.q, busca = q.get("q") || "", regiao = q.get("regiao") || "", ord = q.get("ord") || "risco", dir = q.get("dir") || "desc";
  const cols = { nome: "Sub-região", regiao: "Região", risco: "Risco", oport: "Oportunidade", inadimplenciaReal: "Inadimplência", vulnerabilidadeSocial: "Vulnerab. social", maturidadePix: "Maturidade Pix" };
  let rows = doMes().filter((x) => (!regiao || x.regiao === regiao) && (!busca || `${x.nome} ${x.uf} ${x.regiao}`.toLowerCase().includes(busca.toLowerCase())));
  rows.sort((a, b) => { const v = typeof a[ord] === "number" ? a[ord] - b[ord] : String(a[ord]).localeCompare(String(b[ord])); return dir === "asc" ? v : -v; });
  const hrefCom = (mud) => { const p = new URLSearchParams({ q: busca, regiao, ord, dir, ...mud }); return `#/subregioes?${p}`; };
  const sel = estado.selecao;
  tela(`
    <div class="ferramentas">
      <input type="search" id="busca" placeholder="Buscar (ex.: BA, 48, Nordeste)" value="${esc(busca)}">
      <label>Região <select id="f-reg"><option value="">Todas</option>${REGIOES.map((g) => `<option ${g === regiao ? "selected" : ""}>${g}</option>`).join("")}</select></label>
      <button id="btn-comparar" ${sel.size ? "" : "disabled"}>Comparar selecionadas (${sel.size}/${MAX_COMPARAR})</button>
      <span class="aviso" style="margin:0">${rows.length} sub-regiões · clique no cabeçalho para ordenar</span>
    </div>
    <div class="tabela"><table>
      <thead><tr><th></th>${Object.entries(cols).map(([k, n]) => `<th class="${k === "nome" || k === "regiao" ? "" : "num"}" data-k="${k}">${n}${k === ord ? (dir === "asc" ? " ▲" : " ▼") : ""}</th>`).join("")}<th class="num">Posição no risco</th></tr></thead>
      <tbody>${rows.map((x) => `<tr>
        <td><input type="checkbox" data-c="${x.chave}" ${sel.has(x.chave) ? "checked" : ""} ${!sel.has(x.chave) && sel.size >= MAX_COMPARAR ? "disabled" : ""} aria-label="Selecionar ${esc(x.nome)}"></td>
        <td>${linkSub(x)}</td><td>${x.regiao}</td>
        ${["risco", "oport", "inadimplenciaReal", "vulnerabilidadeSocial", "maturidadePix"].map((k) => `<td class="num">${fmt(x[k])}</td>`).join("")}
        <td class="num">${posicao(x, "risco")}º</td></tr>`).join("")}</tbody>
    </table></div>`);
  let t; $("busca").oninput = (e) => { clearTimeout(t); t = setTimeout(() => (location.hash = hrefCom({ q: e.target.value })), 300); };
  $("f-reg").onchange = (e) => (location.hash = hrefCom({ regiao: e.target.value }));
  document.querySelectorAll("th[data-k]").forEach((th) => (th.onclick = () => (location.hash = hrefCom({ ord: th.dataset.k, dir: th.dataset.k === ord && dir === "desc" ? "asc" : "desc" }))));
  document.querySelectorAll("input[data-c]").forEach((cb) => (cb.onchange = () => { cb.checked ? sel.add(cb.dataset.c) : sel.delete(cb.dataset.c); render(); }));
  $("btn-comparar").onclick = () => (location.hash = `#/comparar?s=${[...sel].join(",")}`);
  const b = $("busca"); if (busca) { b.focus(); b.setSelectionRange(busca.length, busca.length); }
}

function telaDetalhe(r) {
  const x = reg(r.arg);
  if (!x) { titulo("Sub-região"); return tela(`<p>Sub-região não encontrada. <a href="#/subregioes">Ver todas</a></p>`); }
  titulo(`Região de ${x.nome} · CEP ${x.sub_regiao}xxx-xxx · ${x.regiao}`);
  const br = brasil(), daUF = doMes().filter((y) => y.uf === x.uf);
  const uf = Object.fromEntries(Object.keys(INDICADORES).map((k) => [k, mediaDe(daUF, k)]));
  const s = serie(x.chave), d12 = s.at(-1).inadimplenciaReal - s[0].inadimplenciaReal;
  const total = doMes().length;
  tela(`
    <p class="aviso"><b>Inadimplência</b> e <b>crescimento da dívida vencida</b> são medidos na própria sub-região. Vulnerabilidade social e o Eixo II são do estado (${x.uf}) e se repetem nas ${daUF.length} sub-regiões dele. A fragilidade está sem dado: a API do SCR não envia risco D-H desde jan/2025.</p>
    <div class="ferramentas">
      <button id="add">${estado.selecao.has(x.chave) ? "Na comparação ✓" : "Adicionar à comparação"}</button>
      <a class="btn" href="#/comparar?s=${[...new Set([...estado.selecao, x.chave])].slice(0, MAX_COMPARAR).join(",")}">Abrir comparação</a>
      <a href="#/subregioes?regiao=${x.regiao}">Outras sub-regiões do ${x.regiao}</a>
    </div>
    <div class="kpis">
      ${kpi("Risco", fmt(x.risco), `${posicao(x, "risco")}º maior de ${total} · Brasil ${fmt(br.risco)}`)}
      ${kpi("Oportunidade", fmt(x.oport), `${posicao(x, "oport")}º maior de ${total} · Brasil ${fmt(br.oport)}`)}
      ${kpi("Inadimplência", fmt(x.inadimplenciaReal), `${sinal(d12)} em 12 meses · Brasil ${fmt(br.inadimplenciaReal)}`)}
      ${kpi("Vulnerabilidade social", fmt(x.vulnerabilidadeSocial), `estadual (${x.uf})`)}
    </div>
    <div class="grade dupla">
      ${painel("e1", `Indicadores de risco: ${esc(x.nome)} × estado × Brasil`)}
      ${painel("e2", `Indicadores de oportunidade: ${esc(x.nome)} × Brasil`)}
      ${painel("t", "Inadimplência nos últimos 12 meses")}
      ${painel("m", `Posição no risco × oportunidade entre as ${total} sub-regiões`)}
    </div>`);
  $("add").onclick = () => { if (estado.selecao.size < MAX_COMPARAR || estado.selecao.has(x.chave)) { estado.selecao.has(x.chave) ? estado.selecao.delete(x.chave) : estado.selecao.add(x.chave); render(); } };
  const C = { esta: CORES[0], uf: CORES[1] };
  barrasComparativas("e1", EIXO_I, [{ nome: x.nome, r: x, cor: C.esta }, { nome: `Média ${x.uf}`, r: uf, cor: C.uf }, { nome: "Média Brasil", r: br, ref: true }]);
  barrasComparativas("e2", EIXO_II, [{ nome: x.nome, r: x, cor: C.esta }, { nome: "Média Brasil", r: br, ref: true }]);
  const serieUF = estado.meses.map((m) => mediaDe(doMes(m).filter((y) => y.uf === x.uf), "inadimplenciaReal"));
  linhas("t", [{ nome: x.nome, dados: s.map((y) => y.inadimplenciaReal), cor: C.esta }, { nome: `Média ${x.uf}`, dados: serieUF, cor: C.uf }, { nome: "Média Brasil", dados: serieBrasil("inadimplenciaReal"), cor: BRANCO, ref: true }], "Inadimplência (nota)");
  mapa("m", [{ ...x, cor: C.esta }]);
}

function telaComparar(r) {
  titulo("Comparar sub-regiões");
  // ?s= presente (mesmo vazio) manda; sem ?s= (link do menu) usa a seleção atual ou, na primeira vez, o padrão
  const chaves = (r.q.has("s") ? (r.q.get("s") || "").split(",") : estado.selecao.size ? [...estado.selecao] : top5Risco().map((y) => y.chave))
    .filter((c) => reg(c)).slice(0, MAX_COMPARAR);
  estado.selecao = new Set(chaves);
  const vis = chaves.map((c) => reg(c)); vis.forEach((y) => cor(y.chave));
  const br = brasil();
  const ir = (cs) => (location.hash = `#/comparar?s=${cs.join(",")}`);
  const livres = doMes().filter((y) => !chaves.includes(y.chave)).sort((a, b) => a.nome.localeCompare(b.nome));
  const opcoes = livres.map((y) => `<option value="${esc(y.nome)}">${y.regiao}</option>`).join(""); // datalist: filtra enquanto digita
  tela(`
    <div class="ferramentas">
      <div class="selecao">${vis.map((y) => `<span><i class="chip" style="background:${cor(y.chave)}"></i>${linkSub(y)}<button data-rm="${y.chave}" aria-label="Remover ${esc(y.nome)}">×</button></span>`).join("")}</div>
      <label>Adicionar <input id="add" class="busca-add" list="op-add" autocomplete="off" placeholder="${chaves.length >= MAX_COMPARAR ? "máximo de 5" : "digite cidade ou UF"}" ${chaves.length >= MAX_COMPARAR ? "disabled" : ""}><datalist id="op-add">${opcoes}</datalist></label>
      <button id="padrao">Maior risco por estado</button>
      ${chaves.length ? `<button id="limpar">Limpar</button>` : ""}
    </div>
    ${chaves.length ? "" : `<p class="aviso">Nenhuma sub-região selecionada. Adicione pelo seletor acima, marque na lista de <a href="#/subregioes">Sub-regiões</a> ou use "Maior risco por estado".</p>`}
    <div class="kpis">${vis.map((y) => kpi(`<i class="chip" style="background:${cor(y.chave)}"></i>${esc(y.nome)} · ${y.regiao}`, fmt(y.risco), `risco ${sinal(y.risco - br.risco)} · oportunidade ${fmt(y.oport)} (${sinal(y.oport - br.oport)})`)).join("")}</div>
    <div class="grade dupla">
      ${painel("mapa", "Risco × oportunidade das selecionadas: a melhor aposta fica no canto superior esquerdo", true)}
      ${painel("risco", "Indicadores de risco de cada uma × média Brasil")}
      ${painel("pot", "Indicadores de oportunidade de cada uma × média Brasil")}
      ${painel("tend", "Inadimplência nos últimos 12 meses")}
      ${painel("paga", "Paga melhor do que a vulnerabilidade sugere? (vulnerabilidade − inadimplência)")}
    </div>`);
  document.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => ir(chaves.filter((c) => c !== b.dataset.rm))));
  $("add").oninput = (e) => { const y = livres.find((z) => z.nome === e.target.value); if (y) ir([...chaves, y.chave]); };
  $("padrao").onclick = () => ir(top5Risco().map((y) => y.chave));
  if ($("limpar")) $("limpar").onclick = () => ir([]);
  if (!vis.length) return document.querySelector(".kpis").remove(), document.querySelector(".grade").remove();

  mapa("mapa", vis);
  const comRef = (eixo) => [...vis.map((y) => ({ nome: y.nome, r: y, cor: cor(y.chave) })), { nome: "Média Brasil", r: br, ref: true }];
  barrasComparativas("risco", EIXO_I, comRef(EIXO_I));
  barrasComparativas("pot", EIXO_II, comRef(EIXO_II));
  linhas("tend", [...vis.map((y) => ({ nome: y.nome, dados: serie(y.chave).map((z) => z.inadimplenciaReal), cor: cor(y.chave) })), { nome: "Média Brasil", dados: serieBrasil("inadimplenciaReal"), cor: BRANCO, ref: true }], "Inadimplência (nota)");
  const v = vis.map((y) => ({ y, d: y.vulnerabilidadeSocial - y.inadimplenciaReal })).sort((a, b) => b.d - a.d);
  const lim = Math.ceil(Math.max(1, ...v.map((z) => Math.abs(z.d))) * 1.15); // eixo simétrico em torno do zero: mostra para que lado cada uma vai
  novo("paga", { type: "bar",
    data: { labels: v.map((z) => z.y.nome), datasets: [{ label: "Vulnerabilidade − inadimplência", data: v.map((z) => z.d), backgroundColor: v.map((z) => (z.d >= 0 ? CORES[0] : CORES[1])), borderRadius: 4, borderSkipped: false, maxBarThickness: 36 }] },
    options: { indexAxis: "y", maintainAspectRatio: false,
      scales: { x: { min: -lim, max: lim, title: { display: true, text: "← atrasa mais que o esperado  ·  paga melhor que o esperado →" }, grid: { color: (c) => (c.tick.value === 0 ? BRANCO : GRID) } }, y: { grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.raw >= 0 ? "Paga melhor" : "Atrasa mais"} que o esperado: ${fmt(c.raw)}` } } } } });
}

function telaIndicadores(r) {
  titulo("Indicadores");
  const k = INDICADORES[r.q.get("i")] ? r.q.get("i") : "inadimplenciaReal";
  const ordem = r.q.get("o") === "menores" ? "menores" : "maiores";
  const ruim = MAIOR_E_PIOR.has(k);
  const estadual = !PROPRIOS_DA_SUB.has(k);
  const ordenadas = doMes().filter((y) => Number.isFinite(y[k])).sort((a, b) => (ordem === "maiores" ? b[k] - a[k] : a[k] - b[k]));
  const rs = (estadual ? umPorUF(ordenadas).map((y) => ({ ...y, nome: `${y.uf} (estado)` })) : ordenadas).slice(0, 15);
  const ir = (mud) => (location.hash = `#/indicadores?${new URLSearchParams({ i: k, o: ordem, ...mud })}`);
  tela(`
    <div class="ferramentas">
      <label>Indicador <select id="ind">${Object.entries(INDICADORES).map(([c, n]) => `<option value="${c}" ${c === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      <label>Mostrar <select id="ord"><option value="maiores" ${ordem === "maiores" ? "selected" : ""}>15 maiores</option><option value="menores" ${ordem === "menores" ? "selected" : ""}>15 menores</option></select></label>
      <span class="aviso" style="margin:0">${ruim ? "Neste indicador, maior é pior." : "Neste indicador, maior é melhor."}${estadual ? " Indicador estadual: o ranking mostra um registro por estado." : ""}</span>
    </div>
    ${EXPLICA[k] ? `<p class="aviso">${EXPLICA[k]}</p>` : ""}
    ${rs.length ? "" : `<p class="aviso"><b>Sem dado em ${mesTxt(estado.mes)}.</b> Escolha outro indicador.</p>`}
    <div class="grade dupla" ${rs.length ? "" : 'style="display:none"'}>
      ${painel("rank", `${ordem === "maiores" ? "15 maiores" : "15 menores"}: ${INDICADORES[k]}`, true)}
      ${painel("reg", `${INDICADORES[k]}: média por região`)}
      ${painel("evo", `${INDICADORES[k]}: evolução por região em 12 meses`)}
    </div>`);
  $("ind").onchange = (e) => ir({ i: e.target.value });
  $("ord").onchange = (e) => ir({ o: e.target.value });
  if (!rs.length) return;
  const br = brasil()[k];
  novo("rank", { type: "bar",
    data: { labels: rs.map((y) => y.nome), datasets: [{ label: INDICADORES[k], data: rs.map((y) => y[k]), backgroundColor: ACENTO, borderRadius: 4, borderSkipped: false, chaves: rs.map((y) => y.chave) }] },
    options: { indexAxis: "y", maintainAspectRatio: false,
      onClick: (_e, els, ch) => { if (els[0]) location.hash = `#/sub/${ch.data.datasets[0].chaves[els[0].index]}`; },
      onHover: (e, els) => (e.native.target.style.cursor = els.length ? "pointer" : "default"),
      scales: { x: eixoNota("Nota (1 a 5)"), y: { grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${fmt(c.raw)} (Brasil ${fmt(br)}) · clique para abrir` } } } } });
  const porReg = REGIOES.map((g) => mediaDe(doMes().filter((y) => y.regiao === g), k));
  novo("reg", { type: "bar",
    data: { labels: REGIOES, datasets: [{ label: INDICADORES[k], data: porReg, backgroundColor: REGIOES.map((_, i) => CORES[i]), borderRadius: 4 }] },
    options: { maintainAspectRatio: false, scales: { y: eixoNota("Nota (1 a 5)"), x: { grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmt(c.raw) } } } } });
  linhas("evo", [...REGIOES.map((g, i) => ({ nome: g, dados: estado.meses.map((m) => mediaDe(doMes(m).filter((y) => y.regiao === g), k)), cor: CORES[i] })),
    { nome: "Brasil", dados: serieBrasil(k), cor: BRANCO, ref: true }], "Nota", false); // escala automática: as médias variam pouco e ficariam achatadas em 1–5
}
