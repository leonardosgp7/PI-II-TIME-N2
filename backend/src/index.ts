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
    


type StatusDemanda = "Aberta" | "Em andamento" | "Concluída" | "Cancelada";
type TipoDemanda = "Defeito" | "Tarefa" | "Melhoria" | "Documentação";
type PrioridadeDemanda = "Fácil" | "Média" | "Difícil" | "Crítica";

interface Demanda {
  id: number;
  titulo: string;
  descricao: string;
  projetoId: number;
  responsavel: string | null;
  tipo: TipoDemanda;
  prioridade: PrioridadeDemanda;
  prazo: string;
  status: StatusDemanda;
  criadorId: number;
  dataCriacao: string;
}

interface Historico {
  id: number;
  demandaId: number;
  usuarioId: number;
  acao: string;
  data: string;
}

let demandas: Demanda[] = [];
let proximoIdDemanda = 1;

let historicos: Historico[] = [];
let proximoIdHistorico = 1;

const usuarioLogado = { id: 1, nome: "Vittor", perfil: "Admin" };

app.post('/api/demandas', async (req: Request, res: Response) => {
  const { titulo, descricao, projetoId, responsavel, tipo, prioridade, prazo } = req.body;

  if (!titulo || !descricao || !projetoId || !tipo || !prioridade || !prazo) {
    return res.status(400).json({ mensagem: "Título, descrição, projeto, tipo, prioridade e prazo são obrigatórios." });
  }

  try {
    const feriado = await buscarFeriado(prazo);

    if (feriado) {
      return res.status(400).json({ mensagem: "O prazo cai em um feriado: " + feriado.name + ". Escolha outra data." });
    }
  } catch (erro) {
    return res.status(500).json({ mensagem: "Não foi possível consultar os feriados. Tente novamente." });
  }

  let nomeResponsavel: string | null = null;
  if (responsavel) {
    nomeResponsavel = responsavel;
  }

  const agora = new Date().toISOString();

  const novaDemanda: Demanda = {
    id: proximoIdDemanda,
    titulo: titulo,
    descricao: descricao,
    projetoId: Number(projetoId),
    responsavel: nomeResponsavel,
    tipo: tipo,
    prioridade: prioridade,
    prazo: prazo,
    status: "Aberta",
    criadorId: usuarioLogado.id,
    dataCriacao: agora,
  };

  demandas.push(novaDemanda);
  proximoIdDemanda++;

  const novoHistorico: Historico = {
    id: proximoIdHistorico,
    demandaId: novaDemanda.id,
    usuarioId: usuarioLogado.id,
    acao: "Demanda criada",
    data: agora,
  };

  historicos.push(novoHistorico);
  proximoIdHistorico++;

  return res.status(201).json(novaDemanda);
});

app.get('/api/historicos', (req: Request, res: Response) => {
  return res.status(200).json(historicos);
});

app.listen(PORTA, () => {
  console.log(`API rodando em http://localhost:${PORTA}/api`);
});
