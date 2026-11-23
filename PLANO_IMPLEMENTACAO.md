# Negado pelo Banco — painel de crédito regional

Direção aprovada em 23/11/2026. O painel abre em dados reais e organiza a análise por competência, sub-região e comparação. Linear Insights orienta a seleção sincronizada, Koyfin a hierarquia de gráfico e tabela, Electricity Maps a ficha territorial e Data Commons a explicação com evidências.

- Visão geral com dispersão, ranking, resumo e seleção. Em celular, ranking precede o gráfico e a ficha é acessível por toque.
- Exploração com filtros, busca e ordenação. Comparação de até cinco sub-regiões, fichas, histórico, indicadores e metodologia.
- React e TypeScript com Vite, Chart.js e o contrato Flask existente. Seleção e período compartilháveis pela URL. Build estático para GitHub Pages. API de IA no Flask, com configuração opcional do servidor.
- A IA explica registros consultados pelo servidor, com links que reproduzem o recorte. Resumo da base continua disponível em caso de erro ou ausência de credenciais. O limite de chamadas deve ser configurado antes de habilitar a chave.
- Divergência identificada na base publicada: fragilidade recebe 1 a partir de janeiro de 2025 em registros antigos. O frontend mantém score e posição publicados e explicita a divergência. A origem do lote precisa de validação antes de tratá-lo como revisado.
- Aceite local: dados reais, estados de erro e ausência, navegação por teclado, seleção e comparação, gráficos e tabelas sincronizados, IA com contexto e citações, layouts de desktop e celular. Publicação depende da revisão da prévia.

## Verificação da prévia

- Build TypeScript/Vite e 52 testes de backend executados. A análise usa registros reais consultados pelo servidor. Transporte da OpenAI simulado nos testes, pois não há chave configurada na prévia.
- Chromium: desktop de 1440 px, celular emulado a 390 px e verificação de rolagem horizontal a 320 px. Foram exercitados troca de competência, seleção, ficha, busca, comparação, tabela do gráfico e abertura do assistente.
- Base publicada de outubro de 2026: 104 sub-regiões em 27 UFs. A divergência de fragilidade permanece sinalizada.
