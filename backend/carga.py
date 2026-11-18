"""GJ00-60: grava no banco os resultados que o notebook do Colab calcula.

Recebe o mesmo formato que a API devolve (frontend/dados/mock_sub_regioes.json):
    {"eixo_i": [ {ano_mes, uf, sub_regiao, ...notas} ], "eixo_ii": [ ... ]}
As duas listas trazem a mesma chave (ano_mes, uf, sub_regiao) e viram uma linha só na tabela.

Dois jeitos de usar:
  - o Colab envia para a rota POST /api/carga do Flask (app.py);
  - na sua máquina, a partir de um arquivo:  python backend/carga.py frontend/dados/mock_sub_regioes.json
Rodar duas vezes não duplica nada: a chave da tabela atualiza a linha que já existe.
Cada envio vale como o mês completo: os pares UF + sub-região do mês que não vieram saem do banco.
"""
import json
import math
import re
import sys

import pymysql

from banco import AMOSTRA, CHAVE, EIXO_I, EIXO_II, PASTA, SCORE, conectar

COLUNAS = CHAVE + EIXO_I + EIXO_II + SCORE + AMOSTRA
CHAVE_PRIMARIA = ("ano_mes", "uf", "sub_regiao")
NOTAS = EIXO_I + EIXO_II
MAX_LINHAS = 5000  # por lista e por envio; o notebook envia um mês por vez (cerca de 104 linhas)
MAX_INT = 2 ** 31 - 1  # maior valor de uma coluna INT no MySQL/MariaDB

UFS = {"AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI",
       "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"}
REGIOES = {"Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"}


def _numero(valor):
    """Número de verdade: int ou float finito. bool não conta (em Python, True também é int)."""
    return isinstance(valor, (int, float)) and not isinstance(valor, bool) and math.isfinite(valor)


def _entre(minimo, maximo):
    return lambda v: _numero(v) and minimo <= v <= maximo


def _texto(regra):
    return lambda v: isinstance(v, str) and regra(v)


def _inteiro(minimo):
    return lambda v: isinstance(v, int) and not isinstance(v, bool) and minimo <= v <= MAX_INT


def _nota(v):
    """Notas vão de 1 a 5. O 0 é aceito porque o notebook usa 0 para "sem dado" (vira NULL no banco)."""
    return _numero(v) and (v == 0 or 1 <= v <= 5)


# Regra de cada coluna. None (null no JSON) sempre vale "sem dado", menos nas colunas da chave.
REGRAS = {
    "ano_mes": _texto(lambda v: re.fullmatch(r"20\d{2}(0[1-9]|1[0-2])", v) is not None),
    "uf": _texto(lambda v: v in UFS),
    "sub_regiao": _texto(lambda v: re.fullmatch(r"\d{2}", v) is not None),
    "regiao": _texto(lambda v: v in REGIOES),
    "nome_sub_regiao": _texto(lambda v: 0 < len(v) <= 80),
    **{nota: _nota for nota in NOTAS},
    "score": _entre(0, 100),
    "faixa": _texto(lambda v: 0 < len(v) <= 30),
    "ranking": _inteiro(1),
    "operacoes": _inteiro(0),
    "peso": _entre(0, 1),
}


def validar_linha(linha):
    """Confere uma linha recebida. Levanta ValueError dizendo o campo e o motivo."""
    if not isinstance(linha, dict):
        raise ValueError("cada item precisa ser um objeto JSON")
    desconhecidos = sorted(set(linha) - set(REGRAS))
    if desconhecidos:
        raise ValueError(f"campos desconhecidos: {', '.join(desconhecidos)[:200]}")
    for coluna in CHAVE_PRIMARIA:
        if linha.get(coluna) is None:
            raise ValueError(f"falta {coluna}")
    for coluna, valor in linha.items():
        if valor is not None and not REGRAS[coluna](valor):
            raise ValueError(f"{coluna} inválido: {str(valor)[:40]!r}")


def preparar(dados):
    """Valida tudo e junta eixo_i e eixo_ii: uma linha por (ano_mes, uf, sub_regiao)."""
    if not isinstance(dados, dict) or not dados or set(dados) - {"eixo_i", "eixo_ii"}:
        raise ValueError('o corpo precisa ser {"eixo_i": [...], "eixo_ii": [...]}')
    juntas = {}
    for eixo, itens in dados.items():
        if not isinstance(itens, list):
            raise ValueError(f"{eixo} precisa ser uma lista")
        if len(itens) > MAX_LINHAS:
            raise ValueError(f"{eixo} tem mais de {MAX_LINHAS} linhas; envie um mês por vez")
        for posicao, item in enumerate(itens):
            try:
                validar_linha(item)
            except ValueError as erro:
                raise ValueError(f"{eixo}[{posicao}]: {erro}") from None
            # no notebook e no mock, nota 0 significa "sem dado"; no banco "sem dado" é NULL
            item = {coluna: (None if coluna in NOTAS and valor == 0 else valor) for coluna, valor in item.items()}
            chave = tuple(item[coluna] for coluna in CHAVE_PRIMARIA)
            linha = juntas.setdefault(chave, {})
            for coluna, valor in item.items():
                if coluna in linha and linha[coluna] != valor:
                    raise ValueError(f"{eixo}[{posicao}]: {coluna} com valores diferentes para {'-'.join(chave)}")
                linha[coluna] = valor
    return list(juntas.values())


def _sql_insert(colunas):
    """INSERT que atualiza a linha se a chave já existir. Só atualiza as colunas recebidas."""
    atualizar = [c for c in colunas if c not in CHAVE_PRIMARIA] or ["ano_mes"]
    # VALUES(coluna) funciona no MySQL e no MariaDB (o enunciado aceita os dois)
    return (f"INSERT INTO resultado_mensal ({', '.join(colunas)}) VALUES ({', '.join(['%s'] * len(colunas))}) "
            f"ON DUPLICATE KEY UPDATE {', '.join(f'{c} = VALUES({c})' for c in atualizar)}")


def carregar(conexao, linhas):
    """Grava as linhas já conferidas por preparar() numa transação só: ou entra tudo, ou nada.
    Cada mês enviado substitui o mês no banco: os pares que não vieram são apagados antes de gravar
    (os que vieram são atualizados e mantêm as colunas que não foram enviadas, como o nome).
    Devolve quantas linhas foram gravadas."""
    por_mes, grupos = {}, {}  # grupos: linhas com o mesmo conjunto de colunas usam o mesmo INSERT
    for linha in linhas:
        por_mes.setdefault(linha["ano_mes"], []).append(f"{linha['uf']}-{linha['sub_regiao']}")
        colunas = tuple(c for c in COLUNAS if c in linha)  # ordem fixa, nomes só da lista COLUNAS
        grupos.setdefault(colunas, []).append(tuple(linha[c] for c in colunas))
    conexao.begin()
    try:
        with conexao.cursor() as cursor:
            for mes, pares in por_mes.items():
                cursor.execute("DELETE FROM resultado_mensal WHERE ano_mes = %s "
                               f"AND CONCAT(uf, '-', sub_regiao) NOT IN ({', '.join(['%s'] * len(pares))})",
                               [mes, *pares])
            for colunas, valores in grupos.items():
                cursor.executemany(_sql_insert(colunas), valores)
        conexao.commit()
    except Exception:
        conexao.rollback()
        raise
    return len(linhas)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Uso: python backend/carga.py arquivo.json")
    try:
        with open(sys.argv[1], encoding="utf-8") as arquivo:
            linhas = preparar(json.load(arquivo))  # confere tudo antes de abrir conexão com o banco
    except (OSError, ValueError) as erro:  # arquivo inexistente, JSON quebrado ou linha inválida
        sys.exit(f"Nada foi gravado. {erro}")
    try:
        conexao = conectar()
        try:
            print(f"Linhas gravadas ou atualizadas: {carregar(conexao, linhas)}")
        finally:
            conexao.close()
    except (pymysql.MySQLError, RuntimeError, ValueError) as erro:  # banco fora do ar ou backend/.env inválido
        sys.exit(f"Nada foi gravado. Problema com o banco: {erro}")
