-- Autor: Leonardo Setti Garcia Peres
-- RA: 26029250

-- Dados iniciais do sistema.
-- Este arquivo roda toda vez que a API sobe, logo depois do db.sql.
-- Usamos INSERT IGNORE com ids fixos: se o registro já existe, ele é pulado,
-- então rodar de novo não duplica nem sobrescreve nada.

-- ---------------------------------------------------------------
-- Dados fixos do sistema (o escopo define esses valores)
-- ---------------------------------------------------------------

INSERT IGNORE INTO perfil (id_perfil, codigo, nome) VALUES
    (1, 'ADMINISTRADOR', 'Administrador'),
    (2, 'LIDER', 'Líder de Projeto'),
    (3, 'MEMBRO', 'Membro da Equipe');

INSERT IGNORE INTO tipo_demanda (id_tipo, codigo, nome) VALUES
    (1, 'TAREFA', 'Tarefa'),
    (2, 'DEFEITO', 'Defeito'),
    (3, 'MELHORIA', 'Melhoria'),
    (4, 'DOCUMENTACAO', 'Documentação');

-- nivel maior = prioridade mais urgente (usado para ordenar)
INSERT IGNORE INTO prioridade (id_prioridade, codigo, nome, nivel) VALUES
    (1, 'CRITICA', 'Crítica', 4),
    (2, 'ALTA', 'Alta', 3),
    (3, 'MEDIA', 'Média', 2),
    (4, 'BAIXA', 'Baixa', 1);

INSERT IGNORE INTO status_demanda (id_status, codigo, nome) VALUES
    (1, 'ABERTA', 'Aberta'),
    (2, 'EM_ANDAMENTO', 'Em andamento'),
    (3, 'EM_REVISAO', 'Em revisão'),
    (4, 'CONCLUIDA', 'Concluída'),
    (5, 'CANCELADA', 'Cancelada');

-- ---------------------------------------------------------------
-- Usuários de teste (a senha de todos é 123456, guardada com bcrypt)
-- ---------------------------------------------------------------

INSERT IGNORE INTO usuario (id_usuario, nome, email, senha_hash, ativo, fk_perfil_id_perfil) VALUES
    (1, 'Ana Souza',      'ana.souza@exemplo.com',      '$2b$10$V9v.4CFFEjHT2zFcVWP/DOm5tZQYcR9qC8T46aI2D2/ogK7M5sZFO', TRUE, 1),
    (2, 'Elisa Nunes',    'elisa.nunes@exemplo.com',    '$2b$10$V9v.4CFFEjHT2zFcVWP/DOm5tZQYcR9qC8T46aI2D2/ogK7M5sZFO', TRUE, 2),
    (3, 'Diego Almeida',  'diego.almeida@exemplo.com',  '$2b$10$V9v.4CFFEjHT2zFcVWP/DOm5tZQYcR9qC8T46aI2D2/ogK7M5sZFO', TRUE, 3),
    (4, 'Felipe Tavares', 'felipe.tavares@exemplo.com', '$2b$10$V9v.4CFFEjHT2zFcVWP/DOm5tZQYcR9qC8T46aI2D2/ogK7M5sZFO', TRUE, 3),
    (5, 'Gustavo Lima',   'gustavo.lima@exemplo.com',   '$2b$10$V9v.4CFFEjHT2zFcVWP/DOm5tZQYcR9qC8T46aI2D2/ogK7M5sZFO', TRUE, 2);

-- ---------------------------------------------------------------
-- Projetos e quem participa de cada um
-- (o Administrador enxerga todos, por isso não precisa estar aqui)
-- ---------------------------------------------------------------

INSERT IGNORE INTO projeto (id_projeto, nome, descricao, ativo) VALUES
    (1, 'Portal Academico',       'Portal web para alunos e professores', TRUE),
    (2, 'Aplicativo Mobile',      'Aplicativo para consulta de notas e avisos', TRUE),
    (3, 'Integração Financeira',  'Integração com o sistema de cobranças', TRUE);

INSERT IGNORE INTO participa (fk_projeto_id_projeto, fk_usuario_id_usuario) VALUES
    (1, 2),
    (3, 2),
    (1, 3),
    (2, 4),
    (2, 5);

-- ---------------------------------------------------------------
-- Demandas de exemplo
-- As datas são calculadas a partir de hoje, assim o dashboard sempre
-- mostra demandas atrasadas e próximas do prazo.
-- Colunas: id, título, descrição, criação, prazo, tipo, prioridade,
--          status, projeto, criador, responsável
-- ---------------------------------------------------------------

INSERT IGNORE INTO demanda
    (id_demanda, titulo, descricao, dt_criacao, prazo_finalizacao,
     fk_tipo_demanda_id_tipo, fk_prioridade_id_prioridade, fk_status_demanda_id_status,
     fk_projeto_id_projeto, fk_usuario_criador, fk_usuario_responsavel)
VALUES
    (1,  'Tela de login nao valida senha vazia', 'Ao deixar a senha em branco o sistema deixa entrar.',
         NOW() - INTERVAL 20 DAY, CURDATE() + INTERVAL 2 DAY,   2, 1, 2, 1, 1, 3),
    (2,  'Cadastro de disciplinas', 'Criar a tela de cadastro de disciplinas.',
         NOW() - INTERVAL 20 DAY, CURDATE() + INTERVAL 15 DAY,  1, 1, 1, 1, 1, 2),
    (3,  'Exportar historico em PDF', 'O aluno deve conseguir baixar o histórico escolar em PDF.',
         NOW() - INTERVAL 20 DAY, CURDATE() + INTERVAL 4 DAY,   3, 3, 3, 1, 1, 3),
    (4,  'Documentar endpoints da API', 'Escrever a documentação de todas as rotas.',
         NOW() - INTERVAL 20 DAY, NULL,                         4, 4, 1, 1, 1, NULL),
    (5,  'Push notification de notas', 'Avisar o aluno quando uma nota nova for lançada.',
         NOW() - INTERVAL 20 DAY, CURDATE() + INTERVAL 20 DAY,  3, 2, 1, 2, 1, 4),
    (6,  'Crash ao abrir o app sem internet', 'O app fecha sozinho quando não tem conexão.',
         NOW() - INTERVAL 20 DAY, CURDATE() - INTERVAL 3 DAY,   2, 1, 1, 2, 1, NULL),
    (7,  'Splash screen da nova identidade', 'Trocar a tela inicial pela nova identidade visual.',
         NOW() - INTERVAL 20 DAY, CURDATE() - INTERVAL 5 DAY,   1, 4, 4, 2, 1, 4),
    (8,  'Conciliação automática de boletos', 'Baixar os boletos pagos automaticamente.',
         NOW() - INTERVAL 20 DAY, CURDATE() + INTERVAL 10 DAY,  1, 2, 2, 3, 1, 2),
    (9,  'Timeout na consulta de saldo', 'A consulta de saldo demora mais de 30 segundos.',
         NOW() - INTERVAL 20 DAY, NULL,                         2, 2, 5, 3, 1, NULL),
    (10, 'Manual de implantação', 'Passo a passo para instalar o sistema no cliente.',
         NOW() - INTERVAL 20 DAY, CURDATE() + INTERVAL 1 DAY,   4, 3, 4, 3, 1, 2);

-- ---------------------------------------------------------------
-- Comentários de exemplo
-- ---------------------------------------------------------------

INSERT IGNORE INTO comentario (id_comentario, texto, dt_hora, fk_demanda_id_demanda, fk_usuario_id_usuario) VALUES
    (1, 'Consegui reproduzir o erro no navegador Chrome.',  NOW() - INTERVAL 10 DAY, 1, 3),
    (2, 'Ótimo, pode corrigir e mandar para revisão.',       NOW() - INTERVAL 9 DAY,  1, 2),
    (3, 'PDF já está sendo gerado, falta ajustar o layout.', NOW() - INTERVAL 7 DAY,  3, 3);

-- ---------------------------------------------------------------
-- Histórico de exemplo
-- Toda demanda começa com um registro de criação; as que já andaram
-- no fluxo têm as trocas de status registradas.
-- ---------------------------------------------------------------

INSERT IGNORE INTO historico
    (id_historico, dt_hora, tipo_alteracao, valor_anterior, valor_novo, fk_demanda_id_demanda, fk_usuario_id_usuario)
VALUES
    (1,  NOW() - INTERVAL 20 DAY, 'CRIACAO', NULL, 'Aberta', 1, 1),
    (2,  NOW() - INTERVAL 20 DAY, 'CRIACAO', NULL, 'Aberta', 2, 1),
    (3,  NOW() - INTERVAL 20 DAY, 'CRIACAO', NULL, 'Aberta', 3, 1),
    (4,  NOW() - INTERVAL 20 DAY, 'CRIACAO', NULL, 'Aberta', 4, 1),
    (5,  NOW() - INTERVAL 20 DAY, 'CRIACAO', NULL, 'Aberta', 5, 1),
    (6,  NOW() - INTERVAL 20 DAY, 'CRIACAO', NULL, 'Aberta', 6, 1),
    (7,  NOW() - INTERVAL 20 DAY, 'CRIACAO', NULL, 'Aberta', 7, 1),
    (8,  NOW() - INTERVAL 20 DAY, 'CRIACAO', NULL, 'Aberta', 8, 1),
    (9,  NOW() - INTERVAL 20 DAY, 'CRIACAO', NULL, 'Aberta', 9, 1),
    (10, NOW() - INTERVAL 20 DAY, 'CRIACAO', NULL, 'Aberta', 10, 1),
    (11, NOW() - INTERVAL 15 DAY, 'status', 'Aberta',       'Em andamento', 1, 3),
    (12, NOW() - INTERVAL 14 DAY, 'status', 'Aberta',       'Em andamento', 3, 3),
    (13, NOW() - INTERVAL 8 DAY,  'status', 'Em andamento', 'Em revisão',   3, 3),
    (14, NOW() - INTERVAL 13 DAY, 'status', 'Aberta',       'Em andamento', 8, 2),
    (15, NOW() - INTERVAL 18 DAY, 'status', 'Aberta',       'Cancelada',    9, 1),
    (16, NOW() - INTERVAL 17 DAY, 'status', 'Aberta',       'Em andamento', 7, 4),
    (17, NOW() - INTERVAL 16 DAY, 'status', 'Em andamento', 'Em revisão',   7, 4),
    (18, NOW() - INTERVAL 15 DAY, 'status', 'Em revisão',   'Concluída',    7, 5),
    (19, NOW() - INTERVAL 17 DAY, 'status', 'Aberta',       'Em andamento', 10, 2),
    (20, NOW() - INTERVAL 16 DAY, 'status', 'Em andamento', 'Em revisão',   10, 2),
    (21, NOW() - INTERVAL 15 DAY, 'status', 'Em revisão',   'Concluída',    10, 2);
