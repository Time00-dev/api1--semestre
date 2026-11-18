"""Testes da carga (GJ00-60) que não precisam de banco.  Rodar:  python -m unittest discover -s backend"""
import json
import math
import os
import unittest

import carga

MOCK = os.path.join(carga.PASTA, "..", "frontend", "dados", "mock_sub_regioes.json")


def linha(**trocas):
    base = {"ano_mes": "202608", "regiao": "Norte", "uf": "AC", "sub_regiao": "69", "nome_sub_regiao": "Rio Branco · AC",
            "inadimplenciaReal": 3.25, "agingDivida": None}
    base.update(trocas)
    return base


class ValidarLinha(unittest.TestCase):
    def test_o_mock_inteiro_e_aceito(self):
        with open(MOCK, encoding="utf-8") as arquivo:
            self.assertEqual(len(carga.preparar(json.load(arquivo))), 1248)

    def test_recusa_valores_fora_do_formato(self):
        casos = {
            "ano_mes com 5 dígitos": linha(ano_mes="20268"),
            "ano_mes como número": linha(ano_mes=202608),
            "mês 13": linha(ano_mes="202613"),
            "UF inexistente": linha(uf="XX"),
            "UF minúscula": linha(uf="ac"),
            "sub-região com 1 dígito": linha(sub_regiao="1"),
            "sub-região como número": linha(sub_regiao=69),
            "região inexistente": linha(regiao="Oeste"),
            "nota como texto": linha(inadimplenciaReal="3.25"),
            "nota acima de 5": linha(inadimplenciaReal=5.5),
            "nota negativa": linha(inadimplenciaReal=-1),
            "nota NaN": linha(inadimplenciaReal=math.nan),
            "nota entre 0 e 1 (a escala começa em 1; 0 é sem dado)": linha(inadimplenciaReal=0.5),
            "ranking maior que a coluna INT": linha(ranking=2 ** 31),
            "operações maiores que a coluna INT": linha(operacoes=2 ** 31),
            "nota booleana": linha(inadimplenciaReal=True),
            "score acima de 100": linha(score=100.5),
            "ranking zero": linha(ranking=0),
            "ranking decimal": linha(ranking=1.5),
            "peso acima de 1": linha(peso=1.2),
            "operações negativas": linha(operacoes=-3),
            "faixa longa demais": linha(faixa="x" * 31),
            "campo desconhecido": linha(senha="x"),
            "SQL no nome do campo": linha(**{"uf) VALUES (1); DROP TABLE resultado_mensal; --": 1}),
        }
        for motivo, item in casos.items():
            with self.subTest(motivo), self.assertRaises(ValueError):
                carga.validar_linha(item)

    def test_recusa_linha_sem_chave(self):
        item = linha()
        del item["sub_regiao"]
        with self.assertRaisesRegex(ValueError, "sub_regiao"):
            carga.validar_linha(item)


class Preparar(unittest.TestCase):
    def test_junta_os_dois_eixos_da_mesma_chave_numa_linha(self):
        dados = {"eixo_i": [linha(inadimplenciaReal=3.25, score=60.0)],
                 "eixo_ii": [linha(maturidadePix=1.18, score=60.0)]}
        linhas = carga.preparar(dados)
        self.assertEqual(len(linhas), 1)
        self.assertEqual((linhas[0]["inadimplenciaReal"], linhas[0]["maturidadePix"]), (3.25, 1.18))

    def test_mesma_sub_regiao_em_ufs_diferentes_continua_separada(self):
        dados = {"eixo_i": [linha(uf="AC"), linha(uf="AM", regiao="Norte")]}
        self.assertEqual(len(carga.preparar(dados)), 2)

    def test_nota_zero_vira_sem_dado(self):
        # no notebook e no mock, 0 nas notas significa "sem dado"; no banco "sem dado" é NULL
        self.assertIsNone(carga.preparar({"eixo_i": [linha(inadimplenciaReal=0)]})[0]["inadimplenciaReal"])

    def test_score_zero_continua_zero(self):
        # score 0 é válido (a pior oportunidade), não é "sem dado"
        self.assertEqual(carga.preparar({"eixo_i": [linha(score=0)]})[0]["score"], 0)

    def test_erro_aponta_a_lista_e_a_posicao(self):
        with self.assertRaisesRegex(ValueError, r"eixo_ii\[1\]"):
            carga.preparar({"eixo_ii": [linha(), linha(uf="XX")]})

    def test_mesma_chave_com_valores_diferentes_e_recusada(self):
        with self.assertRaisesRegex(ValueError, "valores diferentes"):
            carga.preparar({"eixo_i": [linha(score=60.0)], "eixo_ii": [linha(score=61.0)]})

    def test_formato_errado_e_recusado(self):
        for dados in (None, [], {"eixo_iii": []}, {"eixo_i": {}}, {"eixo_i": ["x"]}, {}):
            with self.subTest(dados=dados), self.assertRaises(ValueError):
                carga.preparar(dados)

    def test_limite_de_linhas_por_carga(self):
        muitas = [linha(ano_mes="202608", sub_regiao=f"{i % 100:02d}", uf=uf)
                  for i, uf in zip(range(carga.MAX_LINHAS + 1), ["AC", "AM"] * carga.MAX_LINHAS)]
        with self.assertRaisesRegex(ValueError, "linhas"):
            carga.preparar({"eixo_i": muitas})


class ConexaoFalsa:
    def __init__(self, falhar=False):
        self.comandos, self.commits, self.rollbacks, self.falhar = [], 0, 0, falhar

    def cursor(self):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *erro):
        return False

    def begin(self):
        pass

    def executemany(self, sql, valores):
        if self.falhar:
            raise RuntimeError("queda no meio da carga")
        self.comandos.append((sql, list(valores)))

    def execute(self, sql, valores):
        self.comandos.append((sql, list(valores)))

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1


class Carregar(unittest.TestCase):
    def test_grava_com_parametros_e_upsert_so_das_colunas_recebidas(self):
        conexao = ConexaoFalsa()
        total = carga.carregar(conexao, carga.preparar({"eixo_i": [linha()]}))
        self.assertEqual(total, 1)
        sql, valores = next(c for c in conexao.comandos if c[0].startswith("INSERT"))
        self.assertIn("ON DUPLICATE KEY UPDATE", sql)
        self.assertIn("inadimplenciaReal = VALUES(inadimplenciaReal)", sql)
        self.assertNotIn("maturidadePix", sql)  # coluna que não veio não é apagada
        self.assertNotIn("3.25", sql)           # valores vão como parâmetros, nunca no texto do SQL
        colunas = sql.split("(", 1)[1].split(")", 1)[0].split(", ")
        gravado = dict(zip(colunas, valores[0]))
        self.assertEqual((gravado["ano_mes"], gravado["uf"], gravado["sub_regiao"]), ("202608", "AC", "69"))
        self.assertEqual(gravado["inadimplenciaReal"], 3.25)
        self.assertEqual(conexao.commits, 1)

    def test_o_envio_vale_como_o_mes_completo(self):
        # pares do mês que não vieram no envio (ex.: os 104 do mock antes da carga real) saem do banco,
        # na mesma transação e antes de gravar; os que vieram são atualizados, mantendo o nome já gravado
        conexao = ConexaoFalsa()
        carga.carregar(conexao, carga.preparar({"eixo_i": [linha(uf="AC"), linha(uf="AM")]}))
        delete, parametros = conexao.comandos[0]
        self.assertTrue(delete.startswith("DELETE FROM resultado_mensal WHERE ano_mes = %s"))
        self.assertEqual(parametros, ["202608", "AC-69", "AM-69"])
        self.assertNotIn("AC-69", delete)  # chaves vão como parâmetros
        self.assertTrue(conexao.comandos[1][0].startswith("INSERT"))
        self.assertEqual(conexao.commits, 1)

    def test_falha_no_meio_desfaz_tudo(self):
        conexao = ConexaoFalsa(falhar=True)
        with self.assertRaises(RuntimeError):
            carga.carregar(conexao, carga.preparar({"eixo_i": [linha()]}))
        self.assertEqual((conexao.commits, conexao.rollbacks), (0, 1))


if __name__ == "__main__":
    unittest.main()
