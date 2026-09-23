def calcular_eixo_i(df_scr_pix_base, df_ibge_base):
    df_scr_pix = df_scr_pix_base.copy()[cite: 1]
    df_ibge = df_ibge_base.copy()[cite: 1]

    # --- Extrai ano e merge com IBGE ---
    df_scr_pix["ano"] = df_scr_pix["ano_mes"].astype(str).str[:4][cite: 1]

    df_calculos = df_scr_pix.merge(
        df_ibge[["ano", "regiao", "uf", "taxa_escolarizacao"]],
        on=["ano", "regiao", "uf"],
        how="inner"
    ).drop(columns=["ano"])[cite: 1]

    df_calculos["taxa_escolarizacao"] = (
        df_calculos.groupby("uf")["taxa_escolarizacao"]
        .transform(lambda x: x.ffill().bfill())
    )[cite: 1]

    # --- Agrupamento das métricas SCR ---
    df_metricas = pd.concat([
        agrupar_metrica(df_calculos, "carteira_vencida").rename("carteira_vencida"),
        agrupar_metrica(df_calculos, "carteira_ativa").rename("carteira_ativa"),
        agrupar_metrica(df_calculos, "carteira_ativa", df_calculos["classe"].isin(["D", "E"])).rename("carteira_ativa_classes_de"),
        agrupar_metrica(df_calculos, "vencido_15_a_60_dias").rename("vencido_15_a_60_dias"),
        agrupar_metrica(df_calculos, "vencido_61_a_90_dias").rename("vencido_61_a_90_dias"),
        agrupar_metrica(df_calculos, "vencido_acima_de_90_dias").rename("vencido_acima_de_90_dias"),[cite: 1]
    ], axis=1).reset_index()

    df_calculos = (
        df_calculos[["ano_mes", "regiao", "uf", "taxa_escolarizacao"]]
        .drop_duplicates()
        .merge(df_metricas, on=filtro, how="left")
    )[cite: 1]

    # --- Soma dos atrasos a partir de 15 dias ---
    df_calculos["total_vencido_15_mais"] = (
        df_calculos["vencido_15_a_60_dias"].fillna(0) +
        df_calculos["vencido_61_a_90_dias"].fillna(0) +
        df_calculos["vencido_acima_de_90_dias"].fillna(0
    )
      
    # --- Cálculo dos indicadores ---
    df_calculos["inadimplenciaReal"]    = df_calculos["carteira_vencida"] / df_calculos["carteira_ativa"]
    df_calculos["fragilidadeRenda"]     = df_calculos["carteira_ativa_classes_de"] / df_calculos["carteira_ativa"]
    df_calculos["agingDivida"]          = df_calculos["total_vencido_15_mais"] / df_calculos["carteira_vencida"]
    df_calculos["vulnerabilidadeSocial"] = 1 - df_calculos["taxa_escolarizacao"][cite: 1]

    # --- Normalização e limpeza de NaNs/Infs ---
    df_calculos = normalizacao(df_calculos, "inadimplenciaReal")[cite: 1]
    df_calculos = normalizacao(df_calculos, "fragilidadeRenda")[cite: 1]
    df_calculos = normalizacao(df_calculos, "agingDivida")[cite: 1]
    df_calculos = normalizacao(df_calculos, "vulnerabilidadeSocial")[cite: 1]

    # --- Garante que não hajam valores inválidos antes de retornar
    df_calculos = df_calculos.replace([np.inf, -np.inf], np.nan).fillna(0)

    return df_calculos[["ano_mes", "regiao", "uf", "inadimplenciaReal", "fragilidadeRenda", "agingDivida", "vulnerabilidadeSocial"]][cite: 1]
