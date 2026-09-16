def tratamento_pix(df):
  df = limpar_nulos(df)
  df = limpeza_string(df, ["AnoMes"])
  df = converter_numerico(df, "VL_PagadorPF", "QT_PagadorPF", "VL_PagadorPJ", "QT_PagadorPJ", "QT_PES_PagadorPF", "QT_PES_PagadorPJ")
  df = converter_uf(df, "Estado_Ibge")
  df = converter_uf_para_macro_regiao(df, "uf")
  return df