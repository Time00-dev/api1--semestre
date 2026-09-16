def calculo_idade():
  #---populacao por idade
  df_idade = pd.read_parquet('/content/dados/populacao_por_idade.parquet')

  df_idade["idade_ponderada"] = df_idade["idade"] * df_idade["valor"]

  df_idade = (
      df_idade.groupby(["ano", "regiao", "uf"])
      .agg(
          soma_idade=("idade_ponderada", "sum"),
          soma_pop=("valor", "sum")
      )
      .reset_index()
  )

  df_idade["idade_media"] = df_idade["soma_idade"] / df_idade["soma_pop"]

  df_idade["idade_max"] = df_idade.groupby("ano")["idade_media"].transform("max")

  df_idade["bonusDemografico"] = df_idade["idade_max"] - df_idade["idade_media"]

  return df_idade[["ano", "regiao", "uf", "bonusDemografico"]]