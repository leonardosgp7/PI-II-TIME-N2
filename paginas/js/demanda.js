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

  document.getElementById('projeto').textContent = demanda.projeto.nome;
  document.getElementById('responsavel').textContent = responsavel;
  document.getElementById('criada-por').textContent = demanda.criadaPor.nome;
  document.getElementById('data-criacao').textContent = formatarDataHora(demanda.dataCriacao);
  document.getElementById('data-atualizacao').textContent = formatarDataHora(demanda.dataAtualizacao);
  document.getElementById('prazo').textContent = formatarData(demanda.prazo);
    mostrarComentarios(demanda.comentarios);
    mostrarHistorico(demanda.historico);
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