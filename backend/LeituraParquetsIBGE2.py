def construir_df_ibge():
  #---escolarizacao
  df_escolarizacao = extract_data('/content/dados/taxa_escolarizacao.parquet')

  df_escolarizacao = df_escolarizacao.groupby(  #realiza a média de valores com mesmo ano, regiao e uf
      ["ano", "regiao", "uf"],
      observed=True)["valor"].mean().reset_index()
  df_escolarizacao = df_escolarizacao.rename(columns={"valor": "taxa_escolarizacao"})

  #---censo demografico
  df_censo_demografico = extract_data('/content/dados/censo_demografico.parquet')

  #separa colunas por metrica
  df_censo_demografico = df_censo_demografico.pivot_table(
      index=["ano", "regiao", "uf"],
      columns="D2N",
      values="valor").reset_index()

  df_censo_demografico = df_censo_demografico.rename(columns={
      "População residente": "populacao_residente",
      "Taxa de crescimento geométrico": "taxa_crescimento",
      "Variação absoluta da população residente 2010 compatibilizada": "variacao_populacao"
  })

  df_idade = calculo_idade()

  #arruma porcentagem
  df_censo_demografico["taxa_crescimento"] = df_censo_demografico["taxa_crescimento"]/100

  df_censo_demografico.columns.name = None

  df_ibge = df_escolarizacao.merge(
      df_censo_demografico,
      on=["ano", "regiao", "uf"],
      how="left").merge(
      df_idade,
      on=["ano", "regiao", "uf"],
      how="left")

  df_ibge = (
      df_ibge.sort_values(["uf", "regiao", "ano"])
      .ffill()
      .reset_index()
  )

  salvar_parquet(df_ibge, "ibge")