def validar_consistencia_saldos(df):
    """Função para checar se a soma dos saldos por modalidade é igual à carteira ativa total."""
    # 1. Filtra registros de carteira ativa
    df_ativa = df[df["metrica"] == "carteira_ativa"]

    # 2. Agrupa por modalidade e calcula a soma total
    soma_modalidades = (
        df_ativa.groupby(["ano_mes", "uf", "modalidade"])["valor"]
        .sum()
        .groupby(["ano_mes", "uf"])
        .sum()
        .reset_index(name="soma_modalidades")
    )

    # 3. Obtém o total da carteira ativa informado para o período/UF
    total_carteira = (
        df_ativa.groupby(["ano_mes", "uf"])["valor"]
        .sum()
        .reset_index(name="total_carteira_ativa")
    )

    # 4. Cruza e valida a diferença
    checagem = pd.merge(soma_modalidades, total_carteira, on=["ano_mes", "uf"])
    checagem["diferenca"] = (
        checagem["soma_modalidades"] - checagem["total_carteira_ativa"]
    ).round(2)

    inconsistencias = checagem[checagem["diferenca"] != 0]

    if not inconsistencias.empty:
        print(
            f"[VALIÇÃO] Encontradas {len(inconsistencias)} inconsistências entre modalidades e carteira ativa!"
        )
    else:
        print(
            "[VALIÇÃO] Saldos entre modalidades e carteira ativa estão 100% consistentes!"
        )


def padronizar_df_scr(df_scr):
    df_scr = df_scr.rename(columns={"data_base": "ano_mes", "porte": "classe"})

    df_scr["tipo"] = df_scr["cliente"].map({"PF": "pf"}).fillna("pj")

    # Inclui 'modalidade' id_vars para preservar o detalhamento das modalidades
    df_scr = df_scr.melt(
        id_vars=["ano_mes", "regiao", "uf", "tipo", "classe", "modalidade"],
        value_vars=[
            "carteira_inadimplencia",
            "carteira_vencida",
            "carteira_ativa",
            "vencido_acima_de_90_dias",
        ],
        var_name="metrica",
        value_name="valor",
    )

    df_scr["origem"] = "scr"

    validar_consistencia_saldos(df_scr)

    for col in ["tipo", "classe", "origem", "metrica", "uf", "modalidade"]:
        if col in df_scr.columns:
            df_scr[col] = df_scr[col].astype("category")

    df_scr = (
        df_scr.groupby(
            [
                "ano_mes",
                "regiao",
                "uf",
                "tipo",
                "classe",
                "modalidade",
                "metrica",
                "origem",
            ],
            observed=True,
        )["valor"]
        .sum()
        .reset_index()
    )

    return df_scr[[
        "ano_mes",
        "regiao",
        "uf",
        "tipo",
        "classe",
        "metrica",
        "origem",
        "valor",
    ]]