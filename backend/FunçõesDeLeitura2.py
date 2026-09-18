def ler_json(url, SESSION, timeout = 5, chave = None, funcao_tratamento = None, filtro_colunas = None):
  resposta = baixar_com_retry(url, SESSION, timeout)
  if resposta is None:
    return

  json = resposta.json()

  if(chave and chave in json):
    df = pd.DataFrame(json[chave])
  else:
    df = pd.DataFrame(json)

  if filtro_colunas:
    df = df[filtro_colunas]
  if funcao_tratamento:
    return funcao_tratamento(df)

  return df