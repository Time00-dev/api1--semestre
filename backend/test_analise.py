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
CHAVE_TESTE = "chave-de-teste"
BASE = {
    "eixo_i": [{"ano_mes": MES, "uf": "RJ", "sub_regiao": "20", "fragilidadeRenda": 1, "score": 83.14, "ranking": 1}],
    "eixo_ii": [{"ano_mes": MES, "uf": "RJ", "sub_regiao": "20", "maturidadePix": 3.96}],
}


class TestAnalise(unittest.TestCase):
    def setUp(self):
        self.cliente = app.app.test_client()
        pasta = self.enterContext(tempfile.TemporaryDirectory())
        self.enterContext(mock.patch.dict(os.environ, {
            "OPENAI_API_KEY": CHAVE_TESTE, "ANALYSIS_REQUESTS_PER_MINUTE": "2",
            "ANALYSIS_QUOTA_PATH": str(Path(pasta) / "cota.sqlite3"),
            "ANALYSIS_ALLOWED_ORIGIN": "https://painel.example",
        }))

    def post(self, dados=CONSULTA, headers=None):
        return self.cliente.post("/api/analise", json=dados, headers=headers)

    def test_sem_configuracao_preserva_painel(self):
        with mock.patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
            self.assertEqual(self.post().status_code, 503)

    def test_usa_contexto_do_servidor_e_libera_novas_chamadas_apos_a_janela(self):
        with mock.patch.object(analise, "buscar_base", return_value=BASE), mock.patch.object(
            analise, "explicacao_openai", return_value=({"resumo": "Score publicado de 83,14."}, "modelo-teste", {}),
        ) as provedor, mock.patch.object(analise, "time", side_effect=[59.5, 60.1, 60.5, 119.5]):
            dados = {**CONSULTA, "score": 99}
            self.assertEqual(self.post(dados).get_json()["resumo"], "Score publicado de 83,14.")
            contexto = provedor.call_args.args[2]["resultados"][0]
            self.assertEqual(contexto["score"], 83.14)
            self.assertIsNone(contexto["notas"]["fragilidadeRenda"])
            self.assertTrue(contexto["divergencia_fragilidade_no_lote"])
            outro_visitante = app.app.test_client()
            self.assertEqual(outro_visitante.post("/api/analise", json=CONSULTA).status_code, 200)
            resposta = self.post(headers={"Origin": "https://painel.example"})
            self.assertEqual(resposta.status_code, 429)
            self.assertEqual(resposta.headers["Retry-After"], "59")
            self.assertEqual(resposta.headers["Access-Control-Expose-Headers"], "Retry-After")
            self.assertEqual(self.post().status_code, 200)
            self.assertEqual(provedor.call_count, 3)

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
            resposta = self.post(headers={"Origin": "https://outra.example"})
            self.assertEqual(resposta.status_code, 403)
            consultar.assert_not_called()

    def test_luna_e_o_modelo_padrao_com_raciocinio_baixo(self):
        resultado = {
            "status": "completed",
            "output": [{"type": "message", "content": [{
                "type": "output_text",
                "text": json.dumps({"escopo": "painel", "explicacao": "Resposta de teste.", "detalhes": "", "comparacao": "nenhuma"}),
            }]}],
        }
        with mock.patch.dict(os.environ, {"OPENAI_ANALYSIS_MODEL": ""}), mock.patch.object(analise, "urlopen") as abrir:
            abrir.return_value.__enter__.return_value.read.return_value = json.dumps(resultado).encode()
            resposta, modelo, _ = analise.explicacao_openai("chave-de-teste", CONSULTA["pergunta"], {})
        corpo = json.loads(abrir.call_args.args[0].data)
        self.assertEqual(resposta, {"resumo": "Resposta de teste."})
        self.assertEqual(modelo, "gpt-6-luna")
        self.assertEqual(corpo["model"], "gpt-6-luna")
        self.assertEqual(corpo["reasoning"], {"effort": "low"})
        self.assertEqual(corpo["max_output_tokens"], 720)
        self.assertTrue(corpo["text"]["format"]["strict"])
        self.assertNotIn("tools", corpo)

    def test_referencia_compara_pontos_do_mes_e_exclui_notas_ausentes(self):
        registro = {"ano_mes": MES, "uf": "SP", "sub_regiao": "05"}
        base = {
            "eixo_i": [{**BASE["eixo_i"][0], "inadimplenciaReal": 1},
                       {**registro, "inadimplenciaReal": 3, "fragilidadeRenda": 5}],
            "eixo_ii": [*BASE["eixo_ii"], {**registro, "maturidadePix": 4},
                        {**registro, "sub_regiao": "06", "maturidadePix": 5},
                        {**registro, "ano_mes": "202609", "maturidadePix": 1}],
        }
        contexto = analise.montar_contexto(base, MES, [REGIAO])
        referencia = contexto["referencia_do_grafico"]
        self.assertEqual(referencia["sub_regioes_no_grafico"], 2)
        self.assertEqual(referencia["risco"], {"media": 2, "minimo": 1, "maximo": 3})
        self.assertEqual(referencia["oportunidade"]["media"], 3.98)
        self.assertEqual(contexto["resultados"][0]["pontos_proximos"], [
            {"id": "SP-05", "risco": 3, "oportunidade": 4},
        ])

    def test_resposta_fora_do_escopo_usa_mensagem_do_servidor(self):
        resultado = {"status": "completed", "output": [{"type": "message", "content": [{
            "type": "output_text",
            "text": json.dumps({"escopo": "fora_do_escopo", "explicacao": "Receita de bolo.", "detalhes": "", "comparacao": "nenhuma"}),
        }]}]}
        with mock.patch.object(analise, "urlopen") as abrir:
            abrir.return_value.__enter__.return_value.read.return_value = json.dumps(resultado).encode()
            resposta, _, _ = analise.explicacao_openai("chave-de-teste", "Como faço um bolo?", {})
        self.assertEqual(resposta, {"resumo": analise.FORA_DO_ESCOPO})

    def test_comparacao_usa_scores_e_notas_da_base(self):
        contexto = {"resultados": [
            {"id": "RJ-20", "score": 83.14, "risco_no_grafico": 1.19, "oportunidade_no_grafico": 3.67},
            {"id": "BA-40", "score": 58.25, "risco_no_grafico": 3.10, "oportunidade_no_grafico": 3.20},
        ]}
        scores = analise.destacar_comparacao("score", contexto)
        grafico = analise.destacar_comparacao("grafico", contexto)
        self.assertEqual(scores["diferenca"], 24.89)
        self.assertEqual([item["score"] for item in scores["valores"]], [83.14, 58.25])
        self.assertEqual([item["risco"] for item in grafico["valores"]], [1.19, 3.10])
        self.assertIsNone(analise.destacar_comparacao("nenhuma", contexto))

    def test_score_de_um_territorio_compara_os_dois_eixos_com_as_medias(self):
        contexto = {
            "resultados": [{"id": "SP-12", "score": 68.84, "risco_no_grafico": 3, "oportunidade_no_grafico": 4.18}],
            "referencia_do_grafico": {"sub_regioes_no_grafico": 104,
                                     "risco": {"media": 3.15}, "oportunidade": {"media": 3.52}},
        }
        self.assertEqual(analise.destacar_comparacao("score", contexto)["valores"], [
            {"id": "SP-12", "risco": 3, "oportunidade": 4.18},
            {"id": "media", "risco": 3.15, "oportunidade": 3.52},
        ])

    def test_reutiliza_base_publicada_e_repete_uma_vez_se_a_fonte_demorar(self):
        resposta = mock.MagicMock()
        resposta.__enter__.return_value.read.return_value = json.dumps(BASE).encode()
        with mock.patch.object(analise, "urlopen", side_effect=[TimeoutError(), resposta]) as abrir:
            for _ in range(2):
                self.assertEqual(analise.buscar_base_publicada("https://api.example/sub-regioes", MES, 1), BASE)
        self.assertEqual(abrir.call_count, 2)

    def test_credencial_na_pergunta_nao_chega_ao_provedor(self):
        with mock.patch.object(analise, "buscar_base") as consultar, mock.patch.object(analise, "explicacao_openai") as provedor:
            self.assertEqual(self.post({**CONSULTA, "pergunta": CHAVE_TESTE}).status_code, 400)
        consultar.assert_not_called()
        provedor.assert_not_called()
