"""Testes da API Flask que não precisam de banco.  Rodar:  python -m unittest discover -s backend"""
import json
import os
import re
import unittest
from decimal import Decimal
from unittest import mock

import pymysql

import app as api

MOCK = os.path.join(api.PASTA, "..", "frontend", "dados", "mock_sub_regioes.json")


def linha_do_banco(**trocas):
    """Uma linha como o PyMySQL devolve: dicionário com todas as colunas, notas em Decimal."""
    linha = {
        "ano_mes": "202608", "regiao": "Sudeste", "uf": "SP", "sub_regiao": "01", "nome_sub_regiao": "São Paulo · SP",
        "inadimplenciaReal": Decimal("3.25"), "fragilidadeRenda": None, "agingDivida": Decimal("2.79"),
        "vulnerabilidadeSocial": Decimal("4.32"), "maturidadePix": Decimal("1.18"),
        "crescimentoPopulacional": Decimal("2.39"), "totalHabitantes": Decimal("1.02"), "bonusDemografico": Decimal("4.39"),
        "score": None, "faixa": None, "ranking": None, "operacoes": None, "peso": None,
    }
    linha.update(trocas)
    return linha


class MontarResposta(unittest.TestCase):
    def test_nota_decimal_vira_numero_e_nao_texto(self):
        # o Flask escreveria Decimal como "3.25" (texto) e o site trataria a nota como sem dado
        item = api.montar_resposta([linha_do_banco()])["eixo_i"][0]
        self.assertIsInstance(item["inadimplenciaReal"], float)
        self.assertEqual(item["inadimplenciaReal"], 3.25)

    def test_sem_dado_continua_null(self):
        item = api.montar_resposta([linha_do_banco()])["eixo_i"][0]
        self.assertIsNone(item["fragilidadeRenda"])

    def test_sub_regiao_e_mes_continuam_texto(self):
        item = api.montar_resposta([linha_do_banco()])["eixo_ii"][0]
        self.assertEqual((item["ano_mes"], item["sub_regiao"]), ("202608", "01"))

    def test_cada_eixo_tem_as_chaves_do_mock_mais_os_campos_novos(self):
        with open(MOCK, encoding="utf-8") as arquivo:
            contrato = json.load(arquivo)
        resposta = api.montar_resposta([linha_do_banco()])
        self.assertEqual(set(resposta["eixo_i"][0]),
                         set(contrato["eixo_i"][0]) | {"score", "faixa", "ranking", "operacoes", "peso"})
        self.assertEqual(set(resposta["eixo_ii"][0]),
                         set(contrato["eixo_ii"][0]) | {"score", "faixa", "ranking"})

    def test_score_e_ranking_passam_para_os_dois_eixos(self):
        resposta = api.montar_resposta([linha_do_banco(score=Decimal("61.50"), faixa="Oportunidade com cautela", ranking=7)])
        for eixo in ("eixo_i", "eixo_ii"):
            item = resposta[eixo][0]
            self.assertEqual((item["score"], item["faixa"], item["ranking"]), (61.5, "Oportunidade com cautela", 7))

    def test_banco_vazio_devolve_as_duas_listas_vazias(self):
        self.assertEqual(api.montar_resposta([]), {"eixo_i": [], "eixo_ii": []})


class ConexaoFalsa:
    """Só o que a rota usa do PyMySQL: cursor() com execute/fetchall e close()."""

    def __init__(self, linhas):
        self.linhas, self.fechada = linhas, False

    def cursor(self):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *erro):
        return False

    def execute(self, sql, parametros=None):
        pass

    def fetchall(self):
        return self.linhas

    def close(self):
        self.fechada = True


class Rotas(unittest.TestCase):
    def setUp(self):
        self.cliente = api.app.test_client()

    def test_rota_devolve_json_com_nota_numerica_e_fecha_a_conexao(self):
        conexao = ConexaoFalsa([linha_do_banco()])
        with mock.patch.object(api, "conectar", return_value=conexao):
            resposta = self.cliente.get("/api/sub-regioes")
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.get_json()["eixo_i"][0]["inadimplenciaReal"], 3.25)
        self.assertTrue(conexao.fechada)

    def test_banco_fora_do_ar_devolve_503_sem_detalhes(self):
        erro = pymysql.err.OperationalError(2003, "Can't connect to MySQL server on 'localhost'")
        # o detalhe do erro vai para o registro do servidor, e não para quem chamou a API
        with mock.patch.object(api, "conectar", side_effect=erro), self.assertLogs(api.app.logger, "ERROR"):
            resposta = self.cliente.get("/api/sub-regioes")
        self.assertEqual(resposta.status_code, 503)
        self.assertEqual(resposta.get_json(), {"erro": "Banco de dados indisponível"})

    def test_env_incompleto_tambem_devolve_503(self):
        with mock.patch.object(api, "conectar", side_effect=RuntimeError("Preencha DB_USER")), \
                self.assertLogs(api.app.logger, "ERROR"):
            resposta = self.cliente.get("/api/sub-regioes")
        self.assertEqual(resposta.status_code, 503)

    def test_porta_invalida_no_env_tambem_devolve_503(self):
        # DB_PORT=abc faz o int() do banco.py falhar com ValueError
        with mock.patch.dict(os.environ, {"DB_PORT": "abc"}), self.assertLogs(api.app.logger, "ERROR"):
            resposta = self.cliente.get("/api/sub-regioes")
        self.assertEqual(resposta.status_code, 503)
        self.assertEqual(resposta.get_json(), {"erro": "Banco de dados indisponível"})

    def test_toda_coluna_consultada_existe_no_schema(self):
        # nome trocado no schema.sql ou digitado errado no app.py só apareceria com o servidor no ar
        with open(os.path.join(api.PASTA, "schema.sql"), encoding="utf-8") as arquivo:
            colunas_do_schema = set(re.findall(r"^\s+(\w+)\s+(?:CHAR|VARCHAR|DECIMAL|INT)\b", arquivo.read(), re.MULTILINE))
        consultadas = set(api.CHAVE + api.EIXO_I + api.EIXO_II + api.SCORE + api.AMOSTRA)
        self.assertEqual(consultadas - colunas_do_schema, set())
        self.assertEqual(len(colunas_do_schema), 18)

    def test_raiz_entrega_o_site(self):
        resposta = self.cliente.get("/")
        self.assertEqual(resposta.status_code, 200)
        self.assertIn('src="app.js"', resposta.get_data(as_text=True))
        resposta.close()

    def test_arquivos_do_site_sao_servidos(self):
        resposta = self.cliente.get("/app.js")
        self.assertEqual(resposta.status_code, 200)
        resposta.close()


if __name__ == "__main__":
    unittest.main()
