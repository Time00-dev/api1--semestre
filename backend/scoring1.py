def extract_data(path:str):
    df = pd.read_parquet(path)
    return df