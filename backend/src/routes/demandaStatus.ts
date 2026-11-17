/*
Autor: Matheus Taboada Chibani Rocha
RA: 26026115
*/
// Troca de status (com as regras do fluxo) e edição da demanda, sempre gravando no histórico.

import express, { Request, Response } from "express";
import { pool } from "../database/database";
import { RowDataPacket } from "mysql2";
import { PoolConnection } from "mysql2/promise";
import { buscarFeriado } from "../services/feriados";

const router = express.Router();

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

        if (demanda.fk_usuario_responsavel !== u.id && !(await temAcessoAoProjeto(u, demanda.fk_projeto))) {
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

        if (u.perfil === "MEMBRO") {
            return res.status(403).json({ mensagem: "Membro da equipe não pode editar demandas." });
        }

        const demanda = await buscarDemanda(id);
        if (!demanda) return res.status(404).json({ mensagem: "Demanda não encontrada." });

        if (!(await temAcessoAoProjeto(u, demanda.fk_projeto))) {
            return res.status(403).json({ mensagem: "Você não participa deste projeto." });
        }

        const { titulo, descricao, prioridade, responsavelId, prazo } = req.body;
        const mudancas: Mudanca[] = [];

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

        // prazo vazio: remove o prazo da demanda
        if ((prazo === null || prazo === "") && demanda.prazo !== null) {
            mudancas.push({ campo: "prazo", coluna: "prazo_finalizacao", valor: null, anterior: demanda.prazo, novo: null });
        }

        // prazo (com checagem de feriado)
        if (prazo !== undefined && prazo !== null && prazo !== "") {
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

        // prioridade
        if (prioridade !== undefined && prioridade !== demanda.prioridade_codigo) {
            const [p] = await pool.query<RowDataPacket[]>(
                "SELECT id_prioridade AS id, nome FROM prioridade WHERE codigo = ?",
                [prioridade]
            );
            if (p.length === 0) {
                return res.status(400).json({ mensagem: "Prioridade inexistente.", campo: "prioridade" });
            }
            mudancas.push({
                campo: "prioridade", coluna: "fk_prioridade_id_prioridade", valor: p[0].id,
                anterior: demanda.prioridade_nome, novo: p[0].nome,
            });
        }

        // responsável
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
                mudancas.push({
                    campo: "responsavel", coluna: "fk_usuario_responsavel", valor: novoResp,
                    anterior: demanda.responsavel_nome ?? "sem responsável",
                    novo: nomeNovo ?? "sem responsável",
                });
            }
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
