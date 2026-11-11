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

  # [NOVO] Censo e idade só existem em anos de censo (2010, 2022), então não casam com os anos da escolarização.
  # Fica com o dado mais recente de cada UF (.last()) e tira a coluna "ano", para valer para todos os anos
  df_censo_demografico = (df_censo_demografico.sort_values("ano")
      .groupby(["regiao", "uf"]).last().reset_index().drop(columns=["ano"]))
  df_idade = (df_idade.sort_values("ano")
      .groupby(["regiao", "uf"]).last().reset_index().drop(columns=["ano"]))

  # [ALTERADO] Antes cruzava por ["ano", "regiao", "uf"]. Agora cruza só por ["regiao", "uf"]
  df_ibge = df_escolarizacao.merge(
      df_censo_demografico,
      on=["regiao", "uf"],
      how="left").merge(
      df_idade,
      on=["regiao", "uf"],
      how="left")

  # [ALTERADO] Ordena por UF, região e ano, agrupando por UF antes de aplicar fill/bfill;
  # Isso garante que o preenchimento de nulos use apenas dados do mesmo estado, sem vazar para outras UFs
  df_ibge = df_ibge.sort_values(["uf", "regiao", "ano"]).reset_index(drop=True)
  colunas_preencher = ["taxa_escolarizacao", "populacao_residente", "taxa_crescimento", "variacao_populacao", "bonusDemografico"]
  df_ibge[colunas_preencher] = df_ibge.groupby("uf")[colunas_preencher].transform(lambda x: x.ffill().bfill())

  salvar_parquet(df_ibge, "ibge")
