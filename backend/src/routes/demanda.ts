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

export default router;
