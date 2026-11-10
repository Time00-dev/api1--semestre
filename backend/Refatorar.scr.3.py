import pandas as pd

# Execução do pipeline de padronização
df_scr_pronto = padronizar_df_scr(df_scr)
df_pix_pronto = padronizar_df_pix(df_pix)

# Unificação das duas bases em um único DataFrame consolidado
df_consolidado = pd.concat(
    [df_scr_pronto, df_pix_pronto], ignore_index=True
)

# Exibição do resumo das categorias de crédito por modalidade e origem
print("--- Resumo por Origem e Categoria de Crédito ---")
print(
    df_consolidado.groupby(
        ["origem", "modalidade", "categoria_credito"], observed=True
    )["valor"].sum()
)