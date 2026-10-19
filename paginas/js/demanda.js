document.addEventListener('DOMContentLoaded', carregarDemanda);

async function carregarDemanda() {
  limparMensagem();

  const parametros = new URLSearchParams(window.location.search);
  const id = Number(parametros.get('id'));

  try {
    const demandas = await api.get('/demandas');
    const demanda = demandas.find((d) => d.id === id);

    if (!demanda) {
      mostrarMensagem('Demanda não encontrada.');
      return;
    }

    mostrarDemanda(demanda);
  } catch (erro) {
    mostrarMensagem(erro.message);
  }
}

function mostrarDemanda(demanda) {
  const responsavel = demanda.responsavel ? demanda.responsavel.nome : 'Sem responsável';

  document.getElementById('breadcrumb-numero').textContent = `#${demanda.id}`;
  document.getElementById('numero').textContent = `Demanda #${demanda.id}`;
  document.getElementById('titulo').textContent = demanda.titulo;

  document.getElementById('tag-status').textContent = ROTULOS.status[demanda.status];
  document.getElementById('tag-prioridade').textContent = ROTULOS.prioridade[demanda.prioridade];
  document.getElementById('tag-tipo').textContent = ROTULOS.tipo[demanda.tipo];

  document.getElementById('projeto').textContent = demanda.projeto.nome;
  document.getElementById('responsavel').textContent = responsavel;
  document.getElementById('data-criacao').textContent = formatarData(demanda.dataCriacao);
  document.getElementById('prazo').textContent = formatarData(demanda.prazo);
}