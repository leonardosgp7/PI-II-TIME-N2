/*
Autor: Leonardo Setti Garcia Peres
RA: 26029250
*/
// Barra toda requisição sem token válido, menos as rotas públicas.
// Guarda o id e o perfil do usuário em res.locals.usuario para as rotas.

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Rotas que funcionam sem login
const ROTAS_PUBLICAS = ['/api/auth/login', '/api/saude'];

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (ROTAS_PUBLICAS.includes(req.path)) {
    next();
    return;
  }

  // O token vem no cabeçalho Authorization: Bearer <token>
  const cabecalho = req.headers.authorization;
  if (!cabecalho || !cabecalho.startsWith('Bearer ')) {
    res.status(401).json({ mensagem: 'Faça login para continuar.' });
    return;
  }

  const token = cabecalho.replace('Bearer ', '');

  try {
    // Confere a assinatura e a validade do token
    const dados = jwt.verify(token, process.env.JWT_SECRET ?? '');

    if (typeof dados === 'string') {
      res.status(401).json({ mensagem: 'Sessão inválida. Faça login novamente.' });
      return;
    }
    
    res.locals.usuario = { id: dados.id, perfil: dados.perfil };
    next();
  } catch (erro) {
    res.status(401).json({ mensagem: 'Sessão inválida ou expirada. Faça login novamente.' });
    return;
  }
}
