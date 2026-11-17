/*
Autor: Leonardo Setti Garcia Peres
RA: 26029250
*/
// Cadastro de projetos pela tela de Administração (a listagem fica em projetos.ts).

import express, { Request, Response } from "express";
import { pool } from "../database/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";

const router = express.Router();

// POST /api/projetos: só o Administrador cria projetos; o nome não pode repetir
router.post("/", async (req: Request, res: Response) => {
  if (res.locals.usuario.perfil !== "ADMINISTRADOR") {
    res.status(403).json({ mensagem: "Apenas o administrador pode cadastrar projetos." });
    return;
  }

  const nome = String(req.body.nome ?? "").trim();
  const descricao = String(req.body.descricao ?? "").trim();

  if (!nome) {
    res.status(400).json({ mensagem: "Informe o nome do projeto." });
    return;
  }
  if (nome.length > 150) {
    res.status(400).json({ mensagem: "O nome do projeto pode ter no máximo 150 caracteres." });
    return;
  }

  try {
    const [existentes] = await pool.query<RowDataPacket[]>(
      "SELECT 1 FROM projeto WHERE nome = ?",
      [nome]
    );
    if (existentes.length > 0) {
      res.status(400).json({ mensagem: "Já existe um projeto com esse nome." });
      return;
    }

    const [resultado] = await pool.query<ResultSetHeader>(
      "INSERT INTO projeto (nome, descricao) VALUES (?, ?)",
      [nome, descricao || null]
    );

    res.status(201).json({ id: resultado.insertId, nome: nome });
  } catch (erro) {
    console.error("Erro ao cadastrar projeto:", erro);
    res.status(500).json({ mensagem: "Erro ao cadastrar projeto." });
  }
});

export default router;
