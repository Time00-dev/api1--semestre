def ler_urls_ibge(SESSION):
    funcoes_tratamento_ibge = [tratamento_taxa_escolarizacao, tratamento_censo_demografico, tratamento_populacao_por_idade]
    tratamentos = {k: v for k, v in zip(TABLES_IBGE, funcoes_tratamento_ibge)}

    for table_name, item in LINKS_IBGE.items():
        print(f"Baixando {table_name}...")
        df = ler_json(item["url"], SESSION=SESSION, timeout=3, filtro_colunas=item["use_cols"], funcao_tratamento=tratamentos[table_name])

        if df is not None and not df.empty:
            salvar_parquet(df, table_name)
        else:
            print(f"Nenhum dado encontrado para {table_name}.")