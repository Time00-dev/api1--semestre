def baixar_com_retry(url, SESSION, TIMEOUT):  #Leitura geral de arquivos
  primeria_tentativa = True
  for i in range(1, MAX_GET_RETRIES + 1): #Faz get com limite de tentativas
    try:
      resposta = SESSION.get(url, timeout=TIMEOUT) #Tenta em um tempo curto
      resposta.raise_for_status()
      resposta.encoding = "utf-8-sig"
      return resposta
    except Exception as e:
      if i < MAX_GET_RETRIES:
        pass
      else:
        print(f"Todas as {MAX_GET_RETRIES} tentativas falharam.")
        raise e
        return