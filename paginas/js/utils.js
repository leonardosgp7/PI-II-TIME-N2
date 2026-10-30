/*
Autor: Leonardo Setti Garcia Peres
RA: 26029250
*/

const ROTULOS = {
  status: {
    ABERTA: 'Aberta',
    EM_ANDAMENTO: 'Em andamento',
    EM_REVISAO: 'Em revisão',
    CONCLUIDA: 'Concluída',
    CANCELADA: 'Cancelada'
  },
  prioridade: {
    CRITICA: 'Crítica',
    ALTA: 'Alta',
    MEDIA: 'Média',
    BAIXA: 'Baixa'
  },
  tipo: {
    TAREFA: 'Tarefa',
    DEFEITO: 'Defeito',
    MELHORIA: 'Melhoria',
    DOCUMENTACAO: 'Documentação'
  },
  perfil: {
    ADMINISTRADOR: 'Administrador',
    LIDER: 'Líder de Projeto',
    MEMBRO: 'Membro da Equipe'
  }
};

function demandaEmAberto(demanda) {
  return demanda.status !== 'CONCLUIDA' && demanda.status !== 'CANCELADA';
}

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto == null ? '' : String(texto);
  return div.innerHTML;
}

function converterData(textoData) {
  if (!textoData) return null;
  const [ano, mes, dia] = textoData.slice(0, 10).split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

function formatarData(textoData) {
  const data = converterData(textoData);
  return data ? data.toLocaleDateString('pt-BR') : '-';
}

function diasAte(textoData) {
  const data = converterData(textoData);
  if (!data) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((data - hoje) / (1000 * 60 * 60 * 24));
}

function mostrarMensagem(texto, tipo = 'erro') {
  const area = document.getElementById('mensagem');
  if (!area) return;
  const classe = tipo === 'sucesso' ? 'alert-success' : 'alert-danger';
  area.innerHTML = `<div class="alert ${classe}" role="alert">${escaparHtml(texto)}</div>`;
}

function limparMensagem() {
  const area = document.getElementById('mensagem');
  if (area) area.innerHTML = '';
}
