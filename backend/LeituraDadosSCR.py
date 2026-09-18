def processar_url_scr(args):
    url, SESSION = args

    tqdm.write(f"> Baixando: {url.split('/')[-1]}...")

    resposta = baixar_com_retry(url, SESSION, 30)
    if resposta is None:
        return []

    dfs = []
    with zipfile.ZipFile(io.BytesIO(resposta.content)) as zf:
        csvs = [nome for nome in zf.namelist() if nome.endswith(".csv")]

        for nome_arquivo in csvs:
            with zf.open(nome_arquivo) as f:
                leitor = pd.read_csv(
                    f, sep=';', encoding="utf-8-sig", on_bad_lines="skip",
                    usecols=USECOLS_SCR, chunksize=50000
                )

                for i, chunk in enumerate(leitor):
                    df_tratado = tratamento_scr(chunk)

                    if not df_tratado.empty:
                        dfs.append(df_tratado)

    return dfs

def ler_scr(SESSION):
    ano_atual = datetime.now().year
    URLS_SCR_FILTRADAS = [f"https://www.bcb.gov.br/pda/desig/scrdata_{ano}.zip" for ano in range(2021, ano_atual + 1)]

    args = [(url, SESSION) for url in URLS_SCR_FILTRADAS]
    with ThreadPoolExecutor() as executor:
        resultados = list(tqdm(executor.map(processar_url_scr, args), total=len(URLS_SCR_FILTRADAS), desc="Baixando arquivos SRC"))

    dfs = [df for lista in resultados for df in lista]
    if not dfs:
        print("Nenhum dado do SCR encontrado.")
        return

    df_final = pd.concat(dfs, ignore_index=True)
    print(f"Lido SCR: {df_final.shape[0]} linhas, {df_final.shape[1]} colunas")
    salvar_parquet(df_final, TABLE_SCR)