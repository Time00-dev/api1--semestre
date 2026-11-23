import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import analise
import app

MES = "202610"
REGIAO = "RJ-20"
CONSULTA = {"mes": MES, "sub_regioes": [REGIAO], "pergunta": "Como interpretar o score?"}
CODIGO_TESTE = "codigo-local-para-testes-de-integracao"
CABECALHO = {"Authorization": "Bearer " + CODIGO_TESTE}
BASE = {
    "eixo_i": [{"ano_mes": MES, "uf": "RJ", "sub_regiao": "20", "fragilidadeRenda": 1, "score": 83.14, "ranking": 1}],
    "eixo_ii": [{"ano_mes": MES, "uf": "RJ", "sub_regiao": "20", "maturidadePix": 3.96}],
}


class TestAnalise(unittest.TestCase):
    def setUp(self):
        self.cliente = app.app.test_client()
        pasta = self.enterContext(tempfile.TemporaryDirectory())
        self.enterContext(mock.patch.dict(os.environ, {
            "OPENAI_API_KEY": "chave-de-teste", "ANALYSIS_ACCESS_TOKEN": CODIGO_TESTE,
            "ANALYSIS_QUOTA_PATH": str(Path(pasta) / "cota.sqlite3"), "ANALYSIS_DAILY_LIMIT": "1",
            "ANALYSIS_MONTHLY_LIMIT": "1", "ANALYSIS_ALLOWED_ORIGIN": "https://painel.example",
        }))

    def post(self, dados=CONSULTA, headers=CABECALHO):
        return self.cliente.post("/api/analise", json=dados, headers=headers)

    def test_exige_codigo_de_acesso(self):
        with mock.patch.object(analise, "explicacao_openai") as provedor:
            self.assertEqual(self.post(headers={}).status_code, 401)
            provedor.assert_not_called()

    def test_sem_configuracao_preserva_painel(self):
        with mock.patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
            self.assertEqual(self.post().status_code, 503)

    def test_usa_contexto_do_servidor_e_bloqueia_nova_chamada_ao_atingir_cota(self):
        with mock.patch.object(analise, "buscar_base", return_value=BASE), mock.patch.object(
            analise, "explicacao_openai", return_value=("Score publicado de 83,14.", "modelo-teste", {}),
        ) as provedor:
            dados = {**CONSULTA, "score": 99}
            self.assertEqual(self.post(dados).get_json()["resumo"], "Score publicado de 83,14.")
            contexto = provedor.call_args.args[2]["resultados"][0]
            self.assertEqual(contexto["score"], 83.14)
            self.assertIsNone(contexto["notas"]["fragilidadeRenda"])
            self.assertTrue(contexto["divergencia_fragilidade_no_lote"])
            self.assertEqual(self.post().status_code, 429)
            self.assertEqual(provedor.call_count, 1)

    def test_rejeita_recorte_fora_da_base_e_ids_duplicados(self):
        with mock.patch.object(analise, "buscar_base", return_value=BASE), mock.patch.object(analise, "explicacao_openai") as provedor:
            self.assertEqual(self.post({**CONSULTA, "sub_regioes": ["SP-01"]}).status_code, 404)
            self.assertEqual(self.post({**CONSULTA, "sub_regioes": [REGIAO, REGIAO]}).status_code, 400)
            provedor.assert_not_called()

    def test_preflight_permite_apenas_origem_configurada(self):
        for origem in ("https://painel.example", "https://outra.example"):
            resposta = self.cliente.options("/api/analise", headers={"Origin": origem})
            self.assertEqual(resposta.status_code, 204 if origem == "https://painel.example" else 403)
            self.assertEqual(resposta.headers.get("Access-Control-Allow-Origin"),
                             origem if origem == "https://painel.example" else None)

    def test_post_rejeita_origem_antes_de_consultar_a_base(self):
        with mock.patch.object(analise, "buscar_base") as consultar:
            resposta = self.post(headers={**CABECALHO, "Origin": "https://outra.example"})
            self.assertEqual(resposta.status_code, 403)
            consultar.assert_not_called()

    def test_recusa_codigo_fraco_ou_reuso_da_chave_da_openai(self):
        for ajustes in ({"ANALYSIS_ACCESS_TOKEN": "curto"}, {"OPENAI_API_KEY": CODIGO_TESTE}):
            with mock.patch.dict(os.environ, ajustes):
                self.assertEqual(self.post().status_code, 503)

    def test_luna_e_o_modelo_padrao_com_raciocinio_baixo(self):
        resultado = {
            "status": "completed",
            "output": [{"type": "message", "content": [{"type": "output_text", "text": "Resposta de teste."}]}],
        }
        with mock.patch.dict(os.environ, {"OPENAI_ANALYSIS_MODEL": ""}), mock.patch.object(analise, "urlopen") as abrir:
            abrir.return_value.__enter__.return_value.read.return_value = json.dumps(resultado).encode()
            resposta, modelo, _ = analise.explicacao_openai("chave-de-teste", CONSULTA["pergunta"], {})
        corpo = json.loads(abrir.call_args.args[0].data)
        self.assertEqual(resposta, "Resposta de teste.")
        self.assertEqual(modelo, "gpt-6-luna")
        self.assertEqual(corpo["model"], "gpt-6-luna")
        self.assertEqual(corpo["reasoning"], {"effort": "low"})
        self.assertEqual(corpo["max_output_tokens"], 720)
