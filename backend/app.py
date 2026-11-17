"""GJ00-61: API Flask que lê os resultados do MariaDB/MySQL e entrega ao site.

A resposta tem o mesmo formato do frontend/dados/mock_sub_regioes.json (o contrato com o site).
O mesmo Flask entrega a pasta frontend/, então o site e a API ficam no mesmo endereço.

Rodar (depois de preparar o banco, ver backend/banco.py):
    flask --app backend/app run
    abrir http://localhost:5000  (site)  ou  http://localhost:5000/api/sub-regioes  (dados)
"""
import hmac
import logging
import os
from decimal import Decimal

import pymysql
from flask import Flask, jsonify, request

import carga
from banco import AMOSTRA, CHAVE, EIXO_I, EIXO_II, PASTA, SCORE, conectar

# Os nomes das colunas são constantes do banco.py: nada que vem do usuário entra no texto do SQL.
SQL_RESULTADOS = (
    f"SELECT {', '.join(CHAVE + EIXO_I + EIXO_II + SCORE + AMOSTRA)} "
    "FROM resultado_mensal ORDER BY ano_mes, uf, sub_regiao"
)

app = Flask(__name__, static_folder=os.path.join(PASTA, "..", "frontend"), static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # 5 MB por envio; um mês inteiro tem uns 60 KB
app.logger.setLevel(logging.INFO)  # sem isso, o registro "Carga gravada" não aparece no terminal


def para_json(valor):
    """O MySQL devolve DECIMAL como Decimal, que o Flask escreveria como texto. O site precisa de número."""
    return float(valor) if isinstance(valor, Decimal) else valor


def montar_resposta(linhas):
    """Separa as linhas da tabela nas duas listas do contrato: eixo_i e eixo_ii."""
    def recortar(linha, colunas):
        return {coluna: para_json(linha[coluna]) for coluna in colunas}

    return {
        "eixo_i": [recortar(linha, CHAVE + EIXO_I + SCORE + AMOSTRA) for linha in linhas],
        "eixo_ii": [recortar(linha, CHAVE + EIXO_II + SCORE) for linha in linhas],
    }


@app.get("/api/sub-regioes")
def sub_regioes():
    try:
        conexao = conectar()
        try:
            with conexao.cursor() as cursor:
                cursor.execute(SQL_RESULTADOS)
                linhas = cursor.fetchall()
        finally:
            conexao.close()
    except (pymysql.MySQLError, RuntimeError, ValueError):
        # MySQLError: banco fora do ar ou consulta recusada. RuntimeError e ValueError: backend/.env incompleto ou inválido.
        # O detalhe fica só no terminal do servidor; quem chama a API não vê usuário, host nem SQL.
        app.logger.exception("Falha ao consultar o banco")
        return jsonify(erro="Banco de dados indisponível"), 503
    return jsonify(montar_resposta(linhas))


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
        # sem IP: atrás do túnel, o endereço é sempre o do próprio túnel (127.0.0.1)
        app.logger.warning("Carga recusada: token ausente ou errado")
        return jsonify(erro="Token de carga ausente ou inválido"), 401
    try:
        linhas = carga.preparar(request.get_json(silent=True))  # confere tudo antes de abrir conexão com o banco
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
    return app.send_static_file("index.html")
