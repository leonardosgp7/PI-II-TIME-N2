/*
Autor: João Antero Paiva
RA: 26028470
*/

import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../database/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";

const router = express.Router();

// Busca um usuario so, no mesmo formato da lista (sem a senha_hash).
// Serve para devolver o usuario depois de cadastrar ou de editar.
async function buscarUsuarioPorId(id: number) {
  const [usuarios] = await pool.query<RowDataPacket[]>(
    `SELECT u.id_usuario, u.nome, u.email, u.ativo, p.codigo AS perfil
       FROM usuario u
       JOIN perfil p ON p.id_perfil = u.fk_perfil_id_perfil
      WHERE u.id_usuario = ?`,
    [id]
  );

  if (usuarios.length === 0) {
    return null;
  }

  const [vinculos] = await pool.query<RowDataPacket[]>(
    `SELECT fk_projeto_id_projeto AS id_projeto
       FROM participa
      WHERE fk_usuario_id_usuario = ?`,
    [id]
  );

  const usuario = usuarios[0];

  return {
    id: usuario.id_usuario,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    ativo: Boolean(usuario.ativo),
    projetos: vinculos.map((vinculo) => vinculo.id_projeto),
  };
}

// O front manda o perfil como codigo ('MEMBRO'), mas o banco guarda o id.
async function idDoPerfil(codigo: string) {
  const [perfis] = await pool.query<RowDataPacket[]>(
    `SELECT id_perfil FROM perfil WHERE codigo = ?`,
    [codigo]
  );

  return perfis.length === 0 ? null : perfis[0].id_perfil;
}

// GET /api/usuarios
// Devolve a lista no formato que o front espera, sem a senha_hash:
// { id, nome, email, perfil, ativo, projetos: [idProjeto] }
// Administrador vê todos. Líder e Membro só veem quem está nos projetos deles.
router.get("/", async (req: Request, res: Response) => {
  const logado = res.locals.usuario;

  try {
    const [usuarios] = await pool.query<RowDataPacket[]>(
      `SELECT u.id_usuario, u.nome, u.email, u.ativo, p.codigo AS perfil
         FROM usuario u
         JOIN perfil p ON p.id_perfil = u.fk_perfil_id_perfil
        ORDER BY u.nome`
    );

    const [vinculos] = await pool.query<RowDataPacket[]>(
      `SELECT fk_usuario_id_usuario AS id_usuario,
              fk_projeto_id_projeto AS id_projeto
         FROM participa`
    );

    function projetosDoUsuario(idUsuario: number) {
      return vinculos
        .filter((vinculo) => vinculo.id_usuario === idUsuario)
        .map((vinculo) => vinculo.id_projeto);
    }

    const lista = usuarios.map((usuario) => ({
      id: usuario.id_usuario,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      ativo: Boolean(usuario.ativo),
      projetos: projetosDoUsuario(usuario.id_usuario),
    }));

    if (logado.perfil === "ADMINISTRADOR") {
      res.json(lista);
      return;
    }

    const meusProjetos = projetosDoUsuario(logado.id);

    const visiveis = lista.filter((usuario) => {
      if (usuario.id === logado.id) return true;
      return usuario.projetos.some((idProjeto) => meusProjetos.includes(idProjeto));
    });

    res.json(visiveis);
  } catch (erro) {
    console.error("Erro ao buscar usuários:", erro);
    res.status(500).json({ mensagem: "Erro ao buscar usuários." });
  }
});

// POST /api/usuarios
// Cadastra um usuario novo. Só o administrador pode.
router.post("/", async (req: Request, res: Response) => {
  if (res.locals.usuario.perfil !== "ADMINISTRADOR") {
    res.status(403).json({ mensagem: "Apenas o administrador pode cadastrar usuários." });
    return;
  }

  const nome = String(req.body.nome ?? "").trim();
  const email = String(req.body.email ?? "").trim();
  const senha = String(req.body.senha ?? "");
  const perfil = String(req.body.perfil ?? "");

  if (!nome) {
    res.status(400).json({ mensagem: "Informe o nome do usuário." });
    return;
  }

  if (!email) {
    res.status(400).json({ mensagem: "Informe o e-mail do usuário." });
    return;
  }

  if (senha.length < 6) {
    res.status(400).json({ mensagem: "A senha deve ter no mínimo 6 caracteres." });
    return;
  }

  try {
    const idPerfil = await idDoPerfil(perfil);
    if (!idPerfil) {
      res.status(400).json({ mensagem: "Perfil inválido." });
      return;
    }

    const [existentes] = await pool.query<RowDataPacket[]>(
      `SELECT id_usuario FROM usuario WHERE email = ?`,
      [email]
    );

    if (existentes.length > 0) {
      res.status(400).json({ mensagem: "Já existe um usuário com esse e-mail." });
      return;
    }

    // A senha nunca é guardada como o usuário digitou, só o hash do bcrypt
    const senhaHash = bcrypt.hashSync(senha, 10);

    const [resultado] = await pool.query<ResultSetHeader>(
      `INSERT INTO usuario (nome, email, senha_hash, fk_perfil_id_perfil)
       VALUES (?, ?, ?, ?)`,
      [nome, email, senhaHash, idPerfil]
    );

    const criado = await buscarUsuarioPorId(resultado.insertId);
    res.status(201).json(criado);
  } catch (erro) {
    console.error("Erro ao cadastrar usuário:", erro);
    res.status(500).json({ mensagem: "Erro ao cadastrar usuário." });
  }
});

// PUT /api/usuarios/:id
// A tela de administração usa esta rota de dois jeitos:
// 1) editando o usuário  -> manda nome, perfil, ativo e às vezes uma senha nova
// 2) montando a equipe   -> manda só a lista de projetos
router.put("/:id", async (req: Request, res: Response) => {
  if (res.locals.usuario.perfil !== "ADMINISTRADOR") {
    res.status(403).json({ mensagem: "Apenas o administrador pode editar usuários." });
    return;
  }

  const id = Number(req.params.id);
  const mudouDados = req.body.nome !== undefined;
  const mudouProjetos = Array.isArray(req.body.projetos);

  const nome = String(req.body.nome ?? "").trim();
  const perfil = String(req.body.perfil ?? "");
  const senha = String(req.body.senha ?? "");

  if (mudouDados && !nome) {
    res.status(400).json({ mensagem: "Informe o nome do usuário." });
    return;
  }

  if (senha && senha.length < 6) {
    res.status(400).json({ mensagem: "A nova senha deve ter no mínimo 6 caracteres." });
    return;
  }

  try {
    const usuario = await buscarUsuarioPorId(id);
    if (!usuario) {
      res.status(404).json({ mensagem: "Usuário não encontrado." });
      return;
    }

    if (mudouDados) {
      const idPerfil = await idDoPerfil(perfil);
      if (!idPerfil) {
        res.status(400).json({ mensagem: "Perfil inválido." });
        return;
      }

      const ativo = req.body.ativo === undefined ? usuario.ativo : Boolean(req.body.ativo);

      await pool.query(
        `UPDATE usuario
            SET nome = ?, fk_perfil_id_perfil = ?, ativo = ?
          WHERE id_usuario = ?`,
        [nome, idPerfil, ativo, id]
      );

      // A senha só muda quando o administrador digita uma nova
      if (senha) {
        await pool.query(
          `UPDATE usuario SET senha_hash = ? WHERE id_usuario = ?`,
          [bcrypt.hashSync(senha, 10), id]
        );
      }
    }

    if (mudouProjetos) {
      // Apaga os vínculos antigos e grava a lista que veio da tela
      await pool.query(
        `DELETE FROM participa WHERE fk_usuario_id_usuario = ?`,
        [id]
      );

      for (const idProjeto of req.body.projetos) {
        await pool.query(
          `INSERT INTO participa (fk_projeto_id_projeto, fk_usuario_id_usuario)
           VALUES (?, ?)`,
          [Number(idProjeto), id]
        );
      }
    }

    const atualizado = await buscarUsuarioPorId(id);
    res.json(atualizado);
  } catch (erro) {
    console.error("Erro ao editar usuário:", erro);
    res.status(500).json({ mensagem: "Erro ao editar usuário." });
  }
});

export default router;
