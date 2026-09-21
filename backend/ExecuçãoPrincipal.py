# --- Extração e Pré-Processamento ---
processar()

construir_df_scr_pix()
construir_df_ibge()

df_scr_pix = extract_data('/content/dados/scr_pix.parquet')
df_ibge = extract_data('/content/dados/ibge.parquet')

df_eixo_i = calcular_eixo_i(df_scr_pix, df_ibge)
df_eixo_ii = calcular_eixo_ii(df_scr_pix, df_ibge)

df_ibge.drop(columns=["bonusDemografico"], inplace=True)

enviar("/data/credit-risk", df_eixo_i.to_dict(orient='records'))
enviar("/data/inclusion-expansion", df_eixo_ii.to_dict(orient='records'))
enviar("/data/pix-structure", df_scr_pix.to_dict(orient='records'))
enviar("/data/ibge-structure", df_ibge.to_dict(orient='records'))