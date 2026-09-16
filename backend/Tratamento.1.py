#Funções gerais de tratamento de dados

def limpeza_string(df, colunas=None):
    if colunas is None:
        colunas = df.select_dtypes(include="object").columns.tolist()
    else:
        colunas = [col for col in colunas if col in df.columns and df[col].dtype == "object"]

    if not colunas:
        return df

    for col in colunas:
        df[col] = df[col].str.strip()
    return df

def converter_numerico(df, *colunas):
    for col in colunas:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    return df

def limpar_nulos(df):
    numericas = df.select_dtypes(include="number").columns
    df[numericas] = df[numericas].fillna(df[numericas].median())

    categoricas = df.select_dtypes(include="object").columns
    df[categoricas] = df[categoricas].fillna("NAO_INFORMADO")
    return df

def formatar_data(df, colunas, formato="%Y-%m-%d"):
    if not colunas: return df
    if isinstance(colunas, str):
        colunas = [colunas]
    for col in colunas:
        df[col] = pd.to_datetime(df[col], format=formato).dt.strftime("%Y%m")
    return df

def formatar_numero(df, colunas):
    if isinstance(colunas, str):
        colunas = [colunas]
    for col in colunas:
        df[col] = pd.to_numeric(df[col].str.replace(",", "."), errors="coerce")
    return df

def converter_nivel_salario(df, coluna):
  df[coluna] = df[coluna].map(NIVEIS_SALARIO)
  return df

def converter_uf(df, coluna):
  estados_brasil = {
    "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM",
    "Bahia": "BA", "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES",
    "Goiás": "GO", "Maranhão": "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS",
    "Minas Gerais": "MG", "Pará": "PA", "Paraíba": "PB", "Paraná": "PR",
    "Pernambuco": "PE", "Piauí": "PI", "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN",
    "Rio Grande do Sul": "RS", "Rondônia": "RO", "Roraima": "RR", "Santa Catarina": "SC",
    "São Paulo": "SP", "Sergipe": "SE", "Tocantins": "TO",
    11: "RO", 12: "AC", 13: "AM", 14: "RR",
    15: "PA", 16: "AP", 17: "TO", 21: "MA",
    22: "PI", 23: "CE", 24: "RN", 25: "PB",
    26: "PE", 27: "AL", 28: "SE", 29: "BA",
    31: "MG", 32: "ES", 33: "RJ", 35: "SP",
    41: "PR", 42: "SC", 43: "RS", 50: "MS",
    51: "MT", 52: "GO", 53: "DF"
  }

  df = df.rename(columns = {
      coluna: "uf"
  })
  df["uf"] = df["uf"].map(estados_brasil)

  return df

def converter_uf_para_macro_regiao(df, coluna):
  mapeamento_regioes = {
      'AC': 'Norte', 'AM': 'Norte', 'AP': 'Norte', 'PA': 'Norte', 'RO': 'Norte', 'RR': 'Norte', 'TO': 'Norte',
      'AL': 'Nordeste', 'BA': 'Nordeste', 'CE': 'Nordeste', 'MA': 'Nordeste', 'PB': 'Nordeste', 'PE': 'Nordeste',
      'PI': 'Nordeste', 'RN': 'Nordeste', 'SE': 'Nordeste',
      'DF': 'Centro-Oeste', 'GO': 'Centro-Oeste', 'MS': 'Centro-Oeste', 'MT': 'Centro-Oeste',
      'ES': 'Sudeste', 'MG': 'Sudeste', 'RJ': 'Sudeste', 'SP': 'Sudeste',
      'PR': 'Sul', 'RS': 'Sul', 'SC': 'Sul'
  }

  df['regiao'] = df[coluna].map(mapeamento_regioes)

  return df

def converter_porcentagem(df, coluna):
  df[coluna] = pd.to_numeric(df[coluna], errors='coerce') / 100
  return df