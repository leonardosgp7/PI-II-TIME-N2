import express, { Request, Response }   from 'express';
import cors from 'cors';

const app = express();
const PORTA = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/saude', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.listen(PORTA, () => {
  console.log(`API rodando em http://localhost:${PORTA}/api`);
});
