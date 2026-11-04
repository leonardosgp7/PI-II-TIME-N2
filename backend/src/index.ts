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
import projetosRoutes from './routes/projetos';
import authRoutes from './routes/auth';
import { authMiddleware } from './middlewares/auth.middleware';
import { buscarFeriado } from './services/feriados';

const app = express();
const PORTA = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
//app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware)


app.use('/api/auth', authRoutes);
app.use('/api/demandas', demandaRoutes);
app.use('/api/usuarios', usersRoutes);
app.use('/api/projetos', projetosRoutes);

app.get('/api/saude', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

/*
Autor: Vittor Maia Hagge
RA: 26025923
*/
app.get('/api/feriados/verificar', async (req: Request, res: Response) => {
  const { data } = req.query;

  if (!data) {
    return res.status(400).json({ mensagem: "Informe a data. Exemplo: ?data=2026-12-25" });
  }

  try {
    const feriado = await buscarFeriado(String(data));

    if (feriado) {
      return res.status(200).json({ feriado: true, mensagem: "Essa data é feriado: " + feriado.name + "." });
    }

    return res.status(200).json({ feriado: false, mensagem: "Essa data não é feriado." });
  } catch (erro) {
    return res.status(500).json({ mensagem: "Não foi possível consultar os feriados. Tente novamente." });
  }
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