"""GJ00-61: API Flask que lê os resultados do MariaDB/MySQL e entrega ao site.

A resposta tem o mesmo formato do frontend/dados/mock_sub_regioes.json (o contrato com o site).
O mesmo Flask entrega a pasta frontend/, então o site e a API ficam no mesmo endereço.

Rodar (depois de preparar o banco, ver backend/banco.py):
    flask --app backend/app run
    abrir http://localhost:5000  (site)  ou  http://localhost:5000/api/sub-regioes  (dados)
"""
import os
from decimal import Decimal

import pymysql
from flask import Flask, jsonify

from banco import PASTA, conectar

# Nomes iguais aos das colunas da tabela resultado_mensal e às chaves do JSON.
CHAVE = ["ano_mes", "regiao", "uf", "sub_regiao", "nome_sub_regiao"]
EIXO_I = ["inadimplenciaReal", "fragilidadeRenda", "agingDivida", "vulnerabilidadeSocial"]
EIXO_II = ["maturidadePix", "crescimentoPopulacional", "totalHabitantes", "bonusDemografico"]
SCORE = ["score", "faixa", "ranking"]
AMOSTRA = ["operacoes", "peso"]  # só os indicadores de crédito (Eixo I) dependem do tamanho da amostra

# Os nomes das colunas são constantes deste arquivo: nada que vem do usuário entra no texto do SQL.
SQL_RESULTADOS = (
    f"SELECT {', '.join(CHAVE + EIXO_I + EIXO_II + SCORE + AMOSTRA)} "
    "FROM resultado_mensal ORDER BY ano_mes, uf, sub_regiao"
)

app = Flask(__name__, static_folder=os.path.join(PASTA, "..", "frontend"), static_url_path="")


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


@app.get("/")
def site():
    return app.send_static_file("index.html")
