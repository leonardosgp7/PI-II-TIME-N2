/*
Autor: João Antero Paiva
RA: 26028470
*/
let demandaAtual = null;
let usuarios = [];

document.addEventListener('DOMContentLoaded', iniciarEdicao);

function idDaUrl() {
  const parametros = new URLSearchParams(window.location.search);
  return Number(parametros.get('id'));
}

async function iniciarEdicao() {
  limparMensagem();

  document.getElementById('formulario').addEventListener('submit', salvarDemanda);

  const id = idDaUrl();
  document.getElementById('botaoCancelar').href = `demanda.html?id=${id}`;
  document.getElementById('linkDemanda').href = `demanda.html?id=${id}`;
  document.getElementById('linkDemanda').textContent = `#${id}`;

  await carregarDemanda();
}

async function carregarDemanda() {
  const id = idDaUrl();

  if (!id) {
    mostrarMensagem('Demanda não informada.');
    document.getElementById('subtitulo').textContent = '';
    return;
  }

  try {
    // Enquanto a rota GET /demandas/:id nao existe, busca a lista e procura pelo id.
    // E o mesmo jeito que o demanda.js faz hoje.
    const [demandas, listaUsuarios] = await Promise.all([
      api.get('/demandas'),
      api.get('/usuarios')
    ]);

    usuarios = listaUsuarios;
    demandaAtual = demandas.find((demanda) => demanda.id === id);

    if (!demandaAtual) {
      mostrarMensagem('Demanda não encontrada.');
      document.getElementById('subtitulo').textContent = '';
      return;
    }

    preencherSelects();
    preencherFormulario();
    aplicarPermissoes();

    document.getElementById('subtitulo').textContent =
      `Demanda #${demandaAtual.id} - ${ROTULOS.status[demandaAtual.status]}`;
    document.getElementById('formulario').hidden = false;
  } catch (erro) {
    mostrarMensagem(erro.message);
    document.getElementById('subtitulo').textContent = '';
  }
}


/* ===================== Preencher a tela ===================== */

function preencherSelects() {
  const campoPrioridade = document.getElementById('prioridade');
  campoPrioridade.innerHTML = Object.entries(ROTULOS.prioridade)
    .map(([codigo, rotulo]) => `<option value="${codigo}">${rotulo}</option>`)
    .join('');

  // So entra na lista quem pode receber demanda: usuario ativo que nao e administrador
  const responsaveis = usuarios.filter((usuario) => usuario.ativo && usuario.perfil !== 'ADMINISTRADOR');

  const campoResponsavel = document.getElementById('responsavel');
  campoResponsavel.innerHTML = '<option value="">Sem responsável</option>' + responsaveis
    .map((usuario) => `<option value="${usuario.id}">${escaparHtml(usuario.nome)}</option>`)
    .join('');
}

function preencherFormulario() {
  document.getElementById('titulo').value = demandaAtual.titulo || '';
  document.getElementById('descricao').value = demandaAtual.descricao || '';
  document.getElementById('projeto').value = demandaAtual.projeto.nome;
  document.getElementById('prioridade').value = demandaAtual.prioridade;
  document.getElementById('prazo').value = demandaAtual.prazo ? demandaAtual.prazo.slice(0, 10) : '';

  document.getElementById('responsavel').value = demandaAtual.responsavel
    ? String(demandaAtual.responsavel.id)
    : '';
}

// Membro da equipe nao pode mexer em prioridade nem em responsavel.
// O backend confere isso de novo, aqui e so para a tela nao enganar o usuario.
function aplicarPermissoes() {
  const logado = obterUsuarioLogado();
  const podeMudarTudo = logado.perfil === 'ADMINISTRADOR' || logado.perfil === 'LIDER';

  if (podeMudarTudo) return;

  document.getElementById('prioridade').disabled = true;
  document.getElementById('responsavel').disabled = true;
  document.getElementById('avisoPrioridade').textContent = 'Somente Líder ou Administrador pode alterar.';
  document.getElementById('avisoResponsavel').textContent = 'Somente Líder ou Administrador pode alterar.';
}


/* ===================== Salvar ===================== */

function mostrarErro(idCampo, idErro, mensagem) {
  document.getElementById(idCampo).classList.add('is-invalid');
  document.getElementById(idErro).textContent = mensagem;
}

function limparErros() {
  ['titulo', 'descricao', 'responsavel', 'prioridade', 'prazo'].forEach((idCampo) => {
    document.getElementById(idCampo).classList.remove('is-invalid');
  });

  ['erroTitulo', 'erroDescricao', 'erroResponsavel', 'erroPrioridade', 'erroPrazo'].forEach((idErro) => {
    document.getElementById(idErro).textContent = '';
  });
}

async function salvarDemanda(evento) {
  evento.preventDefault();
  limparErros();
  limparMensagem();

  const titulo = document.getElementById('titulo').value.trim();
  const descricao = document.getElementById('descricao').value.trim();
  const prioridade = document.getElementById('prioridade').value;
  const responsavel = document.getElementById('responsavel').value;
  const prazo = document.getElementById('prazo').value;

  if (titulo === '') {
    mostrarErro('titulo', 'erroTitulo', 'Digite o título.');
    return;
  }

  if (prioridade === '') {
    mostrarErro('prioridade', 'erroPrioridade', 'Selecione uma prioridade.');
    return;
  }

  const dados = {
    titulo: titulo,
    descricao: descricao,
    prioridade: prioridade,
    responsavel: responsavel === '' ? null : Number(responsavel),
    prazo: prazo === '' ? null : prazo
  };

  try {
    await api.put(`/demandas/${demandaAtual.id}`, dados);
    window.location.href = `demanda.html?id=${demandaAtual.id}`;
  } catch (erro) {
    // O prazo cair em feriado volta como erro da API
    mostrarMensagem(erro.message);
  }
}
