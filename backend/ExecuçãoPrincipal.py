# --- Extração e Pré-Processamento ---
processar()[cite: 1]

construir_df_scr_pix()[cite: 1]
construir_df_ibge()[cite: 1]

df_scr_pix = extract_data('/content/dados/scr_pix.parquet')[cite: 1]
df_ibge = extract_data('/content/dados/ibge.parquet')[cite: 1]

df_eixo_i = calcular_eixo_i(df_scr_pix, df_ibge)[cite: 1]
df_eixo_ii = calcular_eixo_ii(df_scr_pix, df_ibge)[cite: 1]

df_ibge.drop(columns=["bonusDemografico"], inplace=True)[cite: 1]

# --- Limpeza de segurança contra NaNs e infinitos antes do envio ---
df_eixo_i = df_eixo_i.replace([np.inf, -np.inf], np.nan).fillna(0)
df_eixo_ii = df_eixo_ii.replace([np.inf, -np.inf], np.nan).fillna(0)
df_scr_pix = df_scr_pix.replace([np.inf, -np.inf], np.nan).fillna(0)
df_ibge = df_ibge.replace([np.inf, -np.inf], np.nan).fillna(0)

# --- Envio das rotas ---                                
enviar("/data/credit-risk", df_eixo_i.to_dict(orient='records'))[cite: 1]
enviar("/data/inclusion-expansion", df_eixo_ii.to_dict(orient='records'))[cite: 1]
enviar("/data/pix-structure", df_scr_pix.to_dict(orient='records'))[cite: 1]
enviar("/data/ibge-structure", df_ibge.to_dict(orient='records'))[cite:1]
