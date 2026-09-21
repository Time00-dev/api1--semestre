filtro = ["ano_mes", "regiao", "uf"]

def agrupar_metrica(df, metrica, filtro_extra=None):
    mask = df["metrica"] == metrica
    if filtro_extra is not None:
        mask &= filtro_extra
    return df[mask].groupby(filtro)["valor"].sum()