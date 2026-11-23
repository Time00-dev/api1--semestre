"""GJ00-61 / GJ00-62: API Flask que lê os resultados do MariaDB/MySQL com filtros e entrega ao site.

A resposta tem o mesmo formato do frontend/dados/mock_sub_regioes.json (o contrato com o site).
O mesmo Flask entrega a pasta frontend/, então o site e a API ficam no mesmo endereço.

Rodar (depois de preparar o banco, ver backend/banco.py):
    flask --app backend/app run
    abrir http://localhost:5000  (site)  ou  http://localhost:5000/api/sub-regioes  (dados)
"""
import hmac
import logging
import os
import re
from decimal import Decimal

import pymysql
from flask import Flask, jsonify, request

import carga
from analise import bp as analise_bp
from banco import AMOSTRA, CHAVE, EIXO_I, EIXO_II, PASTA, SCORE, conectar

COLUNAS_CONSULTA = ", ".join(CHAVE + EIXO_I + EIXO_II + SCORE + AMOSTRA)
SQL_MESES = "SELECT DISTINCT ano_mes FROM resultado_mensal ORDER BY ano_mes DESC"

FILTROS_PERMITIDOS = {"ano_mes", "regiao", "uf", "sub_regiao"}
REGIOES_VALIDAS = {"Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"}
REGEX_ANO_MES = re.compile(r"^\d{6}$")
REGEX_UF = re.compile(r"^[A-Z]{2}$")
REGEX_SUB_REGIAO = re.compile(r"^\d{2}$")

app = Flask(__name__, static_folder=os.path.join(PASTA, "..", "frontend", "dist"), static_url_path="")
app.register_blueprint(analise_bp)
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # 5 MB por envio; um mês inteiro tem uns 60 KB
app.logger.setLevel(logging.INFO)  # sem isso, o registro "Carga gravada" não aparece no terminal


def para_json(valor):
    """O MySQL devolve DECIMAL como Decimal, que o Flask escreveria como texto. O site precisa de número."""
    return float(valor) if isinstance(valor, Decimal) else valor


def validar_e_extrair_filtros(args):
    """Valida parâmetros da query string e retorna (filtros_limpos, mensagem_erro)."""
    desconhecidos = set(args.keys()) - FILTROS_PERMITIDOS
    if desconhecidos:
        nomes = ", ".join(sorted(desconhecidos))
        return None, f"Filtro(s) não suportado(s): {nomes}. Use: ano_mes, regiao, uf ou sub_regiao."

    ano_mes = args.get("ano_mes", "").strip()
    regiao = args.get("regiao", "").strip()
    uf = args.get("uf", "").strip().upper()
    sub_regiao = args.get("sub_regiao", "").strip()

    if "ano_mes" in args and not REGEX_ANO_MES.match(ano_mes):
        return None, "Filtro 'ano_mes' inválido. Use 6 dígitos no formato AAAAMM (ex: 202608)."

    if "regiao" in args and regiao not in REGIOES_VALIDAS:
        aceitas = ", ".join(sorted(REGIOES_VALIDAS))
        return None, f"Filtro 'regiao' inválido. Valores aceitos: {aceitas}."

    if "uf" in args and not REGEX_UF.match(uf):
        return None, "Filtro 'uf' inválido. Use a sigla com 2 letras (ex: SP)."

    if "sub_regiao" in args and not REGEX_SUB_REGIAO.match(sub_regiao):
        return None, "Filtro 'sub_regiao' inválido. Use os 2 dígitos iniciais do CEP (ex: 01)."

    if sub_regiao and not uf:
        return None, "Filtro 'sub_regiao' exige que o filtro 'uf' também seja informado."

    filtros = {}
    if ano_mes:
        filtros["ano_mes"] = ano_mes
    if regiao:
        filtros["regiao"] = regiao
    if uf:
        filtros["uf"] = uf
    if sub_regiao:
        filtros["sub_regiao"] = sub_regiao

    return filtros, None


def montar_sql_filtrado(filtros):
    """Monta a query parametrizada com placeholders %s apenas para colunas constantes permitidas."""
    condicoes = []
    parametros = []

    for coluna in ("ano_mes", "regiao", "uf", "sub_regiao"):
        if coluna in filtros:
            condicoes.append(f"{coluna} = %s")
            parametros.append(filtros[coluna])

    where = f" WHERE {' AND '.join(condicoes)}" if condicoes else ""
    sql = f"SELECT {COLUNAS_CONSULTA} FROM resultado_mensal{where} ORDER BY ano_mes, uf, sub_regiao"
    return sql, parametros


def montar_resposta(linhas, meses_disponiveis=None):
    """Separa as linhas da tabela nas duas listas do contrato (eixo_i e eixo_ii) e inclui meses disponíveis."""
    def recortar(linha, colunas):
        return {coluna: para_json(linha[coluna]) for coluna in colunas}

    resposta = {
        "eixo_i": [recortar(linha, CHAVE + EIXO_I + SCORE + AMOSTRA) for linha in linhas],
        "eixo_ii": [recortar(linha, CHAVE + EIXO_II + SCORE) for linha in linhas],
        "meses_disponiveis": meses_disponiveis if meses_disponiveis is not None else [],
    }
    if not linhas:
        resposta["mensagem"] = "Nenhum resultado encontrado para os filtros informados."
    return resposta


def consultar_resultados(filtros):
    sql, parametros = montar_sql_filtrado(filtros)
    conexao = conectar()
    try:
        with conexao.cursor() as cursor:
            cursor.execute(sql, parametros)
            linhas = cursor.fetchall()
            cursor.execute(SQL_MESES)
            meses = [item["ano_mes"] for item in cursor.fetchall()]
    finally:
        conexao.close()
    return linhas, meses


@app.get("/api/sub-regioes")
def sub_regioes():
    filtros, erro = validar_e_extrair_filtros(request.args)
    if erro:
        return jsonify(erro=erro), 400

    try:
        linhas, meses_disponiveis = consultar_resultados(filtros)
    except (pymysql.MySQLError, RuntimeError, ValueError):
        app.logger.exception("Falha ao consultar o banco")
        return jsonify(erro="Banco de dados indisponível"), 503

    return jsonify(montar_resposta(linhas, meses_disponiveis))


def token_valido():
    """Compara o cabeçalho X-Token-Carga com o CARGA_TOKEN do backend/.env em tempo constante."""
    esperado = os.environ.get("CARGA_TOKEN", "")
    recebido = request.headers.get("X-Token-Carga", "")
    return hmac.compare_digest(recebido.encode(), esperado.encode())


@app.post("/api/carga")
def receber_carga():
    """GJ00-60: o Colab envia os resultados para cá (pelo túnel), e eles são gravados no banco."""
    if not os.environ.get("CARGA_TOKEN"):
        return jsonify(erro="Carga desativada: defina CARGA_TOKEN em backend/.env"), 503
    if not token_valido():
        app.logger.warning("Carga recusada: token ausente ou errado")
        return jsonify(erro="Token de carga ausente ou inválido"), 401
    try:
        linhas = carga.preparar(request.get_json(silent=True))
    except ValueError as erro:
        return jsonify(erro=f"Nada foi gravado. {erro}"), 400
    try:
        conexao = conectar()
        try:
            total = carga.carregar(conexao, linhas)
        finally:
            conexao.close()
    except (pymysql.MySQLError, RuntimeError, ValueError):
        app.logger.exception("Falha ao gravar a carga no banco")
        return jsonify(erro="Banco de dados indisponível"), 503
    app.logger.info("Carga gravada: %s linhas", total)
    return jsonify(linhas_gravadas=total), 201


@app.get("/")
def site():
    if not os.path.isfile(os.path.join(app.static_folder, "index.html")):
        return "Compile o painel com npm ci e npm run build na pasta frontend.", 503
    return app.send_static_file("index.html")
