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



interface Projeto {
  id: number;
  nome: string;
}

let projetos: Projeto[] = [
  { id: 1, nome: "Portal Acadêmico" },
  { id: 2, nome: "Aplicativo Mobile" },
  { id: 3, nome: "Integração Financeira" },
];

app.get('/api/projetos', (req: Request, res: Response) => {
  return res.status(200).json(projetos);
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

let demandas: Demanda[] = [
  { id: 1, titulo: "Corrigir login", descricao: "Erro ao entrar", projetoId: 1, responsavel: null, tipo: "Defeito", prioridade: "Crítica", prazo: "2026-12-10", status: "Aberta", criadorId: 1, dataCriacao: "2026-11-01T10:00:00.000Z" },
  { id: 2, titulo: "Tela de notas", descricao: "Nova tela", projetoId: 2, responsavel: "Mateus", tipo: "Melhoria", prioridade: "Média", prazo: "2026-12-11", status: "Aberta", criadorId: 1, dataCriacao: "2026-11-01T11:00:00.000Z" },
  { id: 3, titulo: "Integrar boletos", descricao: "API do banco", projetoId: 3, responsavel: null, tipo: "Tarefa", prioridade: "Difícil", prazo: "2026-12-14", status: "Aberta", criadorId: 1, dataCriacao: "2026-11-01T12:00:00.000Z" },
];
let proximoIdDemanda = 4;

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


interface Participa {
  usuarioId: number;
  projetoId: number;
}

let participa: Participa[] = [
  { usuarioId: 2, projetoId: 1 },
  { usuarioId: 3, projetoId: 2 },
  { usuarioId: 3, projetoId: 3 },
];

app.get('/api/demandas', (req: Request, res: Response) => {
  if (usuarioLogado.perfil === "Admin") {
    return res.status(200).json(demandas);
  }

  const visiveis = demandas.filter((demanda) => {
    const vinculo = participa.find((item) => item.usuarioId === usuarioLogado.id && item.projetoId === demanda.projetoId);
    return vinculo !== undefined;
  });

  return res.status(200).json(visiveis);
});


app.get('/api/historicos', (req: Request, res: Response) => {
  return res.status(200).json(historicos);
});

app.listen(PORTA, () => {
  console.log(`API rodando em http://localhost:${PORTA}/api`);
});
