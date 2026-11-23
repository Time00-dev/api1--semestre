# 🚀 Negado pelo Banco

### Crédito Inclusivo com Dados do Banco Central do Brasil

- [Abrir o painel no GitHub Pages](https://time00-dev.github.io/api1--semestre/)
- [Abrir o notebook no Google Colab](https://colab.research.google.com/drive/1jXD78zBT7EDTlG1bosBBgvayKodDTIVz?usp=sharing)

> Projeto desenvolvido pela equipe **Time00.dev** no curso de Desenvolvimento de Software Multiplataforma (DSM) da FATEC.

---

## 📌 Sobre o projeto

**Negado pelo Banco: Crédito Inclusivo com Dados do BCB** é um projeto desenvolvido no contexto da disciplina de **Aprendizagem por Projetos Integrados (API)** do 1º semestre de DSM.

O projeto busca transformar dados econômicos públicos disponibilizados pelo **Banco Central do Brasil (BCB)** em informações que possam auxiliar na identificação de oportunidades de crédito de forma mais inclusiva e responsável.

A solução parte da análise e evolução do projeto **RealIT**, desenvolvido por alunos veteranos da FATEC, utilizando engenharia reversa, refatoração e atualização de dados.

---

## 🎯 Desafio

Conceder crédito para populações historicamente recusadas por grandes instituições financeiras exige ir além da análise tradicional de risco.

O projeto busca explorar dados como:

- 💰 Volume de crédito
- 📉 Inadimplência
- 📊 Endividamento
- 📈 Crescimento da carteira de crédito

A partir desses indicadores, o projeto calcula um **Score de Oportunidade**, permitindo analisar diferentes regiões e identificar possíveis oportunidades de crédito.

---

## 🔎 Desenvolvimento

O projeto está organizado em três etapas principais.

### 1️⃣ Auditoria e leitura de código

- Análise do projeto RealIT
- Mapeamento do fluxo de dados
- Interpretação das variáveis utilizadas
- Execução e compreensão do ambiente no Google Colab

### 2️⃣ Atualização e validação

- Ingestão de séries recentes do Banco Central
- Tratamento e análise dos dados
- Avaliação e possíveis melhorias na fórmula do Score de Oportunidade
- Documentação do processo no Google Colab

### 3️⃣ Produto e visualização

- Desenvolvimento de uma interface web
- Visualização dos indicadores econômicos
- Apresentação dos rankings do Score de Oportunidade
- Interface intuitiva e responsiva

---

## 🛠️ Tecnologias

### Backend

![Python](https://img.shields.io/badge/Python-3+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)

### Banco de dados

![MariaDB](https://img.shields.io/badge/MariaDB-003545?style=for-the-badge&logo=mariadb&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

### Frontend

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

### Dados e desenvolvimento

![Google Colab](https://img.shields.io/badge/Google%20Colab-F9AB00?style=for-the-badge&logo=googlecolab&logoColor=black)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)

---

## Frontend e publicação

O painel usa React, TypeScript, Vite e Chart.js. Com Node.js 24, rode na raiz:

```powershell
npm --prefix frontend ci
npm --prefix frontend run build
```

O Flask serve o build em `frontend/dist/`. Em desenvolvimento, use `npm --prefix frontend run dev`
com o Flask na porta 5000. Para conferir o frontend contra uma API de dados pública autorizada,
defina `PREVIEW_DATA_URL` com a URL completa de `/api/sub-regioes` antes de iniciar o Vite.
O servidor local faz o proxy somente para essa rota. `PREVIEW_FLASK_URL` permite usar outra porta
para o restante da API.

O GitHub Actions compila e publica o build no GitHub Pages. Configure `PAGES_API_URL` com a URL
HTTPS completa de `/api/sub-regioes`. A API precisa aceitar origem `https://time00-dev.github.io`.
Configure `PAGES_ANALYSIS_URL` com a URL pública de `/api/analise` quando esse recurso for ativado
no servidor. Um erro da API de dados aparece explicitamente na interface.

### Explicações com IA

A rota Flask `POST /api/analise` consulta a competência e os territórios no banco antes de
enviar à OpenAI somente os registros selecionados e a metodologia. Em prévia com a base
publicada, configure também `ANALYSIS_DATA_URL` no Flask com a mesma URL de dados usada no Vite.

- Configure `OPENAI_API_KEY` somente no servidor. Escolha o modelo em `OPENAI_ANALYSIS_MODEL`.
- Defina `ANALYSIS_ACCESS_TOKEN` com um valor aleatório de pelo menos 32 caracteres, separado
  da chave OpenAI e do token de carga. Por exemplo, gere com
  `python -c "import secrets; print(secrets.token_urlsafe(32))"`. Esse é o código solicitado na interface.
- Ajuste `ANALYSIS_DAILY_LIMIT` e `ANALYSIS_MONTHLY_LIMIT` conforme os créditos disponíveis.
  O contador compartilha a cota entre workers que usam o mesmo arquivo SQLite. Se houver mais
  de um servidor, não habilite o endpoint sem uma cota compartilhada entre as instâncias.
- Em publicação separada, defina `ANALYSIS_ALLOWED_ORIGIN` com a origem exata do frontend
  e confira que o proxy preserva o CORS e não acrescenta um segundo cabeçalho de origem.

O build injeta somente as URLs públicas de dados e de análise. Antes do upload, o workflow
verifica que o artefato é estático e procura sinais de credenciais ou acesso direto à OpenAI.
O Nginx deve encaminhar apenas as rotas necessárias. Antes de publicar a rota de IA, configure
limites no proxy e preserve um diretório dedicado gravável pelo serviço para a cota SQLite.

O painel continua navegável quando a IA está desabilitada, indisponível ou sem cota. Os links
para a ficha e a metodologia são montados pela aplicação.

## 🗄️ Dados

O notebook no **Google Colab** reúne dados públicos do **Banco Central do Brasil (BCB)**, incluindo SCR e Pix, e dados demográficos do **IBGE**.

O processo envolve:

- Coleta
- Normalização
- Limpeza
- Análise exploratória
- Validação
- Preparação para utilização na aplicação

---

## ☁️ Executar o notebook no Google Colab

1. Abra o [notebook no Google Colab](https://colab.research.google.com/drive/1jXD78zBT7EDTlG1bosBBgvayKodDTIVz?usp=sharing), conecte um ambiente de execução e rode a célula **Instalação**.
2. Execute as células em ordem até **EXECUÇÃO PRINCIPAL**. Essa etapa baixa e trata os dados, calcula os indicadores e gera o Score de Oportunidade por sub-região. Aguarde o fim da extração antes de seguir.
3. Rode as células de conferência do score e de visualização gráfica. Para analisar os resultados só no Colab, pule a célula **Enviar resultados para o banco**, que depende de uma API configurada.

---

## ▶️ Executar a aplicação Flask localmente

Você precisa de **Python 3.10 ou superior**, **pip** e um servidor **MariaDB ou MySQL** em execução. Rode os comandos abaixo na raiz do repositório.

### 1. Instalar as dependências

```bash
python -m venv .venv
```

No Windows (PowerShell), ative o ambiente e copie o modelo de configuração.

```powershell
.\.venv\Scripts\Activate.ps1
Copy-Item backend/.env.exemplo backend/.env
```

No Linux ou macOS, use estes comandos.

```bash
source .venv/bin/activate
cp backend/.env.exemplo backend/.env
```

Com o ambiente ativo, instale as dependências do Flask.

```bash
python -m pip install -r backend/requirements.txt
```

### 2. Configurar o banco

Conecte-se ao MariaDB ou MySQL com um usuário administrador. Para um banco na mesma máquina que o Flask, execute o SQL abaixo e troque a senha do exemplo por uma senha sua.

```sql
CREATE DATABASE negado_pelo_banco CHARACTER SET utf8mb4;
CREATE USER 'negado_app'@'localhost' IDENTIFIED BY 'sua-senha';
GRANT ALL PRIVILEGES ON negado_pelo_banco.* TO 'negado_app'@'localhost';
```

Em `backend/.env`, use `DB_HOST=localhost`, `DB_PORT=3306`, `DB_NAME=negado_pelo_banco`, `DB_USER=negado_app` e preencha `DB_PASSWORD` com a senha definida no banco. Ajuste o host e a porta se sua instalação usar outros valores. Deixe `CARGA_TOKEN` em branco se for usar apenas a carga por arquivo.

Crie as tabelas e, para testar com a base simulada do repositório, carregue o JSON de exemplo.

```bash
python backend/banco.py
python backend/carga.py frontend/dados/mock_sub_regioes.json
```

### 3. Compilar o frontend e iniciar o Flask

```bash
npm --prefix frontend ci
npm --prefix frontend run build
python -m flask --app backend/app run
```

- [Painel local](http://localhost:5000/)
- [API local de sub-regiões](http://localhost:5000/api/sub-regioes)

### Carregar os dados reais do Colab

Se for enviar os resultados pelo notebook, gere um token com `python -c "import secrets; print(secrets.token_urlsafe(32))"` e salve-o em `CARGA_TOKEN` no `backend/.env`. Reinicie o Flask e configure um túnel HTTPS para a porta `5000`. Em **Secrets** no Colab, cadastre `CARGA_TOKEN` com o mesmo valor e habilite o acesso ao notebook. Depois da **EXECUÇÃO PRINCIPAL**, coloque a URL atual do túnel em `URL_API_LOCAL` e rode a célula **Enviar resultados para o banco**.

Para importar sem túnel, adicione uma célula após a execução principal e baixe o lote do mês mais recente.

```python
import json
from google.colab import files

lotes = montar_lotes(df_score_sub_regiao)
with open("resultados.json", "w", encoding="utf-8") as arquivo:
    json.dump(lotes[max(lotes)], arquivo, ensure_ascii=False, allow_nan=False)
files.download("resultados.json")
```

Salve o arquivo baixado na raiz do repositório e rode `python backend/carga.py resultados.json`. A carga atualiza os meses incluídos no arquivo. Para trabalhar só com dados reais, use um banco que ainda não recebeu a base simulada.

---

## 👥 Equipe — Time00.dev

| Integrante | Função | LinkedIn | Git Hub |
|---|---|---|---|
| **Marcos Vinicius Erculiani Chaves** | 🧩 Scrum Master (SM) |[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/marcos-erculiani-50b95a320/) | [![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/marcoserculianipw) |
| **Rafael Lopes Bonfim** | 🎯 Product Owner (PO) | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/rafael-lopes-bonfim-470817308/) | [![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Rafael-Bonfim) |
| **Gabriel Luiz Freire Gomes** | 👤 ScrumTeam (ST) |[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/gabriel-luiz-freire-gomes/) |[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/GabrielLuizFreireGomes)
| **Luan Carlos Medeiros Ronzoni** | 👤 ScrumTeam (ST) | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/luan-ronzoni/) |[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/luanronzoni)
| **Miguel Fenix da Silva Brito** | 👤 ScrumTeam (ST) | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/miguel-brito-572222437/) |[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/figuelmenix)
| **Marcus Vinicius Carniello Leão** | 👤 ScrumTeam (ST) |  [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](www.linkedin.com/in/marcus-carniello-a8b238369) | [![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/MarcusCarniello) |
| **Thiago Henrique dos Santos** | 👤 ScrumTeam (ST) | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/thiago-henrique-54ba51436/) | [![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Thiagoml) |
| **Raony Pietro de Moraes Janelato** | 👤 ScrumTeam (ST) | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](www.linkedin.com/in/raony-janelato-729b18428) | [![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Raony0) |
| **João Gabriel da Costa Bordinhon** | 👤 ScrumTeam (ST) | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/joão-gabriel-da-costa-bordinhon-a41722436) | [![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/joao-bordinhon1405) |

---

## 📋 Organização do projeto

O desenvolvimento será organizado através do GitHub utilizando:

- 📌 **Issues** — tarefas e requisitos
- 📋 **Projects** — acompanhamento do projeto
- 🌿 **Branches** — desenvolvimento das funcionalidades
- 🔀 **Pull Requests** — revisão e integração do código
- 📝 **README** — documentação

---

## ⚙️ Restrições e requisitos técnicos

- 🐍 Backend desenvolvido em **Python 3+**
- 🌐 Utilização do microframework **Flask**
- 🗄️ Banco de dados **MariaDB/MySQL**
- 🌐 **HTML5** para a arquitetura da informação
- 🎨 **CSS3** para layout e apresentação
- 🔧 GitHub para controle de versão
- 📱 Interface responsiva
- 🧭 Navegação intuitiva
- 🚫 Evitar frameworks de mapeamento objeto-relacional (ORM)

---

## 📈 Status

🟢 **Painel publicado.** O GitHub Pages serve a interface, e a API Flask fornece os indicadores e rankings calculados no notebook.

---

## 🎓 Contexto acadêmico

**Aprendizagem por Projetos Integrados — 2026-1**

**Curso:** Desenvolvimento de Software Multiplataforma — 1º DSM

**Parceiro:** Fernando Masanori

**Professor M2:** Jean Costa

**Professor P2:** Fernando Masanori

---

## 🔗 Projeto original

Este projeto parte da análise e evolução do projeto **RealIT**, desenvolvido por alunos veteranos da FATEC.

[🔗 Acessar projeto RealIT](https://github.com/dottecteam/RealIT)

---

## 📄 Licença

Projeto desenvolvido para fins acadêmicos.
