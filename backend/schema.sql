-- GJ00-59: resultados do notebook por mês, UF e sub-região (indicadores dos dois eixos + score).
-- Os nomes das colunas são os mesmos das chaves do JSON (frontend/dados/mock_sub_regioes.json).
-- NULL = sem dado. Rodar de novo não apaga nada (IF NOT EXISTS).
CREATE TABLE IF NOT EXISTS resultado_mensal (
  ano_mes    CHAR(6)     NOT NULL,  -- AAAAMM
  uf         CHAR(2)     NOT NULL,
  sub_regiao CHAR(2)     NOT NULL,  -- 2 primeiros dígitos do CEP, como texto ("01" mantém o zero)
  regiao          VARCHAR(20) NULL,
  nome_sub_regiao VARCHAR(80) NULL,

  -- Eixo I: risco de crédito (nota de 1 a 5, maior = pior)
  inadimplenciaReal     DECIMAL(3,2) NULL,
  fragilidadeRenda      DECIMAL(3,2) NULL,
  agingDivida           DECIMAL(3,2) NULL,
  vulnerabilidadeSocial DECIMAL(3,2) NULL,

  -- Eixo II: potencial de mercado (nota de 1 a 5, maior = melhor)
  maturidadePix           DECIMAL(3,2) NULL,
  crescimentoPopulacional DECIMAL(3,2) NULL,
  totalHabitantes         DECIMAL(3,2) NULL,
  bonusDemografico        DECIMAL(3,2) NULL,

  -- Score de Oportunidade e apoio ao aviso de "amostra pequena"
  score     DECIMAL(5,2) NULL,  -- 0 a 100
  faixa     VARCHAR(30)  NULL,
  ranking   INT          NULL,  -- posição no mês
  operacoes INT          NULL,
  peso      DECIMAL(4,3) NULL,  -- 0 a 1

  -- a sub-região sozinha não é única (o "69" existe em AC, AM e RR). Esta chave impede duplicatas
  PRIMARY KEY (ano_mes, uf, sub_regiao)
) DEFAULT CHARSET = utf8mb4;
