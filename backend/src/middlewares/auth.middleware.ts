/*
Autor: Leonardo Setti Garcia Peres
RA: 26029250
*/

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const ROTAS_PUBLICAS = ['/api/auth/login', '/api/saude'];

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (ROTAS_PUBLICAS.includes(req.path)) {
    next();
    return;
  }

  const cabecalho = req.headers.authorization;
  if (!cabecalho || !cabecalho.startsWith('Bearer ')) {
    res.status(401).json({ mensagem: 'Faça login para continuar.' });
    return;
  }

  const token = cabecalho.replace('Bearer ', '');

  try {
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
