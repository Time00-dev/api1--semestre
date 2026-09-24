# --- Mudança feita dia 24-09 (Miguel) ---

def calcular_eixo_ii(df_scr_pix_base, df_ibge_base):
    df_scr_pix = df_scr_pix_base.copy()
    df_ibge = df_ibge_base.copy()

    # --- Extrai ano e merge com IBGE ---
    df_scr_pix["ano"] = df_scr_pix["ano_mes"].astype(str).str[:4]

    df_calculos = df_scr_pix.merge(
        df_ibge[["ano", "regiao", "uf", "populacao_residente", "taxa_crescimento", "variacao_populacao", "bonusDemografico"]],
        on=["ano", "regiao", "uf"],
        how="left"
    ).drop(columns=["ano"])

    def eliminar_duplicata(metrica):
        df_calculos[metrica] = (
            df_calculos.groupby("uf")[metrica]
            .transform(lambda x: x.ffill().bfill())
        )

    eliminar_duplicata("populacao_residente")
    eliminar_duplicata("taxa_crescimento")
    eliminar_duplicata("variacao_populacao")
    eliminar_duplicata("bonusDemografico")

    # --- Agrupamento das métricas Pix ---
    df_metricas = pd.concat([
        agrupar_metrica(df_calculos, "vl_pagador").rename("vl_pagador"),
        agrupar_metrica(df_calculos, "qt_pes_pagador").rename("qt_pes_pagador"),
        agrupar_metrica(df_calculos, "qt_pagador").rename("qt_pagador"),
    ], axis=1).reset_index()

    df_calculos = (
        df_calculos[["ano_mes", "regiao", "uf", "populacao_residente", "taxa_crescimento", "variacao_populacao", "bonusDemografico"]]
        .drop_duplicates()
        .merge(df_metricas, on=filtro, how="left")
    )

    # --- CORREÇÃO DO CÁLCULO E DIVISÃO POR ZERO (GJ00-33) ---
    # 1. Maturidade Uso PIX = qt_pagador / qt_pes_pagador
    maturidade_uso = np.where(
        df_calculos["qt_pes_pagador"] > 0,
        df_calculos["qt_pagador"] / df_calculos["qt_pes_pagador"],
        0.0
    )

    # 2. Maturidade Financeira PIX = vl_pagador / qt_pagador
    maturidade_financeira = np.where(
        df_calculos["qt_pagador"] > 0,
        df_calculos["vl_pagador"] / df_calculos["qt_pagador"],
        0.0
    )

    # 3. Consolidado Maturidade PIX = (Uso * 0.6) + (Financeira * 0.4)
    df_calculos["maturidadePix"] = (maturidade_uso * 0.6) + (maturidade_financeira * 0.4)

    # Demais indicadores do Eixo II
    df_calculos["crescimentoPopulacional"] = df_calculos["taxa_crescimento"]
    df_calculos["totalHabitantes"] = df_calculos["populacao_residente"]

    # --- Normalização ---
    df_calculos = normalizacao(df_calculos, "maturidadePix")
    df_calculos = normalizacao(df_calculos, "crescimentoPopulacional")
    df_calculos = normalizacao(df_calculos, "totalHabitantes")
    df_calculos = normalizacao(df_calculos, "bonusDemografico")

    # --- Limpeza final de segurança ---
    df_calculos = df_calculos.replace([np.inf, -np.inf], np.nan).fillna(0)

    return df_calculos[["ano_mes", "regiao", "uf", "maturidadePix", "crescimentoPopulacional", "totalHabitantes", "bonusDemografico"]]