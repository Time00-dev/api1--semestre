def gerar_anos_meses_filtrado():
    data_atual = datetime.now()
    anos_meses = pd.date_range(start="2020-11-01", end=data_atual, freq="MS")
    lista_completa = anos_meses[:-1].strftime("%Y%m").tolist()

    return lista_completa