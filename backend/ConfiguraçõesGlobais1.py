TABLE_SCR  = "scr_data"
TABLE_PIX  = "pix_transacoes"
TABLES_IBGE = ["taxa_escolarizacao", "censo_demografico", "populacao_por_idade"]

PASTA = Path("/content/dados")
PASTA.mkdir(exist_ok=True)

#Rodar com o localtunnel
URL_API_LOCAL = "https://safer-survivor-kerry-doctrine.trycloudflare.com"
SESSION = requests.Session()
SESSION.headers.update({"bypass-tunnel-reminder": "true"})

CHUNK_SIZE = 10000
MAX_GET_RETRIES = 5

USECOLS_SCR = ["data_base", "uf", "porte", "cliente",
    "carteira_inadimplencia", "carteira_vencida", "carteira_ativa", "vencido_15_a_60_dias", "vencido_61_a_90_dias", "vencido_acima_de_90_dias"]

ano_anterior = datetime.now().year - 1
URLS_SCR = [f"https://www.bcb.gov.br/pda/desig/scrdata_{ano}.zip" for ano in range(2021, ano_anterior+1)]

SCR_LIMITE_DADOS = 100000

NIVEIS_SALARIO = {
    # Salário Pessoa Física (PF)
    "Acima de 20 salários mínimos": "A",
    "Mais de 10 a 20 salários mínimos": "A",
    "Mais de 5 a 10 salários mínimos": "B",
    "Mais de 3 a 5 salários mínimos": "C",
    "Mais de 2 a 3 salários mínimos": "D",
    "Mais de 1 a 2 salários mínimos": "D",
    "Até 1 salário mínimo": "E",
    "Sem rendimento": "E",
    "a": "A",

    # Salário Pessoa Jurídica (PJ)
    "Grande": "A",
    "Médio": "B",
    "Pequeno": "C",
    "Micro": "D",
}

PIX_LIMITE_DADOS = 35000
URL_PIX_API = f"https://olinda.bcb.gov.br/olinda/servico/Pix_DadosAbertos/versao/v1/odata/TransacoesPixPorMunicipio(DataBase=@DataBase)?@DataBase='<ANO_MES>'&$top={PIX_LIMITE_DADOS}&$format=json&$select=AnoMes,Estado_Ibge,VL_PagadorPF,QT_PagadorPF,VL_PagadorPJ,QT_PagadorPJ,QT_PES_PagadorPF,QT_PES_PagadorPJ"

LINKS_IBGE = {
    "taxa_escolarizacao": {
      "url": "https://apisidra.ibge.gov.br/values/t/7138/n3/all/v/10276/p/last%203/c2/6794/c58/100052,108866/d/v10276%201?formato=json",
      "use_cols": ["V", "D1N", "D3N"]
    },
    "censo_demografico": {
        "url": "https://apisidra.ibge.gov.br/values/t/4709/n1/all/n2/all/n3/all/v/all/p/all/d/v10605%202/l/p,v,t?formato=json",
        "use_cols": ["V" ,"D1N", "D2N", "D3N"]
    },
    "populacao_por_idade": {
        "url": "https://apisidra.ibge.gov.br/values/t/9514/n3/all/v/allxp/p/all/c2/6794/c287/6653,49108,49109,60040,60041,93070,93084,93085,93086,93087,93088,93089,93090,93091,93092,93093,93095,93096,93097/c286/113635?formato=json",
        "use_cols": ["V", "D1N", "D3N", "D5N"]
    }
}

map_idade_media = {
    "0 a 4 anos": 2.0,
    "5 a 9 anos": 7.0,
    "10 a 14 anos": 12.0,
    "15 a 19 anos": 17.0,
    "20 a 24 anos": 22.0,
    "25 a 29 anos": 27.0,
    "30 a 34 anos": 32.0,
    "35 a 39 anos": 37.0,
    "40 a 44 anos": 42.0,
    "45 a 49 anos": 47.0,
    "50 a 54 anos": 52.0,
    "60 a 64 anos": 62.0,
    "65 a 69 anos": 67.0,
    "70 a 74 anos": 72.0,
    "80 a 84 anos": 82.0,
    "85 a 89 anos": 87.0,
    "90 a 94 anos": 92.0,
    "95 a 99 anos": 97.0,
    "100 anos ou mais": 100.0
}