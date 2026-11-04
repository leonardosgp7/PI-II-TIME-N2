/*
Autor: Lucas Augusto Pacola Zillo
RA: 26026539
*/

document.addEventListener('DOMContentLoaded', carregarDemanda);

async function carregarDemanda() {
  limparMensagem();

  const parametros = new URLSearchParams(window.location.search);
  const id = Number(parametros.get('id'));

  if (!Number.isInteger(id) || id <= 0) {
    mostrarMensagem('Demanda não encontrada.');
    return;
  }

  try {
    const demanda = await api.get('/demandas/' + id);
    mostrarDemanda(demanda);
  } catch (erro) {
    mostrarMensagem(erro.message);
  }
}

function formatarDataHora(texto) {
  if (!texto) return '-';
  const [dia, hora] = texto.split(' ');
  const [ano, mes, diaMes] = dia.split('-');
  return `${diaMes}/${mes}/${ano} ${(hora || '').slice(0, 5)}`.trim();
}

function mostrarDemanda(demanda) {
  const responsavel = demanda.responsavel ? demanda.responsavel.nome : 'Sem responsável';

  document.getElementById('breadcrumb-numero').textContent = `#${demanda.id}`;
  document.getElementById('numero').textContent = `Demanda #${demanda.id}`;
  document.getElementById('titulo').textContent = demanda.titulo;
  document.getElementById('descricao').textContent = demanda.descricao || 'Sem descrição.';

  mostrarEtiqueta('tag-status', 'status', demanda.status);
  mostrarEtiqueta('tag-prioridade', 'prioridade', demanda.prioridade);
  mostrarEtiqueta('tag-tipo', 'tipo', demanda.tipo);

  document.getElementById('botaoEditar').href = `editar_demanda.html?id=${demanda.id}`;

  if (obterUsuarioLogado().perfil === 'MEMBRO') {
    document.getElementById('botaoEditar').classList.add('d-none');
  }

  document.getElementById('projeto').textContent = demanda.projeto.nome;
  document.getElementById('responsavel').textContent = responsavel;
  document.getElementById('criada-por').textContent = demanda.criadaPor.nome;
  document.getElementById('data-criacao').textContent = formatarDataHora(demanda.dataCriacao);
  document.getElementById('data-atualizacao').textContent = formatarDataHora(demanda.dataAtualizacao);
  document.getElementById('prazo').textContent = formatarData(demanda.prazo);
    mostrarComentarios(demanda.comentarios);
    mostrarHistorico(demanda.historico);
    mostrarBotoesStatus(demanda);
}

function mostrarEtiqueta(idElemento, campo, codigo) {
  const etiqueta = document.getElementById(idElemento);
  etiqueta.textContent = ROTULOS[campo][codigo];
  etiqueta.className = `badge rounded-pill ${campo}-${codigo}`;
}

function iniciais(nome) {
  const partes = String(nome).trim().split(/\s+/);
  const primeira = partes[0] ? partes[0][0] : '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

function mostrarComentarios(comentarios) {
  const lista = document.getElementById('lista-comentarios');
  document.getElementById('titulo-comentarios').textContent = `Comentários (${comentarios.length})`;

  lista.innerHTML = comentarios.map((c) => `
    <div class="d-flex gap-3 bg-body-tertiary rounded p-3">
      <div class="avatar">${escaparHtml(iniciais(c.autor.nome))}</div>
      <div class="flex-grow-1">
        <div class="d-flex justify-content-between">
          <strong>${escaparHtml(c.autor.nome)}</strong>
          <time class="small text-secondary">${escaparHtml(formatarDataHora(c.dataHora))}</time>
        </div>
        <p class="mb-0 mt-1">${escaparHtml(c.texto)}</p>
      </div>
    </div>
  `).join('');
}

async function enviarComentario() {
  limparMensagem();

  const campo = document.getElementById('novo-comentario');
  const texto = campo.value.trim();

  if (texto === '') {
    mostrarMensagem('Escreva o comentário antes de enviar.');
    return;
  }

  const id = Number(new URLSearchParams(window.location.search).get('id'));

  try {
    await api.post('/demandas/' + id + '/comentarios', { texto });
    campo.value = '';
    await carregarDemanda();
  } catch (erro) {
    mostrarMensagem(erro.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('botao-comentar').addEventListener('click', enviarComentario);
});

function frasePorHistorico(h) {
  const quem = `<strong>${escaparHtml(h.usuario.nome)}</strong>`;
  const antes = escaparHtml(h.valorAnterior);
  const depois = escaparHtml(h.valorNovo);
  const tipo = String(h.tipoAlteracao).toLowerCase();

  if (tipo === 'criacao' || tipo === 'criação') {
    return `${quem} criou a demanda com o status <strong>${depois}</strong>.`;
  }

  const nomes = {
    status: 'o status da demanda',
    prioridade: 'a prioridade da demanda',
    responsavel: 'o responsável da demanda',
    prazo: 'o prazo da demanda',
    titulo: 'o título da demanda',
    descricao: 'a descrição da demanda'
  };
  const alvo = nomes[tipo] || `o campo ${escaparHtml(h.tipoAlteracao)}`;

  return `${quem} alterou ${alvo} de <strong>${antes || '-'}</strong> para <strong>${depois || '-'}</strong>.`;
}

function mostrarHistorico(historico) {
  const lista = document.getElementById('lista-historico');

  if (historico.length === 0) {
    lista.innerHTML = '<li>Nenhuma alteração registrada.</li>';
    return;
  }

  lista.innerHTML = historico.map((h) => `
    <li>
      ${frasePorHistorico(h)}
      <time>${escaparHtml(formatarDataHora(h.dataHora))}</time>
    </li>
  `).join('');
}

const PROXIMOS_STATUS = {
  ABERTA: [{ codigo: 'EM_ANDAMENTO', texto: 'Iniciar' }],
  EM_ANDAMENTO: [{ codigo: 'EM_REVISAO', texto: 'Enviar para revisão' }],
  EM_REVISAO: [
    { codigo: 'CONCLUIDA', texto: 'Concluir' },
    { codigo: 'EM_ANDAMENTO', texto: 'Devolver para andamento' }
  ]
};

function botoesPermitidos(demanda, usuario) {
  const perfil = usuario ? usuario.perfil : null;
  let botoes = [...(PROXIMOS_STATUS[demanda.status] || [])];

  if (perfil === 'MEMBRO') {
    const ehResponsavel = demanda.responsavel && demanda.responsavel.id === usuario.id;
    if (!ehResponsavel) return [];
    botoes = botoes.filter((b) => b.codigo === 'EM_ANDAMENTO' || b.codigo === 'EM_REVISAO');
  }

  if (demandaEmAberto(demanda)) {
    botoes.push({ codigo: 'CANCELADA', texto: 'Cancelar', perigo: true });
  }

  return botoes;
}

function mostrarBotoesStatus(demanda) {
  const aviso = document.getElementById('area-acoes');
  const usuario = obterUsuarioLogado();
  const botoes = botoesPermitidos(demanda, usuario);

  if (botoes.length === 0) {
    aviso.innerHTML = '<p class="text-secondary">Nenhuma ação disponível para o seu perfil nesta demanda.</p>';
    return;
  }

  aviso.innerHTML = '<div class="d-flex flex-wrap gap-2 mb-3" id="botoes-status"></div>';
  const area = document.getElementById('botoes-status');

  botoes.forEach((b) => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = b.perigo ? 'btn btn-outline-danger' : 'btn btn-outline-primary';
    botao.textContent = b.texto;
    botao.addEventListener('click', () => mudarStatus(demanda.id, b));
    area.appendChild(botao);
  });
}

async function mudarStatus(id, botao) {
  limparMensagem();

  if (botao.codigo === 'CANCELADA') {
    const confirmou = window.confirm('Tem certeza que deseja cancelar esta demanda?');
    if (!confirmou) return;
  }

  try {
    await api.put('/demandas/' + id + '/status', { status: botao.codigo });
    await carregarDemanda();
  } catch (erro) {
    mostrarMensagem(erro.message);
  }
}