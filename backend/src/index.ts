import express, { Request, Response }   from 'express';
import cors from 'cors';
import { buscarFeriado } from './services/feriados';

const app = express();
const PORTA = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/saude', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});


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
    


app.listen(PORTA, () => {
  console.log(`API rodando em http://localhost:${PORTA}/api`);
});
