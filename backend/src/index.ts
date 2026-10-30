/*
Autor: Leonardo Setti Garcia Peres
RA: 26029250
*/

import express, { Request, Response } from 'express';
import 'dotenv/config';
import cors from 'cors';
import { inicializarDatabase, pool } from './database/database';
import demandaRoutes from './routes/demanda';
import usersRoutes from './routes/users';
import authRoutes from './routes/auth';
import { authMiddleware } from './middlewares/auth.middleware';

const app = express();
const PORTA = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
//app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware)


app.use('/api/auth', authRoutes);
app.use('/api/demandas', demandaRoutes);
app.use('/api/usuarios', usersRoutes);

app.get('/api/saude', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

async function startServer() {
  if (!process.env.JWT_SECRET) {
    console.error('Faltou o JWT_SECRET');
    process.exit(1);
  }

  try {
    await inicializarDatabase();
    console.log('Banco inicializado com sucesso.');

    app.listen(PORTA, () => {
      console.log(`API rodando em http://localhost:${PORTA}/api`);
    });
  } catch (error) {
    console.error('Erro ao inicializar o banco:', error);
    process.exit(1);
  }
}

startServer();

export { pool };



