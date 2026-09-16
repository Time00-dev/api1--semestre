def processar():
    print(f"--- Iniciando Extração de Dados ---")

    SESSION = requests.Session()

    try:
        ler_scr(SESSION)
    except Exception as e:
        print(f"Erro ao ler SCR: {e}")

    try:
        ler_pix(SESSION)
    except Exception as e:
        print(f"Erro ao ler Pix: {e}")

    try:
        ler_urls_ibge(SESSION)
    except Exception as e:
        print(f"Erro ao ler IBGE: {e}")