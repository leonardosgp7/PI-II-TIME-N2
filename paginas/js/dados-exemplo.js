

const USUARIO_EXEMPLO = { id: 1, nome: 'Ana Souza', perfil: 'ADMINISTRADOR' };

function dataDaquiA(dias) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

const PORTAL = { id: 1, nome: 'Portal Academico' };
const MOBILE = { id: 2, nome: 'Aplicativo Mobile' };
const FINANCEIRO = { id: 3, nome: 'Integração Financeira' };

const DIEGO = { id: 2, nome: 'Diego Almeida' };
const ELISA = { id: 3, nome: 'Elisa Nunes' };
const FELIPE = { id: 4, nome: 'Felipe Tavares' };

const DEMANDAS_EXEMPLO = [
  { id: 1, titulo: 'Tela de login nao valida senha vazia', tipo: 'DEFEITO', prioridade: 'CRITICA', status: 'EM_ANDAMENTO', projeto: PORTAL, responsavel: DIEGO, dataCriacao: dataDaquiA(-20), prazo: dataDaquiA(2) },
  { id: 2, titulo: 'Cadastro de disciplinas', tipo: 'TAREFA', prioridade: 'CRITICA', status: 'ABERTA', projeto: PORTAL, responsavel: ELISA, dataCriacao: dataDaquiA(-20), prazo: dataDaquiA(15) },
  { id: 3, titulo: 'Exportar historico em PDF', tipo: 'MELHORIA', prioridade: 'MEDIA', status: 'EM_REVISAO', projeto: PORTAL, responsavel: DIEGO, dataCriacao: dataDaquiA(-20), prazo: dataDaquiA(4) },
  { id: 4, titulo: 'Documentar endpoints da API', tipo: 'DOCUMENTACAO', prioridade: 'BAIXA', status: 'ABERTA', projeto: PORTAL, responsavel: null, dataCriacao: dataDaquiA(-20), prazo: null },
  { id: 5, titulo: 'Push notification de notas', tipo: 'MELHORIA', prioridade: 'ALTA', status: 'ABERTA', projeto: MOBILE, responsavel: FELIPE, dataCriacao: dataDaquiA(-20), prazo: dataDaquiA(20) },
  { id: 6, titulo: 'Crash ao abrir o app sem internet', tipo: 'DEFEITO', prioridade: 'CRITICA', status: 'ABERTA', projeto: MOBILE, responsavel: null, dataCriacao: dataDaquiA(-20), prazo: dataDaquiA(-3) },
  { id: 7, titulo: 'Splash screen da nova identidade', tipo: 'TAREFA', prioridade: 'BAIXA', status: 'CONCLUIDA', projeto: MOBILE, responsavel: FELIPE, dataCriacao: dataDaquiA(-20), prazo: dataDaquiA(-5) },
  { id: 8, titulo: 'Conciliação automática de boletos', tipo: 'TAREFA', prioridade: 'ALTA', status: 'EM_ANDAMENTO', projeto: FINANCEIRO, responsavel: ELISA, dataCriacao: dataDaquiA(-20), prazo: dataDaquiA(10) },
  { id: 9, titulo: 'Timeout na consulta de saldo', tipo: 'DEFEITO', prioridade: 'ALTA', status: 'CANCELADA', projeto: FINANCEIRO, responsavel: null, dataCriacao: dataDaquiA(-20), prazo: null },
  { id: 10, titulo: 'Manual de implantação', tipo: 'DOCUMENTACAO', prioridade: 'MEDIA', status: 'CONCLUIDA', projeto: FINANCEIRO, responsavel: ELISA, dataCriacao: dataDaquiA(-20), prazo: dataDaquiA(1) }
];

const PROJETOS_EXEMPLO = [PORTAL, MOBILE, FINANCEIRO];

// "projetos" = ids dos projetos em que o usuário participa
const USUARIOS_EXEMPLO = [
  { id: 1, nome: 'Ana Souza', email: 'ana.souza@exemplo.com', perfil: 'ADMINISTRADOR', ativo: true, projetos: [] },
  { id: 2, nome: 'Diego Almeida', email: 'diego.almeida@exemplo.com', perfil: 'MEMBRO', ativo: true, projetos: [1] },
  { id: 3, nome: 'Elisa Nunes', email: 'elisa.nunes@exemplo.com', perfil: 'LIDER', ativo: true, projetos: [1, 3] },
  { id: 4, nome: 'Felipe Tavares', email: 'felipe.tavares@exemplo.com', perfil: 'MEMBRO', ativo: true, projetos: [2] },
  { id: 5, nome: 'Gustavo Lima', email: 'gustavo.lima@exemplo.com', perfil: 'LIDER', ativo: false, projetos: [] }
];

// Simula as respostas da API. Adicionar aqui as rotas que cada página for usando.
async function respostaExemplo(metodo, caminho, corpo) {
  if (metodo === 'GET' && caminho === '/demandas') {
    return DEMANDAS_EXEMPLO;
  }

  if (metodo === 'GET' && caminho === '/projetos') {
    return PROJETOS_EXEMPLO;
  }

  if (metodo === 'GET' && caminho === '/usuarios') {
    return USUARIOS_EXEMPLO;
  }

  if (metodo === 'POST' && caminho === '/usuarios') {
    if (USUARIOS_EXEMPLO.some((u) => u.email === corpo.email)) {
      throw new Error('Já existe um usuário com esse e-mail.');
    }
    const novo = { id: USUARIOS_EXEMPLO.length + 1, ativo: true, projetos: [], ...corpo };
    delete novo.senha;
    USUARIOS_EXEMPLO.push(novo);
    return novo;
  }

  const rotaUsuario = caminho.match(/^\/usuarios\/(\d+)$/);
  if (metodo === 'PUT' && rotaUsuario) {
    const usuario = USUARIOS_EXEMPLO.find((u) => u.id === Number(rotaUsuario[1]));
    if (!usuario) throw new Error('Usuário não encontrado.');
    Object.assign(usuario, corpo);
    delete usuario.senha;
    return usuario;
  }

  throw new Error(`Rota ${metodo} ${caminho} ainda não tem dado de exemplo (ver dados-exemplo.js).`);
}
