/*
Autor: João Antero Paiva
RA: 26028470
*/

import express, { Request, Response } from "express";
import { pool } from "../database/database";
import { RowDataPacket } from "mysql2";

const router = express.Router();

// GET /api/projetos
// Administrador vê todos os projetos ativos.
// Líder e Membro só veem os projetos em que estão na tabela participa.
router.get("/", async (req: Request, res: Response) => {
  const logado = res.locals.usuario;

  try {
    let projetos: RowDataPacket[];

    if (logado.perfil === "ADMINISTRADOR") {
      const [linhas] = await pool.query<RowDataPacket[]>(
        `SELECT id_projeto, nome
           FROM projeto
          WHERE ativo = TRUE
          ORDER BY nome`
      );
      projetos = linhas;
    } else {
      const [linhas] = await pool.query<RowDataPacket[]>(
        `SELECT p.id_projeto, p.nome
           FROM projeto p
           JOIN participa pa ON pa.fk_projeto_id_projeto = p.id_projeto
          WHERE pa.fk_usuario_id_usuario = ?
            AND p.ativo = TRUE
          ORDER BY p.nome`,
        [logado.id]
      );
      projetos = linhas;
    }

    res.json(
      projetos.map((projeto) => ({
        id: projeto.id_projeto,
        nome: projeto.nome,
      }))
    );
  } catch (erro) {
    console.error("Erro ao buscar projetos:", erro);
    res.status(500).json({ mensagem: "Erro ao buscar projetos." });
  }
});

export default router;
