import express, { Request, Response } from "express";
import { pool } from "../database/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";      
import { buscarFeriado } from "../services/feriados";         

const router = express.Router();

/*
Autor: Vittor Maia Hagge
RA: 26025923
*/

function paraDemanda(linha: RowDataPacket) {
    let responsavel = null;
    if (linha.responsavel_id) {
        responsavel = { id: linha.responsavel_id, nome: linha.responsavel_nome };
    }

    return {
        id: linha.id_demanda,
        titulo: linha.titulo,
        descricao: linha.descricao,
        tipo: linha.tipo,
        prioridade: linha.prioridade,
        status: linha.status,
        projeto: { id: linha.projeto_id, nome: linha.projeto_nome },
        responsavel: responsavel,
        dataCriacao: linha.dt_criacao,
        prazo: linha.prazo_finalizacao,
    };
}

router.get("/", async (req: Request, res: Response) => {
    const logado = res.locals.usuario;

    try {
        if (logado.perfil === "ADMINISTRADOR") {
            const [linhas] = await pool.query<RowDataPacket[]>(`
                SELECT d.id_demanda, d.titulo, d.descricao, d.dt_criacao, d.prazo_finalizacao,
                       t.codigo AS tipo, pr.codigo AS prioridade, s.codigo AS status,
                       p.id_projeto AS projeto_id, p.nome AS projeto_nome,
                       r.id_usuario AS responsavel_id, r.nome AS responsavel_nome
                  FROM demanda d
                  JOIN tipo_demanda t   ON t.id_tipo = d.fk_tipo_demanda_id_tipo
                  JOIN prioridade pr    ON pr.id_prioridade = d.fk_prioridade_id_prioridade
                  JOIN status_demanda s ON s.id_status = d.fk_status_demanda_id_status
                  JOIN projeto p        ON p.id_projeto = d.fk_projeto_id_projeto
                  LEFT JOIN usuario r   ON r.id_usuario = d.fk_usuario_responsavel
                 ORDER BY d.id_demanda
            `);

            return res.json(linhas.map(paraDemanda));
        }

        const [linhas] = await pool.query<RowDataPacket[]>(`
            SELECT d.id_demanda, d.titulo, d.descricao, d.dt_criacao, d.prazo_finalizacao,
                   t.codigo AS tipo, pr.codigo AS prioridade, s.codigo AS status,
                   p.id_projeto AS projeto_id, p.nome AS projeto_nome,
                   r.id_usuario AS responsavel_id, r.nome AS responsavel_nome
              FROM demanda d
              JOIN tipo_demanda t   ON t.id_tipo = d.fk_tipo_demanda_id_tipo
              JOIN prioridade pr    ON pr.id_prioridade = d.fk_prioridade_id_prioridade
              JOIN status_demanda s ON s.id_status = d.fk_status_demanda_id_status
              JOIN projeto p        ON p.id_projeto = d.fk_projeto_id_projeto
              LEFT JOIN usuario r   ON r.id_usuario = d.fk_usuario_responsavel
              JOIN participa pa     ON pa.fk_projeto_id_projeto = d.fk_projeto_id_projeto
             WHERE pa.fk_usuario_id_usuario = ?
             ORDER BY d.id_demanda
        `, [logado.id]);

        return res.json(linhas.map(paraDemanda));
    } catch (erro) {
        console.error("Erro ao buscar demandas:", erro);
        return res.status(500).json({ mensagem: "Erro ao buscar demandas." });
    }
});

router.post("/", async (req: Request, res: Response) => {
    const logado = res.locals.usuario;
    const { titulo, descricao, projetoId, responsavelId, tipo, prioridade, prazo } = req.body;

    if (!titulo || !tipo || !prioridade || !projetoId) {
        return res.status(400).json({ mensagem: "Título, tipo, prioridade e projeto são obrigatórios." });
    }

    try {
        if (prazo) {
            const feriado = await buscarFeriado(prazo);
            if (feriado) {
                return res.status(400).json({ mensagem: "O prazo cai em um feriado: " + feriado.name + ". Escolha outra data." });
            }
        }

        const [tipos] = await pool.query<RowDataPacket[]>(
            "SELECT id_tipo FROM tipo_demanda WHERE codigo = ?", [tipo]
        );
        if (tipos.length === 0) {
            return res.status(400).json({ mensagem: "Tipo inválido." });
        }

        const [prioridades] = await pool.query<RowDataPacket[]>(
            "SELECT id_prioridade FROM prioridade WHERE codigo = ?", [prioridade]
        );
        if (prioridades.length === 0) {
            return res.status(400).json({ mensagem: "Prioridade inválida." });
        }

        let responsavel = null;
        if (responsavelId) {
            responsavel = Number(responsavelId);
        }

        const [status] = await pool.query<RowDataPacket[]>(
            "SELECT id_status FROM status_demanda WHERE codigo = 'ABERTA'"
        );
        if (status.length === 0) {
            return res.status(500).json({ mensagem: "Status ABERTA não cadastrado no banco." });
        }

        const [resultado] = await pool.query<ResultSetHeader>(
            `INSERT INTO demanda
                (titulo, descricao, prazo_finalizacao,
                 fk_tipo_demanda_id_tipo, fk_prioridade_id_prioridade, fk_status_demanda_id_status,
                 fk_projeto_id_projeto, fk_usuario_criador, fk_usuario_responsavel)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                titulo,
                descricao || null,
                prazo || null,
                tipos[0].id_tipo,
                prioridades[0].id_prioridade,
                status[0].id_status,
                Number(projetoId),
                logado.id,
                responsavel,
            ]
        );
        const idNovaDemanda = resultado.insertId;

        await pool.query(
            `INSERT INTO historico (tipo_alteracao, valor_anterior, valor_novo, fk_demanda_id_demanda, fk_usuario_id_usuario)
             VALUES ('CRIACAO', NULL, 'ABERTA', ?, ?)`,
            [idNovaDemanda, logado.id]
        );

        return res.status(201).json({ id: idNovaDemanda, mensagem: "Demanda cadastrada com sucesso." });
    } catch (erro) {
        console.error("Erro ao cadastrar demanda:", erro);
        return res.status(500).json({ mensagem: "Erro ao cadastrar demanda." });
    }
});


router.get("/:id", async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ mensagem: "Id de demanda inválido." });
        return;
    }

    const usuario = res.locals.usuario;

    try {
        const [demandas] = await pool.query<RowDataPacket[]>(
            `SELECT d.id_demanda, d.titulo, d.descricao, d.dt_criacao, d.dt_ultima_att,
                    d.prazo_finalizacao,
                    t.codigo AS tipo_codigo, t.nome AS tipo_nome,
                    pr.codigo AS prioridade_codigo, pr.nome AS prioridade_nome,
                    s.codigo AS status_codigo, s.nome AS status_nome,
                    p.id_projeto, p.nome AS projeto_nome,
                    uc.id_usuario AS criador_id, uc.nome AS criador_nome,
                    ur.id_usuario AS responsavel_id, ur.nome AS responsavel_nome
             FROM demanda d
             JOIN tipo_demanda t ON t.id_tipo = d.fk_tipo_demanda_id_tipo
             JOIN prioridade pr ON pr.id_prioridade = d.fk_prioridade_id_prioridade
             JOIN status_demanda s ON s.id_status = d.fk_status_demanda_id_status
             JOIN projeto p ON p.id_projeto = d.fk_projeto_id_projeto
             JOIN usuario uc ON uc.id_usuario = d.fk_usuario_criador
             LEFT JOIN usuario ur ON ur.id_usuario = d.fk_usuario_responsavel
             WHERE d.id_demanda = ?`,
            [id]
        );

        if (demandas.length === 0) {
            res.status(404).json({ mensagem: "Demanda não encontrada." });
            return;
        }

        const d = demandas[0];

        
        if (String(usuario.perfil).toUpperCase() !== "ADMINISTRADOR") {
            const [participacao] = await pool.query<RowDataPacket[]>(
                `SELECT 1 FROM participa
                 WHERE fk_projeto_id_projeto = ? AND fk_usuario_id_usuario = ?`,
                [d.id_projeto, usuario.id]
            );

            if (participacao.length === 0) {
                res.status(403).json({ mensagem: "Você não tem acesso a esta demanda." });
                return;
            }
        }

        const [comentarios] = await pool.query<RowDataPacket[]>(
            `SELECT c.id_comentario, c.texto, c.dt_hora, u.id_usuario, u.nome
             FROM comentario c
             JOIN usuario u ON u.id_usuario = c.fk_usuario_id_usuario
             WHERE c.fk_demanda_id_demanda = ?
             ORDER BY c.dt_hora ASC, c.id_comentario ASC`,
            [id]
        );

        const [historico] = await pool.query<RowDataPacket[]>(
            `SELECT h.id_historico, h.dt_hora, h.tipo_alteracao,
                    h.valor_anterior, h.valor_novo, u.id_usuario, u.nome
             FROM historico h
             JOIN usuario u ON u.id_usuario = h.fk_usuario_id_usuario
             WHERE h.fk_demanda_id_demanda = ?
             ORDER BY h.dt_hora DESC, h.id_historico DESC`,
            [id]
        );

        res.json({
            id: d.id_demanda,
            titulo: d.titulo,
            descricao: d.descricao,
            tipo: d.tipo_codigo,
            prioridade: d.prioridade_codigo,
            status: d.status_codigo,
            projeto: { id: d.id_projeto, nome: d.projeto_nome },
            responsavel: d.responsavel_id
                ? { id: d.responsavel_id, nome: d.responsavel_nome }
                : null,
            criadaPor: { id: d.criador_id, nome: d.criador_nome },
            dataCriacao: d.dt_criacao,
            dataAtualizacao: d.dt_ultima_att,
            prazo: d.prazo_finalizacao,
            comentarios: comentarios.map((c) => ({
                id: c.id_comentario,
                texto: c.texto,
                dataHora: c.dt_hora,
                autor: { id: c.id_usuario, nome: c.nome },
            })),
            historico: historico.map((h) => ({
                id: h.id_historico,
                dataHora: h.dt_hora,
                tipoAlteracao: h.tipo_alteracao,
                valorAnterior: h.valor_anterior,
                valorNovo: h.valor_novo,
                usuario: { id: h.id_usuario, nome: h.nome },
            })),
        });
    } catch (error) {
        console.error("Erro ao buscar demanda:", error);
        res.status(500).json({ mensagem: "Erro ao buscar demanda." });
    }
});



router.post("/:id/comentarios", async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ mensagem: "Id de demanda inválido." });
        return;
    }

    const texto = typeof req.body.texto === "string" ? req.body.texto.trim() : "";

    if (texto === "") {
        res.status(400).json({ mensagem: "Escreva o comentário antes de enviar." });
        return;
    }

    if (texto.length > 2000) {
        res.status(400).json({ mensagem: "O comentário pode ter no máximo 2000 caracteres." });
        return;
    }

    const usuario = res.locals.usuario;

    try {
        const [demandas] = await pool.query<RowDataPacket[]>(
            "SELECT id_demanda, fk_projeto_id_projeto FROM demanda WHERE id_demanda = ?",
            [id]
        );

        if (demandas.length === 0) {
            res.status(404).json({ mensagem: "Demanda não encontrada." });
            return;
        }

        if (String(usuario.perfil).toUpperCase() !== "ADMINISTRADOR") {
            const [participacao] = await pool.query<RowDataPacket[]>(
                `SELECT 1 FROM participa
                 WHERE fk_projeto_id_projeto = ? AND fk_usuario_id_usuario = ?`,
                [demandas[0].fk_projeto_id_projeto, usuario.id]
            );

            if (participacao.length === 0) {
                res.status(403).json({ mensagem: "Você não tem acesso a esta demanda." });
                return;
            }
        }

        const [resultado] = await pool.query<ResultSetHeader>(
            `INSERT INTO comentario (texto, fk_demanda_id_demanda, fk_usuario_id_usuario)
             VALUES (?, ?, ?)`,
            [texto, id, usuario.id]
        );

        const [novo] = await pool.query<RowDataPacket[]>(
            `SELECT c.id_comentario, c.texto, c.dt_hora, u.id_usuario, u.nome
             FROM comentario c
             JOIN usuario u ON u.id_usuario = c.fk_usuario_id_usuario
             WHERE c.id_comentario = ?`,
            [resultado.insertId]
        );

        const c = novo[0];

        res.status(201).json({
            id: c.id_comentario,
            texto: c.texto,
            dataHora: c.dt_hora,
            autor: { id: c.id_usuario, nome: c.nome },
        });
    } catch (error) {
        console.error("Erro ao criar comentário:", error);
        res.status(500).json({ mensagem: "Erro ao criar comentário." });
    }
});

export default router;
