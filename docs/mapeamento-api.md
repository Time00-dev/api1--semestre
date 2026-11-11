# Mapeamento da API SCR por Sub-Região

## Objetivo
Relacionar as colunas utilizadas atualmente no pipeline SCR com os campos disponíveis na API SCR por Sub-Região do Banco Central, destacando correspondências e diferenças.

## Nova API
- Serviço: SCR por sub-região — V1
- Documentação: https://olinda.bcb.gov.br/olinda/servico/scr_sub_regiao/versao/v1/documentacao
- OData: https://olinda.bcb.gov.br/olinda/servico/scr_sub_regiao/versao/v1/odata/
- Consulta testada: `scr_sub_regiao(DataBase=202608)?$format=json&$top=5`
- Data-base do exemplo: `202608` (agosto de 2026)
- Formato: JSON OData; os registros aparecem no array `value`.

## Campos identificados na documentação

| Campo | Tipo | Descrição |
|---|---|---|
| `DATA_BASE` | Inteiro | Ano e mês de referência (`AAAAMM`) |
| `CLIENTE` | Texto | Pessoa Física (PF) ou Pessoa Jurídica (PJ) |
| `ESTADO` | Texto | Unidade da Federação |
| `SUB_REGIAO` | Texto | Dois primeiros dígitos do CEP de residência do cliente |
| `MODALIDADE` | Texto | Modalidade de crédito |
| `RISCO` | Texto | Classificação de risco da operação |
| `OPERACOES` | Inteiro | Quantidade total de operações |
| `CARTEIRA` | Decimal | Valor da carteira ativa |
| `A_VENCER_ATE_90_DIAS` | Decimal | Créditos a vencer até 90 dias |
| `A_VENCER_DE_91_A_360_DIAS` | Decimal | Créditos a vencer de 91 até 360 dias |
| `A_VENCER_DE_361_A_1080_DIAS` | Decimal | Créditos a vencer de 361 até 1.080 dias |
| `A_VENCER_DE_1081_A_1800_DIAS` | Decimal | Créditos a vencer de 1.081 até 1.800 dias |
| `A_VENCER_DE_1801_A_5400_DIAS` | Decimal | Créditos a vencer de 1.801 até 5.400 dias |
| `A_VENCER_ACIMA_DE_5400_DIAS` | Decimal | Créditos a vencer acima de 5.400 dias |
| `VENCIDO_ACIMA_DE_15_DIAS` | Decimal | Créditos vencidos acima de 15 dias |

## Mapeamento das colunas atuais

| Coluna atual | Campo na API | Endpoint | Observações |
|---|---|---|---|
| `data_base` | `DATA_BASE` | `scr_sub_regiao(DataBase=...)` | Correspondência conceitual direta; formato `AAAAMM`. |
| `uf` | `ESTADO` | `scr_sub_regiao(DataBase=...)` | Correspondência conceitual direta; a API retorna a sigla da UF. |
| `porte` | — | `scr_sub_regiao(DataBase=...)` | Não foi identificado campo equivalente na documentação consultada. |
| `cliente` | `CLIENTE` | `scr_sub_regiao(DataBase=...)` | Correspondência conceitual direta (PF/PJ). |
| `modalidade` | `MODALIDADE` | `scr_sub_regiao(DataBase=...)` | Correspondência conceitual direta. |
| `carteira_inadimplencia` | — | `scr_sub_regiao(DataBase=...)` | Não há equivalência direta confirmada. |
| `carteira_vencida` | `VENCIDO_ACIMA_DE_15_DIAS` (parcial) | `scr_sub_regiao(DataBase=...)` | Não considerar equivalência exata sem validar a definição da coluna antiga. |
| `carteira_ativa` | `CARTEIRA` (provável) | `scr_sub_regiao(DataBase=...)` | A descrição da API é “Valor da carteira ativa”; validar unidade e agregação. |
| `vencido_15_a_60_dias` | — | `scr_sub_regiao(DataBase=...)` | A API apresentada não separa essa faixa; fornece vencidos acima de 15 dias de forma agregada. |
| `vencido_61_a_90_dias` | — | `scr_sub_regiao(DataBase=...)` | Não foi identificado campo equivalente separado. |
| `vencido_acima_de_90_dias` | — | `scr_sub_regiao(DataBase=...)` | Não foi identificado campo equivalente separado. |

## Campos adicionais úteis
- `SUB_REGIAO`: dimensão geográfica baseada nos dois primeiros dígitos do CEP residencial.
- `RISCO`: classificação de risco da operação.
- `OPERACOES`: quantidade total de operações.
- `A_VENCER_ATE_90_DIAS`, `A_VENCER_DE_91_A_360_DIAS`, `A_VENCER_DE_361_A_1080_DIAS`, `A_VENCER_DE_1081_A_1800_DIAS`, `A_VENCER_DE_1801_A_5400_DIAS` e `A_VENCER_ACIMA_DE_5400_DIAS`: detalhamento das faixas de crédito a vencer.

## Exemplo de resposta real

Trecho de um registro observado na resposta JSON da consulta com `DataBase=202608` e `$top=5`:

```json
{
  "DATA_BASE": 202608,
  "CLIENTE": "PJ",
  "ESTADO": "MG",
  "SUB_REGIAO": "36",
  "MODALIDADE": "Financiamento de Infraestrutura/Desenvolvimento/Projeto e Outros",
  "RISCO": "N/D",
  "OPERACOES": 4459,
  "CARTEIRA": 2668863.63,
  "A_VENCER_ATE_90_DIAS": 165495.31,
  "A_VENCER_DE_91_A_360_DIAS": 436367.19,
  "A_VENCER_DE_361_A_1080_DIAS": 870114.50,
  "A_VENCER_DE_1081_A_1800_DIAS": 428147.65,
  "A_VENCER_DE_1801_A_5400_DIAS": 670311.90,
  "A_VENCER_ACIMA_DE_5400_DIAS": 799990.56,
  "VENCIDO_ACIMA_DE_15_DIAS": 18436.39
}
```

A resposta completa contém metadados OData e outros registros no array `value`.

## Observações e pendências
1. `SUB_REGIAO` não deve ser confundido com `ESTADO`: representa os dois primeiros dígitos do CEP de residência.
2. A nova API permite granularidade por data-base, cliente, estado, sub-região, modalidade e risco.
3. `VENCIDO_ACIMA_DE_15_DIAS` não equivale exatamente às antigas faixas de vencimento de 15–60, 61–90 e acima de 90 dias; não é possível reconstruir essas faixas a partir desse campo agregado.
4. Não foi identificado campo de porte na API documentada.
5. Antes de substituir a fonte antiga, validar unidades monetárias, regras de agregação e tratamento de valores ausentes.
6. `DataBase` é parâmetro obrigatório, inteiro no formato `AAAAMM`.

## Consulta reproduzível

```text
https://olinda.bcb.gov.br/olinda/servico/scr_sub_regiao/versao/v1/odata/scr_sub_regiao(DataBase=202608)?$format=json&$top=5
```
