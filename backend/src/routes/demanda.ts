import express, { Request, Response } from "express";
import { pool } from "../database/database";
import { RowDataPacket } from "mysql2";

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

export default router;
