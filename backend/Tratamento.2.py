def tratamento_scr(df):
  df = limpar_nulos(df)
  df = formatar_numero(df, ["carteira_inadimplencia", "carteira_vencida",
                            "carteira_ativa", "vencido_acima_de_90_dias"])

  df = limpeza_string(df, ["data_base", "uf", "porte"])
  df = formatar_data(df, ["data_base"])
  df = converter_uf_para_macro_regiao(df, "uf")
  df = converter_nivel_salario(df, "porte")
  return df