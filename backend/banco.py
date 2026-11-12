"""GJ00-59: conexão com o MariaDB/MySQL, sem ORM.

Preparação (uma vez por máquina):
  1. No MySQL, como root, criar o banco e um usuário para o projeto:
       CREATE DATABASE negado_pelo_banco CHARACTER SET utf8mb4;
       CREATE USER 'negado_app'@'localhost' IDENTIFIED BY 'sua-senha';
       GRANT ALL PRIVILEGES ON negado_pelo_banco.* TO 'negado_app'@'localhost';
  2. Copiar backend/.env.exemplo para backend/.env e preencher (o .env não vai para o GitHub).
  3. pip install -r backend/requirements.txt
  4. python backend/banco.py      (cria as tabelas)
"""
import os
import re

import pymysql
from dotenv import load_dotenv

PASTA = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(PASTA, ".env"))


def configuracao():
    """Lê do ambiente os dados da conexão. Campo em branco usa o valor padrão."""
    return {
        "host": os.environ.get("DB_HOST") or "localhost",
        "port": int(os.environ.get("DB_PORT") or 3306),
        "user": os.environ.get("DB_USER"),
        "password": os.environ.get("DB_PASSWORD", ""),
        "database": os.environ.get("DB_NAME"),
    }


def conectar():
    """Abre uma conexão. As linhas das consultas voltam como dicionário {coluna: valor}."""
    config = configuracao()
    if not config["user"] or not config["database"]:
        raise RuntimeError("Preencha DB_USER e DB_NAME em backend/.env (copie de backend/.env.exemplo).")
    return pymysql.connect(charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor, **config)


def separar_comandos(sql):
    """Divide um arquivo .sql em comandos, ignorando os comentários que começam com --."""
    # ponytail: não entende "--" nem ";" dentro de texto entre aspas. O schema.sql não tem; trocar por um parser se tiver.
    sem_comentarios = "\n".join(re.sub(r"--.*$", "", linha).rstrip() for linha in sql.splitlines())
    return [comando.strip() for comando in sem_comentarios.split(";") if comando.strip()]


def criar_tabelas(conexao):
    """Executa o schema.sql. Pode rodar mais de uma vez: usa CREATE TABLE IF NOT EXISTS."""
    with open(os.path.join(PASTA, "schema.sql"), encoding="utf-8") as arquivo:
        comandos = separar_comandos(arquivo.read())
    with conexao.cursor() as cursor:
        for comando in comandos:
            cursor.execute(comando)


if __name__ == "__main__":
    conexao = conectar()
    try:
        criar_tabelas(conexao)
        with conexao.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) AS total FROM resultado_mensal")
            print(f"Tabela resultado_mensal pronta. Linhas: {cursor.fetchone()['total']}")
    finally:
        conexao.close()
