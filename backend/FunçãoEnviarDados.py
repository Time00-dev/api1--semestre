def enviar(rota, dados):
    url = URL_API_LOCAL + rota
    for item in dados:
        try:
            resposta = SESSION.post(url, json=item, timeout=15)
            if resposta.status_code != 201:
                print(f"Erro {resposta.status_code} em {rota}: {resposta.text}")
                break
        except Exception as e:
            print(f"Erro: {e}")
            break