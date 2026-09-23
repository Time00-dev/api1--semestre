def padronizar_df_scr(df_scr):
    df_scr = df_scr.rename(columns={"data_base": "ano_mes", "porte": "classe"})

    df_scr["tipo"] = df_scr["cliente"].map({"PF": "pf"}).fillna("pj")

    df_scr = df_scr.melt(
        id_vars=["ano_mes", "regiao", "uf", "tipo", "classe"],
        value_vars=["carteira_inadimplencia", "carteira_vencida", "carteira_ativa", "vencido_acima_de_90_dias"],
        var_name="metrica",
        value_name="valor"
    )

    df_scr["origem"] = "scr"

    for col in ["tipo", "classe", "origem", "metrica", "uf"]:
        if col in df_scr.columns:
            df_scr[col] = df_scr[col].astype("category")

    df_scr = df_scr.groupby(
      ["ano_mes", "regiao", "uf", "tipo", "classe", "metrica", "origem"],
      observed=True
      )["valor"].sum().reset_index()

    return df_scr[["ano_mes", "regiao", "uf", "tipo", "classe", "metrica", "origem", "valor"]]
