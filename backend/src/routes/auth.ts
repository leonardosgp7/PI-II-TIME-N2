/*
Autor: Leonardo Setti Garcia Peres
RA: 26029250
*/

import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../database/database';
import { RowDataPacket } from 'mysql2';

const router = express.Router();

router.post('/login', async (req: Request, res: Response) => {
  const email = req.body.email;
  const senha = req.body.senha;

  if (!email || !senha) {
    res.status(400).json({ mensagem: 'Informe o e-mail e a senha.' });
    return;
  }

  try {
   
    const [usuarios] = await pool.query<RowDataPacket[]>(
      `SELECT u.id_usuario, u.nome, u.senha_hash, u.ativo, p.codigo AS perfil
       FROM usuario u
       JOIN perfil p ON p.id_perfil = u.fk_perfil_id_perfil
       WHERE u.email = ?`,
      [email]
    );

    if (usuarios.length === 0) {
      res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });
      return;
    }
    const usuario = usuarios[0];

    const senhaCorreta = bcrypt.compareSync(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });
      return;
    }

    if (!usuario.ativo) {
      res.status(403).json({ mensagem: 'Usuário inativo. Fale com o administrador.' });
      return;
    }

    const token = jwt.sign(
      { id: usuario.id_usuario, perfil: usuario.perfil },
      process.env.JWT_SECRET ?? '',
      { expiresIn: '8h' }
    );

    res.json({
      token: token,
      usuario: {
        id: usuario.id_usuario,
        nome: usuario.nome,
        perfil: usuario.perfil,
      },
    });
  } catch (erro) {
    console.error('Erro no login:', erro);
    res.status(500).json({ mensagem: 'Erro ao fazer login.' });
  }
});

export default router;
