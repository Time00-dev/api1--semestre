// Software de análise navegável. Os dados vêm da API Flask (GET /api/sub-regioes, backend/app.py), que lê o banco
// no formato do frontend/dados/mock_sub_regioes.json (o contrato). Abrir pelo Flask: flask --app backend/app run
// Nota 0 = "sem dado". Score, faixa e ranking são calculados no notebook (GJ00-58/60), não aqui.
const API_DADOS = "api/sub-regioes"; // relativo, como app.js e style.css
const MESES_GRAFICO = 12; // gráficos de evolução: os 12 meses que terminam no mês escolhido
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
const sinal = (n) => (Number.isFinite(n) ? `${n >= 0 ? "+" : "−"}${fmt(Math.abs(n))}` : "sem dado");
const diferenca = (a, b) => (Number.isFinite(a) && Number.isFinite(b) ? a - b : NaN); // null - 3 daria −3: sem dado não entra na conta
const mesTxt = (m) => new Date(+m.slice(0, 4), +m.slice(4) - 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
const mesCurto = (m) => `${new Date(+m.slice(0, 4), +m.slice(4) - 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}/${m.slice(2, 4)}`;
const media = (xs) => { const v = xs.filter(Number.isFinite); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN; }; // ignora "sem dado"
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

Chart.defaults.color = TXT;
Chart.defaults.font.family = "Inter, Arial, sans-serif";
Chart.defaults.borderColor = GRID;

const estado = { dados: [], meses: [], mes: null, porMes: new Map(), selecao: new Set() };
let graficos = [];
const corDe = new Map(); // cor fixa por sub-região: segue a entidade, não a posição
const cor = (k) => { if (!corDe.has(k)) corDe.set(k, CORES[corDe.size % CORES.length]); return corDe.get(k); };

// ---------------- dados & estados de carregamento/erro ----------------
const telaEl = $("tela");
if (telaEl) {
  telaEl.innerHTML = `<p class="aviso" style="padding: 20px; text-align: center;">Carregando dados do painel...</p>`;
}

fetch(API_DADOS)
  .then((r) => {
    // a API explica o problema em {erro: "..."}; sem isso, mostra só o código
    if (!r.ok) return r.json().catch(() => ({})).then((j) => { throw new Error(j.erro || `a API respondeu ${r.status}`); });
    return r.json();
  })
  .then((json) => {
    if (!json.eixo_i?.length) {
      titulo("Nenhum dado carregado");
      tela(`<p class="aviso" role="status" style="padding: 20px;">O banco ainda não tem resultados. Carregue com a célula
        "Enviar resultados para o banco" do notebook ou com <code>python backend/carga.py arquivo.json</code>.</p>`);
      return;
    }
    // o nome da sub-região não depende do mês: usa o primeiro que aparecer para o par UF + sub-região
    const nomes = new Map();
    for (const r of json.eixo_i) if (r.nome_sub_regiao && !nomes.has(`${r.uf}-${r.sub_regiao}`)) nomes.set(`${r.uf}-${r.sub_regiao}`, r.nome_sub_regiao);
    const reg = new Map();
    for (const r of [...json.eixo_i, ...(json.eixo_ii || [])]) {
      const chave = `${r.uf}-${r.sub_regiao}`, id = `${r.ano_mes}|${chave}`;
      reg.set(id, { ...(reg.get(id) || {}), ...r, chave, nome: nomes.get(chave) || `${r.uf} · CEP ${r.sub_regiao}` });
    }
    for (const r of reg.values()) for (const k of [...Object.keys(EIXO_I), ...Object.keys(EIXO_II)]) if (r[k] === 0) r[k] = null;
    estado.dados = [...reg.values()].map((r) => ({ ...r, risco: media(Object.keys(EIXO_I).map((k) => r[k])), oport: media(Object.keys(EIXO_II).map((k) => r[k])) }));
    for (const r of estado.dados) (estado.porMes.get(r.ano_mes) || estado.porMes.set(r.ano_mes, []).get(r.ano_mes)).push(r);
    estado.meses = [...estado.porMes.keys()].sort();
    estado.mes = estado.meses.at(-1);
    const sel = $("f-periodo");
    sel.innerHTML = estado.meses.map((m) => `<option value="${m}">${mesTxt(m)}</option>`).join("");
    sel.value = estado.mes;
    sel.onchange = () => { estado.mes = sel.value; render(); };
    window.addEventListener("hashchange", render);
    render();
  })
  .catch((err) => {
    $("titulo").textContent = "Dados indisponíveis";
    if (telaEl) {
      telaEl.innerHTML = `<p class="aviso" role="alert" style="color: #ff8a6a; padding: 20px;"><b>Erro de consulta:</b> Não foi possível carregar os dados (${esc(err.message)}). Verifique se o Flask está ligado e se o banco está disponível.</p>`;
    }
  });
const doMes = (mes = estado.mes) => estado.porMes.get(mes) || [];
const reg = (chave, mes = estado.mes) => doMes(mes).find((r) => r.chave === chave);
// meses dos gráficos de evolução: até 12, terminando no mês escolhido no seletor
const janela = () => { const i = estado.meses.indexOf(estado.mes); return estado.meses.slice(Math.max(0, i - MESES_GRAFICO + 1), i + 1); };
const serie = (chave) => janela().map((m) => reg(chave, m)); // um item por mês da janela (undefined se faltar o mês)
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

function exemplosVariados() {
  const restantes = doMes().filter((r) => Number.isFinite(r.risco) && Number.isFinite(r.oport));
  const centro = brasil();
  const escolhidos = [];
  const distancia = (a, b) => Math.hypot(a.risco - b.risco, a.oport - b.oport);

  while (escolhidos.length < 4 && restantes.length) {
    const referencias = escolhidos.length ? escolhidos : [centro];
    const menorDistancia = (r) => Math.min(...referencias.map((ref) => distancia(r, ref)));
    restantes.sort((a, b) => menorDistancia(b) - menorDistancia(a));
    if (escolhidos.length && menorDistancia(restantes[0]) < 0.4) break;
    escolhidos.push(restantes.shift());
  }
  return escolhidos.map((r) => r.chave);
}

// rótulos dos pontos em destaque + linhas da média Brasil + quadrante
const extras = {
  id: "extras",
  afterDraw(ch, _a, o) {
    const { ctx, chartArea: ca, scales: { x, y } } = ch;
    ctx.save();
    const ocupadas = [];
    if (o.br) {
      ctx.setLineDash([5, 4]); ctx.strokeStyle = BRANCO; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
      const bx = x.getPixelForValue(o.br.risco), by = y.getPixelForValue(o.br.oport);
      ctx.beginPath(); ctx.moveTo(bx, ca.top); ctx.lineTo(bx, ca.bottom); ctx.moveTo(ca.left, by); ctx.lineTo(ca.right, by); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      const quadrante = "↖ menor risco, maior oportunidade";
      ctx.fillStyle = ACENTO; ctx.font = "600 12px Inter";
      ctx.fillText(quadrante, ca.left + 8, ca.top + 16);
      ocupadas.push({ x: ca.left + 4, y: ca.top + 2, largura: ctx.measureText(quadrante).width + 8, altura: 18 });

      const media = "média Brasil";
      ctx.fillStyle = TXT; ctx.font = "12px Inter";
      const larguraMedia = ctx.measureText(media).width;
      const xMedia = Math.min(bx + 4, ca.right - larguraMedia - 4);
      ctx.fillText(media, xMedia, ca.bottom - 6);
      ocupadas.push({ x: xMedia - 4, y: ca.bottom - 20, largura: larguraMedia + 8, altura: 18 });
    }

    const pontos = ch.data.datasets
      .map((ds, i) => ({ ds, p: ch.getDatasetMeta(i).data[0], visivel: ch.isDatasetVisible(i) }))
      .filter(({ ds, p, visivel }) => ds.rotulo && visivel && p && !p.skip);
    for (const { p } of pontos) {
      ocupadas.push({ x: p.x - 9, y: p.y - 9, largura: 18, altura: 18 });
    }

    ctx.fillStyle = BRANCO;
    ctx.font = "600 12px Inter";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (const { ds, p } of pontos) {
      const largura = Math.ceil(ctx.measureText(ds.rotulo).width) + 8;
      const altura = 16;
      const posicoes = [
        [p.x + 10, p.y - altura / 2], [p.x - largura - 10, p.y - altura / 2],
        [p.x - largura / 2, p.y - altura - 10], [p.x - largura / 2, p.y + 10],
      ];
      const caixa = posicoes.map(([x, y]) => ({ x, y, largura, altura })).find((c) =>
        c.x >= ca.left && c.x + c.largura <= ca.right && c.y >= ca.top && c.y + c.altura <= ca.bottom
        && ocupadas.every((o) => c.x + c.largura <= o.x || o.x + o.largura <= c.x
          || c.y + c.altura <= o.y || o.y + o.altura <= c.y));
      if (!caixa) continue;
      ocupadas.push(caixa);
      ctx.fillText(ds.rotulo, caixa.x + 4, caixa.y + altura / 2);
    }
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
    data: { labels: janela().map(mesCurto), datasets: series.map((s) => ({ label: s.nome, data: s.dados, borderColor: s.cor, backgroundColor: s.cor, borderWidth: 2,
      borderDash: s.ref ? [5, 4] : [], pointRadius: 0, pointHoverRadius: 5, tension: 0.25 })) },
    options: { maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
      scales: { y: minmax ? eixoNota(rotY) : { title: { display: true, text: rotY }, grid: { color: GRID } }, x: { grid: { display: false }, ticks: { maxRotation: 0 } } },
      plugins: { legend: { labels: { boxWidth: 12 } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.raw)}` } } } },
  });
}
const serieBrasil = (k) => janela().map((m) => mediaDe(doMes(m), k));

// ---------------- telas ----------------
function telaGeral() {
  titulo("Visão geral");
  const br = brasil(), rs = doMes();
  const inicio = janela()[0], ini = brasil(inicio);
  const vulneraveisBons = umPorUF(rs.filter((r) => r.vulnerabilidadeSocial >= 4).sort((a, b) => (b.vulnerabilidadeSocial - b.inadimplenciaReal) - (a.vulnerabilidadeSocial - a.inadimplenciaReal))).slice(0, 5);
  // GJ00-63: o score e o ranking vêm da API (calculados no notebook); antes o site ordenava por oportunidade − risco
  const melhores = rs.filter((r) => r.ranking != null).sort((a, b) => a.ranking - b.ranking).slice(0, 5);
  const riscos = top5Risco();
  const lista = (rows, val) => `<ul class="lista">${rows.map((r) => `<li>${linkSub(r)} <span>${r.regiao} · ${val(r)}</span></li>`).join("")}</ul>`;
  const btnComparar = (rows) => `<a class="btn" href="#/comparar?s=${rows.map((r) => r.chave).join(",")}">Comparar estas</a>`;
  tela(`
    <div class="kpis">
      ${kpi("Sub-regiões analisadas", rs.length, `${new Set(rs.map((r) => r.uf)).size} estados`)}
      ${kpi("Risco médio Brasil", fmt(br.risco), "Eixo I, de 1 a 5")}
      ${kpi("Oportunidade média Brasil", fmt(br.oport), "Eixo II, de 1 a 5")}
      ${kpi("Inadimplência média", fmt(br.inadimplenciaReal), `${sinal(diferenca(br.inadimplenciaReal, ini.inadimplenciaReal))} desde ${mesTxt(inicio)}`)}
    </div>
    <div class="grade dupla">
      ${painel("mapa", "Risco × oportunidade de cada sub-região (clique num ponto para abrir)", true)}
      <article class="painel"><h2>Maior risco: a pior sub-região de cada estado</h2>${lista(riscos, (r) => `risco ${fmt(r.risco)}`)}<p>${btnComparar(riscos)}</p></article>
      <article class="painel"><h2>Vulneráveis que pagam bem (vulnerabilidade ≥ 4, menor inadimplência)</h2>${lista(vulneraveisBons, (r) => `vulnerab. ${fmt(r.vulnerabilidadeSocial)} · inad. ${fmt(r.inadimplenciaReal)}`)}<p>${btnComparar(vulneraveisBons)}</p></article>
      <article class="painel"><h2>Maiores scores de oportunidade</h2>${melhores.length
        ? `${lista(melhores, (r) => `${r.ranking}º · score ${fmt(r.score)} · ${esc(r.faixa ?? "sem faixa")}`)}<p>${btnComparar(melhores)}</p>`
        : `<p class="aviso">Score ainda não calculado para este mês.</p>`}</article>
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
  const s = serie(x.chave), d12 = diferenca(s.at(-1)?.inadimplenciaReal, s[0]?.inadimplenciaReal);
  const total = doMes().length;
  tela(`
    <p class="aviso"><b>Nota:</b> Indicadores de <b>inadimplência</b> e <b>crescimento da dívida</b> são calculados na própria sub-região. Indicadores de vulnerabilidade social e do Eixo II são dados consolidados a nível de <b>UF (${x.uf})</b> e se repetem nas ${daUF.length} sub-regiões do estado (amostra estadual). A fragilidade está sem dado a partir de jan/2025.</p>
    <div class="ferramentas">
      <button id="add">${estado.selecao.has(x.chave) ? "Na comparação ✓" : "Adicionar à comparação"}</button>
      <a class="btn" href="#/comparar?s=${[...new Set([...estado.selecao, x.chave])].slice(0, MAX_COMPARAR).join(",")}">Abrir comparação</a>
      <a href="#/subregioes?regiao=${x.regiao}">Outras sub-regiões do ${x.regiao}</a>
    </div>
    <div class="kpis">
      ${kpi("Risco", fmt(x.risco), `${posicao(x, "risco")}º maior de ${total} · Brasil ${fmt(br.risco)}`)} ${kpi("Oportunidade", fmt(x.oport), `${posicao(x, "oport")}º maior de ${total} · Brasil ${fmt(br.oport)}`)} ${kpi("Inadimplência", fmt(x.inadimplenciaReal), `${sinal(d12)} desde ${mesTxt(janela()[0])} · Brasil ${fmt(br.inadimplenciaReal)}`)} ${kpi("Vulnerabilidade social", fmt(x.vulnerabilidadeSocial), `estadual (${x.uf})`)}
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
  const serieUF = janela().map((m) => mediaDe(doMes(m).filter((y) => y.uf === x.uf), "inadimplenciaReal"));
  linhas("t", [{ nome: x.nome, dados: s.map((y) => y?.inadimplenciaReal ?? null), cor: C.esta }, { nome: `Média ${x.uf}`, dados: serieUF, cor: C.uf }, { nome: "Média Brasil", dados: serieBrasil("inadimplenciaReal"), cor: BRANCO, ref: true }], "Inadimplência (nota)");
  mapa("m", [{ ...x, cor: C.esta }]);
}
function telaComparar(r) {
  titulo("Comparar sub-regiões");
  // Links e escolhas manuais têm prioridade sobre os exemplos do período.
  const chaves = (r.q.has("s") ? r.q.get("s").split(",") : estado.selecao.size ? [...estado.selecao] : exemplosVariados())
    .filter((c) => reg(c)).slice(0, MAX_COMPARAR);
  if (r.q.has("s")) estado.selecao = new Set(chaves);
  const vis = chaves.map((c) => reg(c)); vis.forEach((y) => cor(y.chave));
  const br = brasil();
  const ir = (cs) => (location.hash = `#/comparar?s=${cs.join(",")}`);
  const livres = doMes().filter((y) => !chaves.includes(y.chave)).sort((a, b) => a.nome.localeCompare(b.nome));
  const opcoes = livres.map((y) => `<option value="${esc(y.nome)}">${y.regiao}</option>`).join(""); // datalist: filtra enquanto digita
  tela(`
    <div class="ferramentas">
      <div class="selecao">${vis.map((y) => `<span><i class="chip" style="background:${cor(y.chave)}"></i>${linkSub(y)}<button data-rm="${y.chave}" aria-label="Remover ${esc(y.nome)}">×</button></span>`).join("")}</div>
      <label>Adicionar <input id="add" class="busca-add" list="op-add" autocomplete="off" placeholder="${chaves.length >= MAX_COMPARAR ? "máximo de 5" : "digite cidade ou UF"}" ${chaves.length >= MAX_COMPARAR ? "disabled" : ""}><datalist id="op-add">${opcoes}</datalist></label>
      <button id="exemplos">Exemplos variados</button>
      <button id="padrao">Maior risco por estado</button>
      ${chaves.length ? `<button id="limpar">Limpar</button>` : ""}
    </div>
    ${chaves.length ? "" : `<p class="aviso">Nenhuma sub-região selecionada. Adicione pelo seletor acima, marque na lista de <a href="#/subregioes">Sub-regiões</a> ou use "Exemplos variados".</p>`}
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
  $("exemplos").onclick = () => ir(exemplosVariados());
  $("padrao").onclick = () => ir(top5Risco().map((y) => y.chave));
  if ($("limpar")) $("limpar").onclick = () => ir([]);
  if (!vis.length) return document.querySelector(".kpis").remove(), document.querySelector(".grade").remove();

  mapa("mapa", vis);
  const comRef = (eixo) => [...vis.map((y) => ({ nome: y.nome, r: y, cor: cor(y.chave) })), { nome: "Média Brasil", r: br, ref: true }];
  barrasComparativas("risco", EIXO_I, comRef(EIXO_I));
  barrasComparativas("pot", EIXO_II, comRef(EIXO_II));
  linhas("tend", [...vis.map((y) => ({ nome: y.nome, dados: serie(y.chave).map((z) => z?.inadimplenciaReal ?? null), cor: cor(y.chave) })), { nome: "Média Brasil", dados: serieBrasil("inadimplenciaReal"), cor: BRANCO, ref: true }], "Inadimplência (nota)");
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
  linhas("evo", [...REGIOES.map((g, i) => ({ nome: g, dados: janela().map((m) => mediaDe(doMes(m).filter((y) => y.regiao === g), k)), cor: CORES[i] })),
    { nome: "Brasil", dados: serieBrasil(k), cor: BRANCO, ref: true }], "Nota", false); // escala automática: as médias variam pouco e ficariam achatadas em 1–5
}
