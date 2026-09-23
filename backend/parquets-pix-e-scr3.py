def construir_df_scr_pix():
  chunks_pix = []
  chunks_scr = []

  #Padroniza o parquet pix por chunk
  tabela_pix = pq.ParquetFile('/content/dados/pix_transacoes.parquet')

  for batch in tabela_pix.iter_batches(batch_size=100000):
    chunks_pix.append(padronizar_df_pix(batch.to_pandas()))
  df_pix = pd.concat(chunks_pix, ignore_index=True)

  df_pix = df_pix.groupby(
      ["ano_mes", "regiao", "uf", "tipo", "metrica", "origem"],
      observed=True
  )["valor"].sum().reset_index()
  df_pix["classe"] = pd.NA

  #Padroniza o parquet scr por chunk
  tabela_scr = pq.ParquetFile('/content/dados/scr_data.parquet')

  for batch in tabela_scr.iter_batches(batch_size=100000):
    chunks_scr.append(padronizar_df_scr(batch.to_pandas()))
  df_scr = pd.concat(chunks_scr, ignore_index=True)

  df_scr = df_scr.groupby(
      ["ano_mes", "regiao", "uf", "tipo", "classe", "metrica", "origem"],
      observed=True
  )["valor"].sum().reset_index()

  df_pix["ano_mes"] = df_pix["ano_mes"].astype(str)
  df_scr["ano_mes"] = df_scr["ano_mes"].astype(str)

  #une os dois parquets em um individual
  df_scr_pix = pd.concat([df_scr, df_pix], ignore_index=True)

  salvar_parquet(df_scr_pix, "scr_pix")
