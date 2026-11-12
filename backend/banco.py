"""GJ00-59: conexão com o MariaDB/MySQL, sem ORM.

As configurações ficam em backend/.env (copie de .env.exemplo), fora do código publicado.
Rodar este arquivo cria as tabelas:  python backend/banco.py
"""
import os

import pymysql
from dotenv import load_dotenv

PASTA = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(PASTA, ".env"))


def conectar():
    """Abre uma conexão. As linhas das consultas voltam como dicionário {coluna: valor}."""
    return pymysql.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", "3306")),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        database=os.environ["DB_NAME"],
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )


def criar_tabelas():
    """Executa o schema.sql. Pode rodar mais de uma vez: usa CREATE TABLE IF NOT EXISTS."""
    with open(os.path.join(PASTA, "schema.sql"), encoding="utf-8") as arquivo:
        comandos = [c.strip() for c in arquivo.read().split(";") if c.strip()]
    conexao = conectar()
    try:
        with conexao.cursor() as cursor:
            for comando in comandos:
                cursor.execute(comando)
        conexao.commit()
    finally:
        conexao.close()


if __name__ == "__main__":
    criar_tabelas()
    conexao = conectar()
    try:
        with conexao.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) AS total FROM resultado_mensal")
            print(f"Tabela resultado_mensal pronta. Linhas: {cursor.fetchone()['total']}")
    finally:
        conexao.close()
