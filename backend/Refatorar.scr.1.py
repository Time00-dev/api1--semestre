import numpy as np
import pandas as pd


def padronizar_df_scr(df_scr):
    df_scr = df_scr.rename(columns={"data_base": "ano_mes", "porte": "classe"})

    df_scr["tipo"] = df_scr["cliente"].map({"PF": "pf"}).fillna("pj")

    # 1. PRESERVAÇÃO DA MODALIDADE
    # Garante que a coluna modalidade existe antes do melt
    if "modalidade" not in df_scr.columns:
        df_scr["modalidade"] = "nao_informado"

    # Inclusão de 'modalidade' nos id_vars para não ser descartada no unpivot
    df_scr = df_scr.melt(
        id_vars=[
            "ano_mes",
            "regiao",
            "uf",
            "tipo",
            "classe",
            "modalidade",
        ],
        value_vars=[
            "carteira_inadimplencia",
            "carteira_vencida",
            "carteira_ativa",
            "vencido_acima_de_90_dias",
        ],
        var_name="metrica_raw",
        value_name="valor",
    )

    # 2. CATEGORIZAÇÃO CRÉDITO CRÍTICO VS SAUDÁVEL
    # Classifica a métrica com base no risco de crédito
    condicoes_critico = df_scr["metrica_raw"].isin([
        "carteira_inadimplencia",
        "carteira_vencida",
        "vencido_acima_de_90_dias",
    ])

    df_scr["categoria_credito"] = np.where(
        condicoes_critico, "critico", "saudavel"
    )

    # Padroniza os nomes das métricas explicitando a criticidade
    condicoes_metrica = [
        df_scr["metrica_raw"] == "carteira_inadimplencia",
        df_scr["metrica_raw"] == "carteira_vencida",
        df_scr["metrica_raw"] == "vencido_acima_de_90_dias",
        df_scr["metrica_raw"] == "carteira_ativa",
    ]
    escolhas_metrica = [
        "carteira_inadimplencia_critico",
        "carteira_vencida_critico",
        "vencido_acima_90_critico",
        "carteira_ativa_saudavel",
    ]
    df_scr["metrica"] = np.select(
        condicoes_metrica, escolhas_metrica, default=df_scr["metrica_raw"]
    )

    df_scr["origem"] = "scr"

    # Agrupamento mantendo as novas colunas
    group_cols = [
        "ano_mes",
        "regiao",
        "uf",
        "tipo",
        "classe",
        "modalidade",
        "categoria_credito",
        "metrica",
        "origem",
    ]

    df_scr = (
        df_scr.groupby(group_cols, observed=True)["valor"].sum().reset_index()
    )

    for col in [
        "tipo",
        "classe",
        "origem",
        "metrica",
        "uf",
        "regiao",
        "modalidade",
        "categoria_credito",
    ]:
        if col in df_scr.columns:
            df_scr[col] = df_scr[col].astype("category")

    return df_scr[[
        "ano_mes",
        "regiao",
        "uf",
        "tipo",
        "classe",
        "modalidade",
        "categoria_credito",
        "metrica",
        "origem",
        "valor",
    ]]