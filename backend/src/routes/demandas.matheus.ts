/*
Autor: Matheus Taboada Chibani Rocha
RA: 26026115
*/

import { Router, Request, Response } from 'express';
import { pool } from '../database/database';
import { authMiddleware } from '../middlewares/auth.middleware';
import { buscarFeriado } from '../services/feriados';

const router = Router();

type Usuario = { id: number; perfil: 'ADMIN' | 'LIDER' | 'MEMBRO' };

// Regra do fluxo de status: cada status tem a lista de status para os quais pode ir
const TRANSICOES: Record<string, string[]> = {
  ABERTA: ['EM_ANDAMENTO', 'CANCELADA'],
  EM_ANDAMENTO: ['EM_REVISAO', 'CANCELADA'],
  EM_REVISAO: ['CONCLUIDA', 'EM_ANDAMENTO', 'CANCELADA'],
  CONCLUIDA: [],
  CANCELADA: [],
};

// Membro só avança até "Em revisão"
const MEMBRO_PODE = ['EM_ANDAMENTO', 'EM_REVISAO'];

// Busca uma demanda com todos os dados necessários
async function buscarDemanda(id: number) {
  const [rows]: any = await pool.query(
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
  return rows[0];
}

// Admin vê tudo; Líder e Membro só nos projetos em que participam
async function temAcessoAoProjeto(u: Usuario, projetoId: number) {
  if (u.perfil === 'ADMIN') return true;
  const [rows]: any = await pool.query(
    `SELECT 1 FROM participa
      WHERE fk_usuario_id_usuario = ? AND fk_projeto_id_projeto = ?`,
    [u.id, projetoId]
  );
  return rows.length > 0;
}

// Grava uma linha no histórico (dt_hora é preenchida sozinha pelo banco)
async function registrarHistorico(
  conn: any,
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

/* ------------------------------------------------------------------
   M1 - PUT /demandas/:id/status
------------------------------------------------------------------ */
router.put('/:id/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const u = res.locals.usuario as Usuario;
    const id = Number(req.params.id);
    const novoCodigo = req.body.status;

    if (!Number.isInteger(id) || typeof novoCodigo !== 'string') {
      return res.status(400).json({ erro: 'Informe o id e o novo status.' });
    }

    const demanda = await buscarDemanda(id);
    if (!demanda) return res.status(404).json({ erro: 'Demanda não encontrada.' });

    if (!(await temAcessoAoProjeto(u, demanda.fk_projeto))) {
      return res.status(403).json({ erro: 'Você não participa deste projeto.' });
    }

    const permitidos = TRANSICOES[demanda.status_codigo] ?? [];
    if (!permitidos.includes(novoCodigo)) {
      return res.status(400).json({
        erro: `Não é possível ir de ${demanda.status_codigo} para ${novoCodigo}.`,
      });
    }

    if (u.perfil === 'MEMBRO') {
      if (demanda.fk_usuario_responsavel !== u.id) {
        return res.status(403).json({ erro: 'Membro só altera as próprias demandas.' });
      }
      if (!MEMBRO_PODE.includes(novoCodigo)) {
        return res.status(403).json({ erro: 'Membro só pode avançar até Em revisão.' });
      }
    }

    const [novoStatus]: any = await pool.query(
      'SELECT id_status AS id, nome FROM status_demanda WHERE codigo = ?',
      [novoCodigo]
    );
    if (novoStatus.length === 0) {
      return res.status(400).json({ erro: 'Status inexistente.' });
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
        conn, id, u.id, 'status',
        demanda.status_nome, novoStatus[0].nome
      );
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    return res.json({
      id,
      status: { codigo: novoCodigo, nome: novoStatus[0].nome },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: 'Erro interno ao alterar o status.' });
  }
});

/* ------------------------------------------------------------------
   M2 - PUT /demandas/:id
   Body (todos opcionais): titulo, descricao, prioridade (codigo),
   responsavelId (numero ou null), prazo ("AAAA-MM-DD")
------------------------------------------------------------------ */
type Mudanca = {
  campo: string;   // nome que aparece no histórico
  coluna: string;  // coluna da tabela demanda (fixa no código, nunca vem do usuário)
  valor: any;      // valor que vai pro banco
  anterior: string | null;
  novo: string | null;
};

router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const u = res.locals.usuario as Usuario;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ erro: 'ID inválido.' });
    }

    const demanda = await buscarDemanda(id);
    if (!demanda) return res.status(404).json({ erro: 'Demanda não encontrada.' });

    if (!(await temAcessoAoProjeto(u, demanda.fk_projeto))) {
      return res.status(403).json({ erro: 'Você não participa deste projeto.' });
    }
    if (u.perfil === 'MEMBRO' && demanda.fk_usuario_responsavel !== u.id) {
      return res.status(403).json({ erro: 'Membro só edita as próprias demandas.' });
    }

    const { titulo, descricao, prioridade, responsavelId, prazo } = req.body;
    const mudancas: Mudanca[] = [];
    const restritas: string[] = []; // campos que só Líder/Admin podem mudar

    //  título
    if (titulo !== undefined) {
      const t = String(titulo).trim();
      if (!t) {
        return res.status(400).json({ erro: 'O título não pode ficar vazio.', campo: 'titulo' });
      }
      if (t !== demanda.titulo) {
        mudancas.push({ campo: 'título', coluna: 'titulo', valor: t, anterior: demanda.titulo, novo: t });
      }
    }

    //  descrição
    if (descricao !== undefined) {
      const d = String(descricao).trim();
      if (d !== (demanda.descricao ?? '')) {
        mudancas.push({ campo: 'descrição', coluna: 'descricao', valor: d, anterior: demanda.descricao, novo: d });
      }
    }

    //  prazo (com checagem de feriado)
    if (prazo !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(prazo) || isNaN(Date.parse(prazo))) {
        return res.status(400).json({ erro: 'Data inválida. Use AAAA-MM-DD.', campo: 'prazo' });
      }
      if (prazo !== demanda.prazo) {
        const feriado = await buscarFeriado(prazo);
        if (feriado) {
          return res.status(400).json({
            erro: `O prazo cai em um feriado (${feriado}).`,
            campo: 'prazo',
          });
        }
        mudancas.push({
          campo: 'prazo', coluna: 'prazo_finalizacao', valor: prazo,
          anterior: demanda.prazo, novo: prazo,
        });
      }
    }

    // prioridade (restrita a Líder/Admin)
    if (prioridade !== undefined && prioridade !== demanda.prioridade_codigo) {
      const [p]: any = await pool.query(
        'SELECT id_prioridade AS id, nome FROM prioridade WHERE codigo = ?',
        [prioridade]
      );
      if (p.length === 0) {
        return res.status(400).json({ erro: 'Prioridade inexistente.', campo: 'prioridade' });
      }
      restritas.push('prioridade');
      mudancas.push({
        campo: 'prioridade', coluna: 'fk_prioridade_id_prioridade', valor: p[0].id,
        anterior: demanda.prioridade_nome, novo: p[0].nome,
      });
    }

    //  responsável (restrito a Líder/Admin)
    if (responsavelId !== undefined) {
      const novoResp = responsavelId === null ? null : Number(responsavelId);
      if (novoResp !== demanda.fk_usuario_responsavel) {
        let nomeNovo: string | null = null;
        if (novoResp !== null) {
          const [r]: any = await pool.query(
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
              erro: 'Responsável inválido para este projeto.',
              campo: 'responsavel',
            });
          }
          nomeNovo = r[0].nome;
        }
        restritas.push('responsável');
        mudancas.push({
          campo: 'responsável', coluna: 'fk_usuario_responsavel', valor: novoResp,
          anterior: demanda.responsavel_nome ?? 'sem responsável',
          novo: nomeNovo ?? 'sem responsável',
        });
      }
    }

    if (restritas.length > 0 && u.perfil === 'MEMBRO') {
      return res.status(403).json({
        erro: 'Só Líder e Admin alteram prioridade e responsável.',
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
      await conn.query('UPDATE demanda SET dt_ultima_att = NOW() WHERE id_demanda = ?', [id]);
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    return res.json({ id, alteracoes: mudancas.map((m) => m.campo) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: 'Erro interno ao editar a demanda.' });
  }
});

export default router;