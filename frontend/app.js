// Protótipo GJ00-43: software de análise navegável sobre mock_sub_regioes.json (formato de saída do notebook).
const EIXO_I = { inadimplenciaReal: "Inadimplência", fragilidadeRenda: "Fragilidade de renda", agingDivida: "Dívida antiga", vulnerabilidadeSocial: "Vulnerab. social" };
const EIXO_II = { maturidadePix: "Maturidade Pix", crescimentoPopulacional: "Crescimento pop.", totalHabitantes: "Habitantes", bonusDemografico: "Bônus demográfico" };
const INDICADORES = { risco: "Risco (média do Eixo I)", oport: "Oportunidade (média do Eixo II)", ...EIXO_I, ...EIXO_II };
const MAIOR_E_PIOR = new Set(["risco", ...Object.keys(EIXO_I)]);
const REGIOES = ["Nordeste", "Norte", "Centro-Oeste", "Sudeste", "Sul"];
const CORES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"]; // paleta dataviz (escuro), validada para 5 séries
const CINZA = "#5b616b", BRANCO = "#f1f3f5", TXT = "#b8bfc9", GRID = "#2a2f36", ACENTO = "#3fc7f2";
const MAX_COMPARAR = 5;

const fmt = (n) => (n == null || Number.isNaN(n) ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const sinal = (n) => `${n >= 0 ? "+" : "−"}${fmt(Math.abs(n))}`;
const mesTxt = (m) => new Date(+m.slice(0, 4), +m.slice(4) - 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
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
const PROPRIOS_DA_SUB = new Set(["inadimplenciaReal", "risco", "oport"]); // os demais indicadores são estaduais
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
const painel = (id, h, largo = false) => `<article class="painel${largo ? " largo" : ""}"><h2>${h}</h2><p class="conclusao" id="c-${id}"></p><div class="canvas"><canvas id="g-${id}"></canvas></div></article>`;
const conclui = (id, txt) => { const el = $("c-" + id); if (el) el.textContent = txt; };
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
function mapa(id, destaques, conclusao) {
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
  if (conclusao) conclui(id, conclusao);
}

function barrasComparativas(id, eixo, series) {
  const ks = Object.keys(eixo);
  novo(id, {
    type: "bar",
    data: { labels: Object.values(eixo), datasets: series.map((s) => s.ref
      ? { label: s.nome, data: ks.map((k) => s.r[k]), backgroundColor: "rgba(241,243,245,0.16)", borderColor: BRANCO, borderWidth: 1, borderRadius: 4, borderSkipped: "bottom" }
      : { label: s.nome, data: ks.map((k) => s.r[k]), backgroundColor: s.cor, borderRadius: 4, borderSkipped: "bottom" }) },
    options: { maintainAspectRatio: false, scales: { y: eixoNota("Nota (1 a 5)"), x: { grid: { display: false } } },
      plugins: { legend: { labels: { boxWidth: 12 } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.raw)}` } } } },
  });
}

function linhas(id, series, rotY, minmax = true) {
  novo(id, {
    type: "line",
    data: { labels: estado.meses.map(mesTxt), datasets: series.map((s) => ({ label: s.nome, data: s.dados, borderColor: s.cor, backgroundColor: s.cor, borderWidth: 2,
      borderDash: s.ref ? [5, 4] : [], pointRadius: 0, pointHoverRadius: 5, tension: 0.25 })) },
    options: { maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
      scales: { y: minmax ? eixoNota(rotY) : { title: { display: true, text: rotY }, grid: { color: GRID } }, x: { grid: { display: false } } },
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
    <div class="grade">
      ${painel("mapa", "Onde estão o risco e a oportunidade?", true)}
      <article class="painel"><h2>Maior risco (1 por estado)</h2>${lista(riscos, (r) => `risco ${fmt(r.risco)}`)}<p>${btnComparar(riscos)}</p></article>
      <article class="painel"><h2>Vulneráveis que pagam bem</h2><p class="conclusao">Vulnerabilidade social alta (≥ 4) e inadimplência mais baixa: o público-alvo.</p>${lista(vulneraveisBons, (r) => `vulnerab. ${fmt(r.vulnerabilidadeSocial)} · inad. ${fmt(r.inadimplenciaReal)}`)}<p>${btnComparar(vulneraveisBons)}</p></article>
      <article class="painel"><h2>Melhor equilíbrio risco × oportunidade</h2>${lista(oport, (r) => `oport. ${fmt(r.oport)} · risco ${fmt(r.risco)}`)}<p>${btnComparar(oport)}</p></article>
      <article class="painel"><h2>Média por região</h2><p class="conclusao" id="c-reg"></p><div class="canvas"><canvas id="g-reg"></canvas></div></article>
    </div>`);
  mapa("mapa", [], `${rs.filter((r) => r.risco < br.risco && r.oport > br.oport).length} das ${rs.length} sub-regiões estão no quadrante de menor risco e maior oportunidade. Clique num ponto para abrir a sub-região.`);
  const porReg = REGIOES.map((g) => ({ g, rs: rs.filter((r) => r.regiao === g) }));
  novo("reg", { type: "bar",
    data: { labels: REGIOES, datasets: [
      { label: "Risco", data: porReg.map((x) => mediaDe(x.rs, "risco")), backgroundColor: CORES[1], borderRadius: 4 },
      { label: "Oportunidade", data: porReg.map((x) => mediaDe(x.rs, "oport")), backgroundColor: CORES[0], borderRadius: 4 }] },
    options: { maintainAspectRatio: false, scales: { y: eixoNota("Nota (1 a 5)"), x: { grid: { display: false } } }, plugins: { legend: { labels: { boxWidth: 12 } } } } });
  const pior = porReg.slice().sort((a, b) => mediaDe(b.rs, "risco") - mediaDe(a.rs, "risco"))[0];
  conclui("reg", `${pior.g} tem o maior risco médio (${fmt(mediaDe(pior.rs, "risco"))}).`);
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
    <p class="aviso">Só a <b>inadimplência</b> é medida na própria sub-região. Os demais indicadores são do estado (${x.uf}) e se repetem nas ${daUF.length} sub-regiões dele.</p>
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
    <div class="grade">
      ${painel("e1", "Risco: onde está acima da média?")}
      ${painel("e2", "Potencial de mercado")}
      ${painel("t", "Inadimplência em 12 meses")}
      ${painel("m", `Posição entre as ${total} sub-regiões`)}
    </div>`);
  $("add").onclick = () => { if (estado.selecao.size < MAX_COMPARAR || estado.selecao.has(x.chave)) { estado.selecao.has(x.chave) ? estado.selecao.delete(x.chave) : estado.selecao.add(x.chave); render(); } };
  const C = { esta: CORES[0], uf: CORES[1] };
  barrasComparativas("e1", EIXO_I, [{ nome: x.nome, r: x, cor: C.esta }, { nome: `Média ${x.uf}`, r: uf, cor: C.uf }, { nome: "Média Brasil", r: br, ref: true }]);
  barrasComparativas("e2", EIXO_II, [{ nome: x.nome, r: x, cor: C.esta }, { nome: "Média Brasil", r: br, ref: true }]);
  const acima = Object.keys(EIXO_I).filter((k) => x[k] > br[k]).map((k) => EIXO_I[k].toLowerCase());
  conclui("e1", acima.length ? `Acima da média Brasil em: ${acima.join(", ")}.` : "Abaixo da média Brasil em todos os indicadores de risco.");
  conclui("e2", `Oportunidade ${fmt(x.oport)} contra ${fmt(br.oport)} do Brasil (${x.oport >= br.oport ? "acima" : "abaixo"} da média).`);
  const serieUF = estado.meses.map((m) => mediaDe(doMes(m).filter((y) => y.uf === x.uf), "inadimplenciaReal"));
  linhas("t", [{ nome: x.nome, dados: s.map((y) => y.inadimplenciaReal), cor: C.esta }, { nome: `Média ${x.uf}`, dados: serieUF, cor: C.uf }, { nome: "Média Brasil", dados: serieBrasil("inadimplenciaReal"), cor: BRANCO, ref: true }], "Inadimplência (nota)");
  conclui("t", d12 < 0 ? `Melhorou ${fmt(-d12)} pontos em 12 meses.` : d12 > 0 ? `Piorou ${fmt(d12)} pontos em 12 meses.` : "Estável em 12 meses.");
  mapa("m", [{ ...x, cor: C.esta }], "Clique em outro ponto para navegar.");
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
  const opcoes = REGIOES.map((g) => `<optgroup label="${g}">${doMes().filter((y) => y.regiao === g && !chaves.includes(y.chave)).sort((a, b) => a.nome.localeCompare(b.nome)).map((y) => `<option value="${y.chave}">${esc(y.nome)}</option>`).join("")}</optgroup>`).join("");
  tela(`
    <div class="ferramentas">
      <div class="selecao">${vis.map((y) => `<span><i class="chip" style="background:${cor(y.chave)}"></i>${linkSub(y)}<button data-rm="${y.chave}" aria-label="Remover ${esc(y.nome)}">×</button></span>`).join("")}</div>
      <label>Adicionar <select id="add" ${chaves.length >= MAX_COMPARAR ? "disabled" : ""}><option value="">${chaves.length >= MAX_COMPARAR ? "máximo de 5" : "escolha…"}</option>${opcoes}</select></label>
      <button id="padrao">Maior risco por estado</button>
      ${chaves.length ? `<button id="limpar">Limpar</button>` : ""}
    </div>
    ${chaves.length ? "" : `<p class="aviso">Nenhuma sub-região selecionada. Adicione pelo seletor acima, marque na lista de <a href="#/subregioes">Sub-regiões</a> ou use "Maior risco por estado".</p>`}
    <div class="kpis">${vis.map((y) => kpi(`<i class="chip" style="background:${cor(y.chave)}"></i>${esc(y.nome)} · ${y.regiao}`, fmt(y.risco), `risco ${sinal(y.risco - br.risco)} · oportunidade ${fmt(y.oport)} (${sinal(y.oport - br.oport)})`)).join("")}</div>
    <div class="grade">
      ${painel("mapa", "Qual é a melhor aposta?", true)}
      ${painel("risco", "O que puxa o risco de cada uma?")}
      ${painel("pot", "Onde há base para crescer?")}
      ${painel("tend", "Quem está melhorando na inadimplência?")}
      ${painel("paga", "Quem paga melhor do que a vulnerabilidade sugere?")}
    </div>`);
  document.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => ir(chaves.filter((c) => c !== b.dataset.rm))));
  $("add").onchange = (e) => e.target.value && ir([...chaves, e.target.value]);
  $("padrao").onclick = () => ir(top5Risco().map((y) => y.chave));
  if ($("limpar")) $("limpar").onclick = () => ir([]);
  if (!vis.length) return document.querySelector(".kpis").remove(), document.querySelector(".grade").remove();

  const melhor = vis.slice().sort((a, b) => (b.oport - b.risco) - (a.oport - a.risco))[0];
  mapa("mapa", vis, `Entre as ${vis.length}, ${melhor.nome} tem o melhor equilíbrio: risco ${fmt(melhor.risco)} e oportunidade ${fmt(melhor.oport)} (Brasil: ${fmt(br.risco)} e ${fmt(br.oport)}).`);
  const comRef = (eixo) => [...vis.map((y) => ({ nome: y.nome, r: y, cor: cor(y.chave) })), { nome: "Média Brasil", r: br, ref: true }];
  barrasComparativas("risco", EIXO_I, comRef(EIXO_I));
  const cont = {}; vis.forEach((y) => { const k = Object.keys(EIXO_I).sort((a, b) => (y[b] - br[b]) - (y[a] - br[a]))[0]; cont[k] = (cont[k] || 0) + 1; });
  const [kMax, n] = Object.entries(cont).sort((a, b) => b[1] - a[1])[0];
  conclui("risco", `O fator que mais afasta ${n} das ${vis.length} da média Brasil é ${EIXO_I[kMax].toLowerCase()}.`);
  barrasComparativas("pot", EIXO_II, comRef(EIXO_II));
  const pot = vis.slice().sort((a, b) => b.oport - a.oport)[0];
  conclui("pot", `${pot.nome} tem o maior potencial entre as ${vis.length} (${fmt(pot.oport)} contra ${fmt(br.oport)} do Brasil).`);
  linhas("tend", [...vis.map((y) => ({ nome: y.nome, dados: serie(y.chave).map((z) => z.inadimplenciaReal), cor: cor(y.chave) })), { nome: "Média Brasil", dados: serieBrasil("inadimplenciaReal"), cor: BRANCO, ref: true }], "Inadimplência (nota)");
  const delta = vis.map((y) => { const s = serie(y.chave); return { y, d: s.at(-1).inadimplenciaReal - s[0].inadimplenciaReal }; }).sort((a, b) => a.d - b.d);
  conclui("tend", delta[0].d < 0 ? `${delta[0].y.nome} foi a que mais melhorou em 12 meses (${fmt(delta[0].d)}).` : "Nenhuma melhorou a inadimplência em 12 meses.");
  const v = vis.map((y) => ({ y, d: y.vulnerabilidadeSocial - y.inadimplenciaReal })).sort((a, b) => b.d - a.d);
  novo("paga", { type: "bar",
    data: { labels: v.map((z) => z.y.nome), datasets: [{ label: "Vulnerabilidade − inadimplência", data: v.map((z) => z.d), backgroundColor: v.map((z) => (z.d >= 0 ? CORES[0] : CORES[1])), borderRadius: 4, borderSkipped: false }] },
    options: { indexAxis: "y", maintainAspectRatio: false,
      scales: { x: { title: { display: true, text: "← atrasa mais que o esperado  ·  paga melhor que o esperado →" }, grid: { color: GRID } }, y: { grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.raw >= 0 ? "Paga melhor" : "Atrasa mais"} que o esperado: ${fmt(c.raw)}` } } } } });
  conclui("paga", v[0].d > 0 ? `${v[0].y.nome} é vulnerável, mas paga melhor do que isso sugere.` : "Todas atrasam tanto quanto ou mais do que a vulnerabilidade sugere.");
}

function telaIndicadores(r) {
  titulo("Indicadores");
  const k = INDICADORES[r.q.get("i")] ? r.q.get("i") : "inadimplenciaReal";
  const ordem = r.q.get("o") === "menores" ? "menores" : "maiores";
  const ruim = MAIOR_E_PIOR.has(k);
  const estadual = !PROPRIOS_DA_SUB.has(k);
  const ordenadas = doMes().slice().sort((a, b) => (ordem === "maiores" ? b[k] - a[k] : a[k] - b[k]));
  const rs = (estadual ? umPorUF(ordenadas).map((y) => ({ ...y, nome: `${y.uf} (estado)` })) : ordenadas).slice(0, 15);
  const ir = (mud) => (location.hash = `#/indicadores?${new URLSearchParams({ i: k, o: ordem, ...mud })}`);
  tela(`
    <div class="ferramentas">
      <label>Indicador <select id="ind">${Object.entries(INDICADORES).map(([c, n]) => `<option value="${c}" ${c === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      <label>Mostrar <select id="ord"><option value="maiores" ${ordem === "maiores" ? "selected" : ""}>15 maiores</option><option value="menores" ${ordem === "menores" ? "selected" : ""}>15 menores</option></select></label>
      <span class="aviso" style="margin:0">${ruim ? "Neste indicador, maior é pior." : "Neste indicador, maior é melhor."}${estadual ? " Indicador estadual: o ranking mostra um registro por estado." : ""}</span>
    </div>
    <div class="grade">
      ${painel("rank", `${ordem === "maiores" ? "15 maiores" : "15 menores"}: ${INDICADORES[k]}`, true)}
      ${painel("reg", "Média por região")}
      ${painel("evo", "Evolução por região em 12 meses")}
    </div>`);
  $("ind").onchange = (e) => ir({ i: e.target.value });
  $("ord").onchange = (e) => ir({ o: e.target.value });
  const br = brasil()[k];
  novo("rank", { type: "bar",
    data: { labels: rs.map((y) => y.nome), datasets: [{ label: INDICADORES[k], data: rs.map((y) => y[k]), backgroundColor: ACENTO, borderRadius: 4, borderSkipped: false, chaves: rs.map((y) => y.chave) }] },
    options: { indexAxis: "y", maintainAspectRatio: false,
      onClick: (_e, els, ch) => { if (els[0]) location.hash = `#/sub/${ch.data.datasets[0].chaves[els[0].index]}`; },
      onHover: (e, els) => (e.native.target.style.cursor = els.length ? "pointer" : "default"),
      scales: { x: eixoNota("Nota (1 a 5)"), y: { grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${fmt(c.raw)} (Brasil ${fmt(br)}) · clique para abrir` } } } } });
  conclui("rank", `${rs[0].nome} (${rs[0].regiao}) lidera com ${fmt(rs[0][k])}; a média Brasil é ${fmt(br)}. ${rs.filter((y) => y.regiao === rs[0].regiao).length} das 15 são do ${rs[0].regiao}.`);
  const porReg = REGIOES.map((g) => mediaDe(doMes().filter((y) => y.regiao === g), k));
  novo("reg", { type: "bar",
    data: { labels: REGIOES, datasets: [{ label: INDICADORES[k], data: porReg, backgroundColor: REGIOES.map((_, i) => CORES[i]), borderRadius: 4 }] },
    options: { maintainAspectRatio: false, scales: { y: eixoNota("Nota (1 a 5)"), x: { grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmt(c.raw) } } } } });
  const iPior = porReg.indexOf(ruim ? Math.max(...porReg) : Math.min(...porReg));
  conclui("reg", `${REGIOES[iPior]} tem a situação ${ruim ? "mais arriscada" : "mais fraca"} neste indicador (${fmt(porReg[iPior])}).`);
  linhas("evo", [...REGIOES.map((g, i) => ({ nome: g, dados: estado.meses.map((m) => mediaDe(doMes(m).filter((y) => y.regiao === g), k)), cor: CORES[i] })),
    { nome: "Brasil", dados: serieBrasil(k), cor: BRANCO, ref: true }], "Nota (1 a 5)");
  conclui("evo", "Médias mensais das sub-regiões de cada região.");
}
