# PI-II-TIME-N2

Projeto Integrador II - PUC Campinas
Engenharia de Software, 2º semestre de 2026
Professor orientador: Fernando Luiz de Almeida Silveira

## O que é o projeto

É um sistema web para acompanhar demandas de desenvolvimento de software (tarefas, defeitos, melhorias e documentação), parecido com os quadros de tarefas que equipes de tecnologia usam. Cada demanda pertence a um projeto, tem um responsável, uma prioridade e um status, e passa por um fluxo até ser concluída ou cancelada.

O sistema tem login, três perfis de usuário (Administrador, Líder de Projeto e Membro da Equipe), comentários, histórico de alterações, filtros e um dashboard com os números gerais. Demandas nunca são apagadas do banco: quando não servem mais, ficam com o status Cancelada.

## Equipe

| Nome | RA |
|---|---|
| Leonardo Setti Garcia Peres | 26029250 |
| Vittor Maia Hagge | 26025923 |
| Matheus Taboada Chibani Rocha | 26026115 |
| Lucas Augusto Pacola Zillo | 26026539 |
| João Antero Paiva | 26028470 |

Cada arquivo do projeto tem no topo o nome do autor. Resumindo quem fez o quê:

- **Leonardo:** banco de dados, login (JWT), middleware de autenticação, navbar, dashboard, página de administração e arquivos compartilhados do front (`api.js`, `utils.js`).
- **Vittor:** listar e cadastrar demandas, consulta de feriados na API externa e a tela de nova demanda.
- **Matheus:** tela de login e as rotas de troca de status e edição de demandas.
- **Lucas:** tela de detalhe da demanda, com comentários, histórico e botões de status.
- **João:** rotas de projetos e usuários, lista de demandas com filtros e tela de edição.

## Tecnologias

- **Front-end:** HTML, CSS e JavaScript puro, com Bootstrap 5
- **Back-end:** Node.js, TypeScript e Express
- **Banco de dados:** MySQL 8 (rodando em Docker)
- **Outras bibliotecas:** mysql2, bcryptjs (senhas), jsonwebtoken (login), dotenv, cors
- **API externa:** [BrasilAPI](https://brasilapi.com.br) para consultar feriados nacionais

## Como rodar

### O que precisa estar instalado

- Node.js (versão LTS) e npm
- Docker Desktop
- Git

### Passo a passo

1. Clonar o repositório:

   ```
   git clone https://github.com/leonardosgp7/PI-II-TIME-N2.git
   cd PI-II-TIME-N2/backend
   ```

2. Subir o banco de dados (MySQL na porta 3306 e Adminer na 8080):

   ```
   docker compose up -d
   ```

3. Criar o arquivo `.env` a partir do exemplo:

   ```
   cp .env.example .env
   ```

   No Windows (PowerShell) o comando é `copy .env.example .env`. Os valores do exemplo já funcionam com o Docker do passo 2. Se quiser, troque o `JWT_SECRET`.

4. Instalar as dependências e iniciar a API:

   ```
   npm install
   npm start
   ```

   O `npm start` compila o TypeScript e sobe o servidor em `http://localhost:3000`. Na primeira vez a própria API cria as tabelas e insere os dados iniciais (perfis, status, usuários de teste, projetos e algumas demandas de exemplo). Não precisa rodar nenhum script SQL na mão.

   Se aparecer erro de conexão com o banco, é porque o MySQL ainda estava iniciando. Espere uns segundos e rode `npm start` de novo.

5. Abrir o front-end: abrir o arquivo `paginas/login.html` no navegador (de preferência com a extensão Live Server do VS Code) e entrar com um dos usuários abaixo.

### Usuários de teste

A senha de todos é **123456**.

| Usuário | E-mail | Perfil |
|---|---|---|
| Ana Souza | ana.souza@exemplo.com | Administrador |
| Elisa Nunes | elisa.nunes@exemplo.com | Líder de Projeto |
| Gustavo Lima | gustavo.lima@exemplo.com | Líder de Projeto |
| Diego Almeida | diego.almeida@exemplo.com | Membro da Equipe |
| Felipe Tavares | felipe.tavares@exemplo.com | Membro da Equipe |

### Ver o banco de dados

Com o Docker rodando, abrir `http://localhost:8080` (Adminer) e entrar com:

- Sistema: MySQL
- Servidor: `mysql`
- Usuário: `root`
- Senha: `root`
- Base de dados: `sistema_demandas`

### Recomeçar do zero

Para apagar o banco e começar de novo (isso apaga todos os dados):

```
docker compose down -v
docker compose up -d
```

### Testar o front sem o back-end

No arquivo `paginas/js/api.js` existe a constante `USAR_DADOS_EXEMPLO`. Com `true`, o front usa dados de mentira do `dados-exemplo.js` e não precisa da API. O padrão é `false`.

## Regras do sistema

**Status e fluxo da demanda.** Toda demanda nasce como Aberta.

- Aberta → Em andamento
- Em andamento → Em revisão
- Em revisão → Concluída (ou volta para Em andamento)
- Qualquer status, desde que não seja Concluída → Cancelada

Não dá para concluir direto de Em andamento nem voltar de Em andamento para Aberta.

**O que cada perfil pode fazer:**

| | Administrador | Líder de Projeto | Membro da Equipe |
|---|---|---|---|
| Ver demandas | todas | dos projetos em que participa | dos projetos em que participa e as atribuídas a ele |
| Criar demanda | sim | sim | não |
| Editar demanda | sim | dos seus projetos | não |
| Mudar prioridade e responsável | sim | sim | não |
| Mudar status | todas as transições | todas as transições | só Aberta → Em andamento e Em andamento → Em revisão, nas suas demandas |
| Cancelar | sim | sim | não |
| Comentar e ver histórico | sim | sim | sim |
| Tela de administração | sim | não | não |

**Prazo e feriados.** Ao cadastrar ou editar o prazo, a API consulta a BrasilAPI. Se a data for feriado nacional, o sistema mostra um erro e não salva. Por isso essa parte precisa de internet.

**Histórico.** Cada mudança de status, prioridade, responsável, prazo, título ou descrição vira uma linha no histórico, com quem fez e quando. O histórico não é apagado nunca.

## Rotas da API

Todas começam com `/api` e, menos o login, exigem o token no cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | O que faz |
|---|---|---|
| POST | `/auth/login` | Login, devolve o token e os dados do usuário |
| GET | `/demandas` | Lista as demandas que o usuário pode ver |
| POST | `/demandas` | Cadastra uma demanda |
| GET | `/demandas/:id` | Detalhe, com comentários e histórico |
| PUT | `/demandas/:id` | Edita título, descrição, prazo, prioridade e responsável |
| PUT | `/demandas/:id/status` | Troca o status |
| POST | `/demandas/:id/comentarios` | Adiciona um comentário |
| GET | `/projetos` | Lista os projetos do usuário |
| GET | `/usuarios` | Lista os usuários |
| POST | `/usuarios` | Cadastra um usuário (administração) |
| PUT | `/usuarios/:id` | Edita um usuário e seus projetos (administração) |

Não existe rota para apagar demanda, de propósito.

## Estrutura das pastas

```
PI-II-TIME-N2/
├── backend/
│   ├── docker-compose.yml        MySQL e Adminer
│   ├── .env.example
│   └── src/
│       ├── index.ts              inicia a API
│       ├── database/             conexão e scripts (schema/db.sql e schema/seed.sql)
│       ├── middlewares/          verificação do token
│       ├── routes/               auth, demanda, projetos e users
│       └── services/             consulta de feriados
├── paginas/                      telas do sistema (HTML)
│   ├── css/
│   └── js/
└── wireframes/                   protótipos das telas
```

## Telas

- **Login:** entrada no sistema.
- **Dashboard:** total de demandas, quantidade por status, por prioridade e por tipo, demandas críticas em aberto e demandas perto do prazo.
- **Demandas:** lista com busca por título ou descrição, filtros (status, prioridade, tipo, responsável e projeto), ordenação e a opção "Somente minhas demandas".
- **Nova demanda:** formulário de cadastro.
- **Detalhe da demanda:** dados completos, comentários, histórico e botões para avançar o status.
- **Editar demanda:** altera os dados da demanda.
- **Administração:** cadastro e edição de usuários e vínculo com projetos (só para o Administrador).

## Observações e limitações

- A senha dos usuários de teste é simples de propósito, só para facilitar a apresentação. Em um sistema de verdade não seria assim.
- O `JWT_SECRET` do `.env.example` é só um exemplo e deve ser trocado fora de testes. O token vale por 8 horas.
- O cadastro de projetos novos não tem tela. Eles são inseridos direto no banco (o escopo permite isso).
- Sem internet não dá para salvar um prazo, porque a consulta de feriados falha.
- O banco usado é o MySQL, que é um dos permitidos pelo escopo.
