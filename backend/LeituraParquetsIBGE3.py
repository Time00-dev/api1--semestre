def normalizacao(df, coluna):
  df[coluna + "_max"] = df.groupby("ano_mes")[coluna].transform("max")
  df[coluna + "_min"] = df.groupby("ano_mes")[coluna].transform("min")
  df[coluna] = (1 + (df[coluna] - df[coluna + "_min"]) / (df[coluna + "_max"] - df[coluna + "_min"]) * 4).round(2)
  df = df.drop(columns=[coluna + "_max", coluna + "_min"])

  return df