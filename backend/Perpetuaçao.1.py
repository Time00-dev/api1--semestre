def salvar_parquet(df, nome):
  caminho = PASTA / f"{nome}.parquet"
  df.to_parquet(caminho, index=False)
  print(f" --Salvo em: {caminho}")