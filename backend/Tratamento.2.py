def tratamento_scr(df):
    # 1. Limpeza básica de textos, datas, regiões e portes salariais
    df = limpar_nulos(df)
    df = limpeza_string(df, ["data_base", "uf", "porte"])
    df = formatar_data(df, ["data_base"])
    df = converter_uf_para_macro_regiao(df, "uf")
    df = converter_nivel_salario(df, "porte")

    # 2. Identifica dinamicamente todas as colunas de carteira e atrasos (vencido_)
    colunas_financeiras = [
        col for col in df.columns
        if col.startswith("carteira_") or col.startswith("vencido_")
    ]

    # 3. Formata os números (troca vírgula por ponto e converte para numérico)
    df = formatar_numero(df, colunas_financeiras)

    # 4. TRATAMENTO DE NULOS: ausência de registro = R$ 0.00 de atraso/carteira
    df[colunas_financeiras] = df[colunas_financeiras].fillna(0.0)
    return df