def processar_url_pix(args):
    url, SESSION = args
    return ler_json(url=url, SESSION=SESSION, timeout=10, chave="value", funcao_tratamento=tratamento_pix)

def ler_pix(SESSION):
    anos_meses = gerar_anos_meses_filtrado()

    URLS_PIX = [URL_PIX_API.replace("<ANO_MES>", ano_mes) for ano_mes in anos_meses]

    args = [(url, SESSION) for url in URLS_PIX]
    with ThreadPoolExecutor() as executor:
        resultado = list(tqdm(executor.map(processar_url_pix, args), total=len(URLS_PIX), desc="Baixando arquivos pix..."))

    if not any(r is not None and not r.empty for r in resultado):
        print("Nenhum dado do PIX encontrado.")
        return

    df = pd.concat([r for r in resultado if r is not None and not r.empty], ignore_index=True)
    print(f"Lido PIX: {df.shape[0]} linhas, {df.shape[1]} colunas")
    salvar_parquet(df, TABLE_PIX)