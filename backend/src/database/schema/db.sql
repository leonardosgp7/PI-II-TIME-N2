-- Autor: Leonardo Setti Garcia Peres
-- RA: 26029250


CREATE DATABASE IF NOT EXISTS sistema_demandas;
USE sistema_demandas;

CREATE TABLE IF NOT EXISTS perfil (
    id_perfil INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    fk_perfil_id_perfil INT NOT NULL,

    CONSTRAINT fk_usuario_perfil
        FOREIGN KEY (fk_perfil_id_perfil)
        REFERENCES perfil(id_perfil)
);

CREATE TABLE IF NOT EXISTS projeto (
    id_projeto INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS tipo_demanda (
    id_tipo INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS prioridade (
    id_prioridade INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL UNIQUE,
    nivel INT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS status_demanda (
    id_status INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS demanda (
    id_demanda INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    dt_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dt_ultima_att DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    prazo_finalizacao DATE NULL,

    fk_tipo_demanda_id_tipo INT NOT NULL,
    fk_prioridade_id_prioridade INT NOT NULL,
    fk_status_demanda_id_status INT NOT NULL,
    fk_projeto_id_projeto INT NOT NULL,
    fk_usuario_criador INT NOT NULL,
    fk_usuario_responsavel INT NULL,

    CONSTRAINT fk_demanda_tipo
        FOREIGN KEY (fk_tipo_demanda_id_tipo)
        REFERENCES tipo_demanda(id_tipo),

    CONSTRAINT fk_demanda_prioridade
        FOREIGN KEY (fk_prioridade_id_prioridade)
        REFERENCES prioridade(id_prioridade),

    CONSTRAINT fk_demanda_status
        FOREIGN KEY (fk_status_demanda_id_status)
        REFERENCES status_demanda(id_status),

    CONSTRAINT fk_demanda_projeto
        FOREIGN KEY (fk_projeto_id_projeto)
        REFERENCES projeto(id_projeto),

    CONSTRAINT fk_demanda_criador
        FOREIGN KEY (fk_usuario_criador)
        REFERENCES usuario(id_usuario),

    CONSTRAINT fk_demanda_responsavel
        FOREIGN KEY (fk_usuario_responsavel)
        REFERENCES usuario(id_usuario),

    INDEX idx_demanda_projeto (fk_projeto_id_projeto),
    INDEX idx_demanda_status (fk_status_demanda_id_status),
    INDEX idx_demanda_responsavel (fk_usuario_responsavel),
    INDEX idx_demanda_prazo (prazo_finalizacao)
);

CREATE TABLE IF NOT EXISTS comentario (
    id_comentario INT AUTO_INCREMENT PRIMARY KEY,
    texto TEXT NOT NULL,
    dt_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    fk_demanda_id_demanda INT NOT NULL,
    fk_usuario_id_usuario INT NOT NULL,

    CONSTRAINT fk_comentario_demanda
        FOREIGN KEY (fk_demanda_id_demanda)
        REFERENCES demanda(id_demanda),

    CONSTRAINT fk_comentario_usuario
        FOREIGN KEY (fk_usuario_id_usuario)
        REFERENCES usuario(id_usuario),

    INDEX idx_comentario_demanda (fk_demanda_id_demanda)
);

CREATE TABLE IF NOT EXISTS historico (
    id_historico INT AUTO_INCREMENT PRIMARY KEY,
    dt_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo_alteracao VARCHAR(100) NOT NULL,
    valor_anterior TEXT,
    valor_novo TEXT,

    fk_demanda_id_demanda INT NOT NULL,
    fk_usuario_id_usuario INT NOT NULL,

    CONSTRAINT fk_historico_demanda
        FOREIGN KEY (fk_demanda_id_demanda)
        REFERENCES demanda(id_demanda),

    CONSTRAINT fk_historico_usuario
        FOREIGN KEY (fk_usuario_id_usuario)
        REFERENCES usuario(id_usuario),

    INDEX idx_historico_demanda_data (fk_demanda_id_demanda, dt_hora)
);

CREATE TABLE IF NOT EXISTS participa (
    fk_projeto_id_projeto INT NOT NULL,
    fk_usuario_id_usuario INT NOT NULL,

    PRIMARY KEY (fk_projeto_id_projeto, fk_usuario_id_usuario),

    CONSTRAINT fk_participa_projeto
        FOREIGN KEY (fk_projeto_id_projeto)
        REFERENCES projeto(id_projeto),

    CONSTRAINT fk_participa_usuario
        FOREIGN KEY (fk_usuario_id_usuario)
        REFERENCES usuario(id_usuario),

    INDEX idx_participa_usuario (fk_usuario_id_usuario)
);
