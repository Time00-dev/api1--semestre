# Estudo de interação do painel Time00

Objetivo. Em segundos, encontrar a competência e o território, interpretar o resultado e seguir para a ficha ou a comparação.

## Observações da prévia anterior

- A navegação horizontal compete com marca, filtros e tema. Em 320 px, qualquer item extra exige quebra ou rolagem.
- O seletor atual lista competência mês a mês ao longo de toda a série. Ele dificulta saltar de ano e esconde meses fora da base.
- Ranking, gráfico, seleção e seus botões ocupam zonas independentes. Em celular a ação fica distante da linha selecionada.
- A nota metodológica tem a aparência de uma condição operacional. O produto precisa permitir verificá-la junto da métrica e encaminhar à metodologia.
- Cores pontuais definidas nos componentes impediriam trocar de tema com consistência, especialmente no canvas dos gráficos.

## Referências verificadas

| Referência | Padrão pertinente | Decisão |
|---|---|---|
| [Carbon UI shell](https://www.carbondesignsystem.com/building-blocks/core/components/ui-shell-header/guidelines) | Separa navegação do produto de ações globais. | Trilho com nomes no desktop e seletor de página com ícone, nome e seleção no celular. |
| [Carbon Data table](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines) | Barra de filtros, ordenação no cabeçalho e ações de seleção agrupadas. | Buscar, filtrar e ordenar no mesmo lugar; comparação com contagem ao selecionar resultados. |
| [Metabase](https://www.metabase.com/docs/latest/dashboards/filters) | Mês e ano como filtro distinto, aplicável ao painel. | Cabeçalho com ano navegável e grade de meses disponíveis, com atalho para o último período. |
| [Linear Insights](https://linear.app/docs/insights) | Hover e seleção conectam o gráfico à tabela e ao detalhe. | Destaque por hover no ranking, seleção fixa por clique e opção de tabela equivalente. |
| [Carbon Themes](https://www.carbondesignsystem.com/building-blocks/foundations/themes/overview) | Papéis de cor com valores próprios por tema. | Tokens para texto, superfícies, estados e dataviz, incluindo canvas, formulários e assistente. |
| [WAI Tooltip Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) | A dica aparece no hover e no foco, sem receber foco. | Link com interrogação. Dica visível em hover/foco, clique e Enter levam à seção da metodologia. |

## Composição e aceite

- Infinito em duas linhas, com o ponto ciano no cruzamento, redesenhado a partir do avatar oficial do Time00.
- Panorama: a matriz ocupa a área de leitura principal no desktop. O ranking e a seleção ficam juntos. Em celular o ranking e o resultado vêm antes do gráfico. Textos de interface com 13–16 px sempre que possível; título com escala própria.
- As sub-regiões mantêm nome, filtros, score, risco e oportunidade. Ficha usa histórico e indicadores divididos em eixos. Comparação lê a evolução e as notas por critérios. Indicadores usam gráfico regional e ranking lado a lado, com histórico primeiro em tela estreita. Metodologia tem âncoras para consultar score, limites e fontes.
- Conferir desktop e celular em ambos os temas, anos e meses indisponíveis, fechamento por Escape, foco visível, preferências persistidas, troca de telas, tooltip e destino do link, seleção cruzada, tabela e contexto do assistente. Só depois apresentar a prévia local.

## Verificação da versão local

- Build de produção e 52 testes Flask concluídos.
- Chromium com dados reais em desktop a 1440 px e celular emulado a 390 px nos dois temas, além de checagem de largura a 320 px.
- Navegação, seleção de ano, troca de mês, retorno ao último mês, foco e Escape da nota, metodologia, ordenação, ficha, comparação e assistente exercitados.
- Contraste dos pares principais de texto, ações e seleção acima de 4,5:1 nos dois temas. Impeccable executado na entrada da prévia.
- O componente de IA usa a base real para o recorte. A prévia não tem credencial OpenAI e não gerou texto pelo provedor.

## Breadcrumb, marca e paleta

- [Primer Breadcrumbs](https://primer.style/product/components/breadcrumbs/) orienta o caminho compacto. Os níveis anteriores são links que preservam a competência. O último indica a página atual. A ficha mostra Panorama › Sub-regiões › território. Em tela estreita, o caminho fica abaixo do seletor de páginas.
- O símbolo usa os pixels do [avatar oficial do Time00.dev](https://github.com/Time00-dev). O SVG incorpora o JPEG original servido pelo GitHub e aplica um recorte e uma máscara de opacidade para retirar a placa. A geometria e o centro ciano vêm da imagem fonte.
- A paleta usa ciano e neutros. A dispersão diferencia as cinco regiões com formatos de pontos. As séries combinam formatos e padrões de linha para manter a leitura com duas famílias cromáticas.
- Verificados no Chromium os cantos transparentes e o centro ciano do símbolo, o caminho da ficha, o retorno à lista preservando outubro de 2026 e a renderização em desktop e celular nos dois temas.

## Primer no painel

A revisão usa Primer React para navegação, breadcrumb, botões, campos, opções de competência, alternância de visualização, seleção, paginação e carregamento. As tabelas HTML seguem a hierarquia do DataTable do Primer com números alinhados, cabeçalho de ordenação, ações de seleção e filtros nomeados. Busca, região e UF são preservados no link. No celular as colunas de apoio cedem lugar às notas essenciais na linha. A ficha é a ação principal da seleção do panorama. Os temas claro e dark dimmed usam os tokens oficiais com ciano como cor de ênfase da marca.

Referências: [Primer DataTable](https://primer.style/product/components/data-table/), [Primer Filter](https://primer.style/product/scenario-patterns/filter/) e [Primer Theming](https://primer.style/product/getting-started/react/theming/).


## Ficha, histórico e apresentação

A ficha agora exibe o score publicado como primeira informação, com faixa, posição no ranking e variação em relação à observação anterior. Panorama, ficha e comparação leem a mesma normalização. O histórico permite alternar entre score, risco e oportunidade. O gráfico oferece acesso aos valores em tabela.

O botão de compartilhamento abre um QR Code com o endereço público do Pages. O arquivo é estático e pode ser baixado para slides. Os códigos nas capturas de desktop e celular foram decodificados e conferidos. O endereço segue mostrando a versão ativa do Pages até que esta revisão seja publicada.

Referências: [Primer Dialog](https://primer.style/product/components/dialog/) e [Primer Data Visualization](https://primer.style/product/ui-patterns/data-visualization/).
