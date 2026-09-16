def tratamento_taxa_escolarizacao(df):
  df = limpar_nulos(df)
  df = limpeza_string(df, ["D1N", "D3N"])
  df = converter_uf(df, "D1N")
  df = converter_uf_para_macro_regiao(df, "uf")
  df = converter_porcentagem(df, "V")
  df = df.rename(columns={"D3N": "ano", "V": "valor"})
  return df

def tratamento_censo_demografico(df):
  df = limpar_nulos(df)
  df["V"] = df["V"].astype(str).str.replace(".", "", regex=False).str.replace(",", ".", regex=False)
  df = converter_numerico(df, "V")
  df = limpeza_string(df, ["D1N", "D3N"])
  df = converter_uf(df, "D1N")
  df = converter_uf_para_macro_regiao(df, "uf")
  df = df.rename(columns={"D3N": "ano", "V": "valor"})
  return df

def tratamento_populacao_por_idade(df):
  df = limpar_nulos(df)
  df = limpeza_string(df, ["D1N", "D3N", "D5N"])
  df = converter_numerico(df, "V")
  df = converter_uf(df, "D1N")
  df = converter_uf_para_macro_regiao(df, "uf")
  df = df.rename(columns={"D3N": "ano", "V": "valor", "D5N": "idade"})
  df["idade"] = df["idade"].map(map_idade_media)
  return df