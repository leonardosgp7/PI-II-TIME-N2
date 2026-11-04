/*
Autor: Vittor Maia Hagge
RA: 26025923
*/

import express, { Request, Response } from "express";
import { pool } from "../database/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { PoolConnection } from "mysql2/promise";
import { buscarFeriado } from "../services/feriados";

const router = express.Router();


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
        
        if (logado.perfil !== "ADMINISTRADOR") {
            const [vinculos] = await pool.query<RowDataPacket[]>(
                "SELECT * FROM participa WHERE fk_projeto_id_projeto = ? AND fk_usuario_id_usuario = ?",
                [projetoId, logado.id]
        );
        if (vinculos.length === 0) {
            return res.status(403).json({ mensagem: "Você não participa deste projeto." });
        }
        }

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


/* ------------------------------------------------------------------
   Troca de status e edição da demanda
------------------------------------------------------------------ */

type Usuario = { id: number; perfil: "ADMINISTRADOR" | "LIDER" | "MEMBRO" };

// Regra do fluxo de status: cada status tem a lista de status para os quais pode ir
const TRANSICOES: Record<string, string[]> = {
    ABERTA: ["EM_ANDAMENTO", "CANCELADA"],
    EM_ANDAMENTO: ["EM_REVISAO", "CANCELADA"],
    EM_REVISAO: ["CONCLUIDA", "EM_ANDAMENTO", "CANCELADA"],
    CONCLUIDA: [],
    CANCELADA: [],
};

// Membro só avança até "Em revisão"
const MEMBRO_PODE = ["EM_ANDAMENTO", "EM_REVISAO"];

// Busca uma demanda com todos os dados necessários
async function buscarDemanda(id: number) {
    const [linhas] = await pool.query<RowDataPacket[]>(
        `SELECT d.id_demanda AS id,
                d.titulo,
                d.descricao,
                DATE_FORMAT(d.prazo_finalizacao, '%Y-%m-%d') AS prazo,
                d.fk_projeto_id_projeto AS fk_projeto,
                d.fk_usuario_responsavel,
                resp.nome AS responsavel_nome,
                s.codigo AS status_codigo, s.nome AS status_nome,
                p.codigo AS prioridade_codigo, p.nome AS prioridade_nome
           FROM demanda d
           JOIN status_demanda s ON s.id_status = d.fk_status_demanda_id_status
           JOIN prioridade p ON p.id_prioridade = d.fk_prioridade_id_prioridade
           LEFT JOIN usuario resp ON resp.id_usuario = d.fk_usuario_responsavel
          WHERE d.id_demanda = ?`,
        [id]
    );
    return linhas[0];
}

// Admin vê tudo; Líder e Membro só nos projetos em que participam
async function temAcessoAoProjeto(u: Usuario, projetoId: number) {
    if (u.perfil === "ADMINISTRADOR") return true;
    const [linhas] = await pool.query<RowDataPacket[]>(
        `SELECT 1 FROM participa
          WHERE fk_usuario_id_usuario = ? AND fk_projeto_id_projeto = ?`,
        [u.id, projetoId]
    );
    return linhas.length > 0;
}

// Grava uma linha no histórico (dt_hora é preenchida sozinha pelo banco)
async function registrarHistorico(
    conn: PoolConnection,
    demandaId: number,
    usuarioId: number,
    tipoAlteracao: string,
    anterior: string | null,
    novo: string | null
) {
    await conn.query(
        `INSERT INTO historico
           (fk_demanda_id_demanda, fk_usuario_id_usuario, tipo_alteracao, valor_anterior, valor_novo)
         VALUES (?, ?, ?, ?, ?)`,
        [demandaId, usuarioId, tipoAlteracao, anterior, novo]
    );
}

// PUT /api/demandas/:id/status
// Recebe { status } e aplica as transições permitidas para o perfil do usuário
router.put("/:id/status", async (req: Request, res: Response) => {
    try {
        const u = res.locals.usuario as Usuario;
        const id = Number(req.params.id);
        const novoCodigo = req.body.status;

        if (!Number.isInteger(id) || typeof novoCodigo !== "string") {
            return res.status(400).json({ mensagem: "Informe o id e o novo status." });
        }

        const demanda = await buscarDemanda(id);
        if (!demanda) return res.status(404).json({ mensagem: "Demanda não encontrada." });

        if (!(await temAcessoAoProjeto(u, demanda.fk_projeto))) {
            return res.status(403).json({ mensagem: "Você não participa deste projeto." });
        }

        const permitidos = TRANSICOES[demanda.status_codigo] ?? [];
        if (!permitidos.includes(novoCodigo)) {
            return res.status(400).json({
                mensagem: `Não é possível ir de ${demanda.status_codigo} para ${novoCodigo}.`,
            });
        }

        if (u.perfil === "MEMBRO") {
            if (demanda.fk_usuario_responsavel !== u.id) {
                return res.status(403).json({ mensagem: "Membro só altera as próprias demandas." });
            }
            if (!MEMBRO_PODE.includes(novoCodigo)) {
                return res.status(403).json({ mensagem: "Membro só pode avançar até Em revisão." });
            }
        }

        const [novoStatus] = await pool.query<RowDataPacket[]>(
            "SELECT id_status AS id, nome FROM status_demanda WHERE codigo = ?",
            [novoCodigo]
        );
        if (novoStatus.length === 0) {
            return res.status(400).json({ mensagem: "Status inexistente." });
        }

        // Transação: ou grava tudo (status + histórico) ou não grava nada
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            await conn.query(
                `UPDATE demanda
                    SET fk_status_demanda_id_status = ?, dt_ultima_att = NOW()
                  WHERE id_demanda = ?`,
                [novoStatus[0].id, id]
            );
            await registrarHistorico(
                conn, id, u.id, "status",
                demanda.status_nome, novoStatus[0].nome
            );
            await conn.commit();
        } catch (erro) {
            await conn.rollback();
            throw erro;
        } finally {
            conn.release();
        }

        return res.json({
            id,
            status: { codigo: novoCodigo, nome: novoStatus[0].nome },
        });
    } catch (erro) {
        console.error("Erro ao alterar o status:", erro);
        return res.status(500).json({ mensagem: "Erro interno ao alterar o status." });
    }
});

// Uma alteração a ser gravada na edição
type Mudanca = {
    campo: string;   // nome que aparece no histórico
    coluna: string;  // coluna da tabela demanda (fixa no código, nunca vem do usuário)
    valor: string | number | null;  // valor que vai pro banco
    anterior: string | null;
    novo: string | null;
};

// PUT /api/demandas/:id
// Body (todos opcionais): titulo, descricao, prioridade (codigo),
// responsavelId (numero ou null), prazo ("AAAA-MM-DD")
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const u = res.locals.usuario as Usuario;
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ mensagem: "ID inválido." });
        }

        const demanda = await buscarDemanda(id);
        if (!demanda) return res.status(404).json({ mensagem: "Demanda não encontrada." });

        if (!(await temAcessoAoProjeto(u, demanda.fk_projeto))) {
            return res.status(403).json({ mensagem: "Você não participa deste projeto." });
        }
        if (u.perfil === "MEMBRO" && demanda.fk_usuario_responsavel !== u.id) {
            return res.status(403).json({ mensagem: "Membro só edita as próprias demandas." });
        }

        const { titulo, descricao, prioridade, responsavelId, prazo } = req.body;
        const mudancas: Mudanca[] = [];
        const restritas: string[] = []; // campos que só Líder/Admin podem mudar

        // título
        if (titulo !== undefined) {
            const t = String(titulo).trim();
            if (!t) {
                return res.status(400).json({ mensagem: "O título não pode ficar vazio.", campo: "titulo" });
            }
            if (t !== demanda.titulo) {
                mudancas.push({ campo: "titulo", coluna: "titulo", valor: t, anterior: demanda.titulo, novo: t });
            }
        }

        // descrição
        if (descricao !== undefined) {
            const d = String(descricao).trim();
            if (d !== (demanda.descricao ?? "")) {
                mudancas.push({ campo: "descricao", coluna: "descricao", valor: d, anterior: demanda.descricao, novo: d });
            }
        }

        // prazo (com checagem de feriado)
        if (prazo !== undefined) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(prazo) || isNaN(Date.parse(prazo))) {
                return res.status(400).json({ mensagem: "Data inválida. Use AAAA-MM-DD.", campo: "prazo" });
            }
            if (prazo !== demanda.prazo) {
                const feriado = await buscarFeriado(prazo);
                if (feriado) {
                    return res.status(400).json({
                        mensagem: "O prazo cai em um feriado: " + feriado.name + ". Escolha outra data.",
                        campo: "prazo",
                    });
                }
                mudancas.push({
                    campo: "prazo", coluna: "prazo_finalizacao", valor: prazo,
                    anterior: demanda.prazo, novo: prazo,
                });
            }
        }

        // prioridade (restrita a Líder/Admin)
        if (prioridade !== undefined && prioridade !== demanda.prioridade_codigo) {
            const [p] = await pool.query<RowDataPacket[]>(
                "SELECT id_prioridade AS id, nome FROM prioridade WHERE codigo = ?",
                [prioridade]
            );
            if (p.length === 0) {
                return res.status(400).json({ mensagem: "Prioridade inexistente.", campo: "prioridade" });
            }
            restritas.push("prioridade");
            mudancas.push({
                campo: "prioridade", coluna: "fk_prioridade_id_prioridade", valor: p[0].id,
                anterior: demanda.prioridade_nome, novo: p[0].nome,
            });
        }

        // responsável (restrito a Líder/Admin)
        if (responsavelId !== undefined) {
            const novoResp = responsavelId === null ? null : Number(responsavelId);
            if (novoResp !== demanda.fk_usuario_responsavel) {
                let nomeNovo: string | null = null;
                if (novoResp !== null) {
                    const [r] = await pool.query<RowDataPacket[]>(
                        `SELECT usr.id_usuario AS id, usr.nome
                           FROM usuario usr
                           JOIN participa pa ON pa.fk_usuario_id_usuario = usr.id_usuario
                          WHERE usr.id_usuario = ?
                            AND pa.fk_projeto_id_projeto = ?
                            AND usr.ativo = true`,
                        [novoResp, demanda.fk_projeto]
                    );
                    if (r.length === 0) {
                        return res.status(400).json({
                            mensagem: "Responsável inválido para este projeto.",
                            campo: "responsavel",
                        });
                    }
                    nomeNovo = r[0].nome;
                }
                restritas.push("responsavel");
                mudancas.push({
                    campo: "responsavel", coluna: "fk_usuario_responsavel", valor: novoResp,
                    anterior: demanda.responsavel_nome ?? "sem responsável",
                    novo: nomeNovo ?? "sem responsável",
                });
            }
        }

        if (restritas.length > 0 && u.perfil === "MEMBRO") {
            return res.status(403).json({
                mensagem: "Só Líder e Admin alteram prioridade e responsável.",
            });
        }

        if (mudancas.length === 0) {
            return res.json({ id, alteracoes: [] });
        }

        // Transação: grava todas as mudanças + histórico, ou nada
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            for (const m of mudancas) {
                await conn.query(`UPDATE demanda SET ${m.coluna} = ? WHERE id_demanda = ?`, [m.valor, id]);
                await registrarHistorico(conn, id, u.id, m.campo, m.anterior, m.novo);
            }
            await conn.query("UPDATE demanda SET dt_ultima_att = NOW() WHERE id_demanda = ?", [id]);
            await conn.commit();
        } catch (erro) {
            await conn.rollback();
            throw erro;
        } finally {
            conn.release();
        }

        return res.json({ id, alteracoes: mudancas.map((m) => m.campo) });
    } catch (erro) {
        console.error("Erro ao editar a demanda:", erro);
        return res.status(500).json({ mensagem: "Erro interno ao editar a demanda." });
    }
});

export default router;
