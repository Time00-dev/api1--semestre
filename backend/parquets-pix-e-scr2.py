def padronizar_df_pix(df_pix):
    df_pix = df_pix.rename(columns={"AnoMes": "ano_mes"})

    df_pix = df_pix.melt(
        id_vars=["ano_mes", "regiao", "uf"],
        value_vars=["VL_PagadorPF", "QT_PagadorPF", "VL_PagadorPJ", "QT_PagadorPJ", "QT_PES_PagadorPF", "QT_PES_PagadorPJ"],
        var_name="metrica_raw",
        value_name="valor"
    )

    df_pix["tipo"] = df_pix["metrica_raw"].str.endswith("PF").map({True: "pf", False: "pj"})

    df_pix["metrica"] = np.select(
        [df_pix["metrica_raw"].str.contains("VL"),
         df_pix["metrica_raw"].str.contains("QT_PES"),
         df_pix["metrica_raw"].str.contains("QT")],
        ["vl_pagador", "qt_pes_pagador", "qt_pagador"],
        default="outros"
    )

    df_pix["origem"] = "pix"

    df_pix = df_pix.groupby(
        ["ano_mes", "regiao", "uf", "tipo", "metrica", "origem"],
        observed=True
    )["valor"].sum().reset_index()

    df_pix["classe"] = pd.NA  # adiciona depois do groupby

    for col in ["tipo", "origem", "metrica", "uf", "regiao"]:
        df_pix[col] = df_pix[col].astype("category")

    return df_pix[["ano_mes", "regiao", "uf", "tipo", "classe", "metrica", "origem", "valor"]]
