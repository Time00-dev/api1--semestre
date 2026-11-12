"""Testes do banco.py que não precisam de banco.  Rodar:  python -m unittest discover -s backend"""
import os
import unittest
from unittest import mock

import banco


class SepararComandos(unittest.TestCase):
    def test_ponto_e_virgula_em_comentario_nao_corta_o_comando(self):
        sql = "CREATE TABLE t (\n  a INT -- nota de 0 a 100; maior = melhor\n);"
        self.assertEqual(banco.separar_comandos(sql), ["CREATE TABLE t (\n  a INT\n)"])

    def test_comentario_depois_do_ultimo_comando_nao_vira_comando_vazio(self):
        sql = "-- cabeçalho\nCREATE TABLE t (a INT);\n-- fim do arquivo"
        self.assertEqual(banco.separar_comandos(sql), ["CREATE TABLE t (a INT)"])

    def test_schema_do_projeto_tem_um_comando_so(self):
        with open(os.path.join(banco.PASTA, "schema.sql"), encoding="utf-8") as arquivo:
            comandos = banco.separar_comandos(arquivo.read())
        self.assertEqual(len(comandos), 1)
        self.assertTrue(comandos[0].startswith("CREATE TABLE IF NOT EXISTS resultado_mensal"))


class Configuracao(unittest.TestCase):
    def test_env_sem_usuario_avisa_para_preencher_o_env(self):
        with mock.patch.dict(os.environ, {"DB_USER": "", "DB_PASSWORD": "x", "DB_NAME": "y"}):
            with self.assertRaisesRegex(RuntimeError, r"backend/\.env"):
                banco.conectar()

    def test_porta_em_branco_usa_3306(self):
        with mock.patch.dict(os.environ, {"DB_PORT": ""}):
            self.assertEqual(banco.configuracao()["port"], 3306)


if __name__ == "__main__":
    unittest.main()
