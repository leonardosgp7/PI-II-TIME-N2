
const DIAS_ALERTA_PRAZO = 7;

document.addEventListener('DOMContentLoaded', carregarDashboard);

async function carregarDashboard() {
  limparMensagem();

  try {
    const demandas = await api.get('/demandas');

    mostrarSubtitulo(demandas);
    mostrarIndicadoresStatus(demandas);
    mostrarGraficoBarras('graficoPrioridade', demandas, 'prioridade');
    mostrarGraficoBarras('graficoTipo', demandas, 'tipo');
    mostrarListaCriticas(demandas);
    mostrarListaPrazo(demandas);
  } catch (erro) {
    mostrarMensagem(erro.message);
  }
}

function contarPor(demandas, campo) {
  const contagem = {};
  for (const codigo in ROTULOS[campo]) {
    contagem[codigo] = 0;
  }
  for (const demanda of demandas) {
    if (demanda[campo] in contagem) {
      contagem[demanda[campo]]++;
    }
  }
  return contagem;
}

function mostrarSubtitulo(demandas) {
  document.getElementById('subtitulo').textContent =
    `Total de ${demandas.length} demanda(s) visíveis para o seu perfil.`;
}

function criarCartaoIndicador(valor, rotulo, classeExtra = '') {
  return `
    <div class="col">
      <div class="card indicador ${classeExtra} h-100">
        <div class="card-body">
          <div class="fs-2 fw-bold lh-1">${valor}</div>
          <div class="text-uppercase text-secondary small">${rotulo}</div>
        </div>
      </div>
    </div>`;
}

function mostrarIndicadoresStatus(demandas) {
  const contagem = contarPor(demandas, 'status');

  let html = criarCartaoIndicador(demandas.length, 'Total de demandas');
  for (const status in contagem) {
    html += criarCartaoIndicador(contagem[status], ROTULOS.status[status], `indicador-${status}`);
  }

  document.getElementById('indicadoresStatus').innerHTML = html;
}

/* ---------- Barras por prioridade / tipo ---------- */

function mostrarGraficoBarras(idElemento, demandas, campo) {
  const contagem = contarPor(demandas, campo);
  const total = demandas.length;

  let html = '';
  for (const codigo in contagem) {
    const quantidade = contagem[codigo];
    const porcentagem = total > 0 ? Math.round((quantidade / total) * 100) : 0;

    html += `
      <div class="mb-3">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="badge rounded-pill ${campo}-${codigo}">${ROTULOS[campo][codigo]}</span>
          <span class="small text-secondary">${quantidade} (${porcentagem}%)</span>
        </div>
        <div class="progress" style="height: 8px" role="progressbar" aria-valuenow="${porcentagem}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar" style="width: ${porcentagem}%"></div>
        </div>
      </div>`;
  }

  document.getElementById(idElemento).innerHTML = html;
}

/* ---------- Listas de demandas ---------- */

// Ordena por prazo (mais próximo primeiro); demandas sem prazo vão para o fim
function ordenarPorPrazo(demandas) {
  return [...demandas].sort((a, b) => {
    if (!a.prazo) return 1;
    if (!b.prazo) return -1;
    return converterData(a.prazo) - converterData(b.prazo);
  });
}

function classePrazo(prazo) {
  const dias = diasAte(prazo);
  if (dias === null) return '';
  if (dias < 0) return 'text-danger fw-semibold';
  if (dias <= DIAS_ALERTA_PRAZO) return 'text-warning-emphasis fw-semibold';
  return '';
}

function criarItemDemanda(demanda) {
  const responsavel = demanda.responsavel ? demanda.responsavel.nome : 'Sem responsável';

  return `
    <li class="list-group-item d-flex justify-content-between align-items-start gap-3 px-0">
      <div>
        <a class="fw-semibold text-decoration-none" href="demanda.html?id=${encodeURIComponent(demanda.id)}">
          #${escaparHtml(demanda.id)} ${escaparHtml(demanda.titulo)}
        </a>
        <div class="small text-secondary">${escaparHtml(demanda.projeto.nome)} - ${escaparHtml(responsavel)}</div>
      </div>
      <div class="text-end flex-shrink-0">
        <span class="badge rounded-pill status-${demanda.status}">${ROTULOS.status[demanda.status]}</span>
        <div class="small mt-1 ${classePrazo(demanda.prazo)}">${formatarData(demanda.prazo)}</div>
      </div>
    </li>`;
}

function mostrarLista(idElemento, demandas, textoVazio) {
  const elemento = document.getElementById(idElemento);

  if (demandas.length === 0) {
    elemento.innerHTML = `<p class="text-secondary mb-0">${textoVazio}</p>`;
    return;
  }

  elemento.innerHTML = `<ul class="list-group list-group-flush">${demandas.map(criarItemDemanda).join('')}</ul>`;
}

function mostrarListaCriticas(demandas) {
  const criticas = demandas.filter((d) => d.prioridade === 'CRITICA' && demandaEmAberto(d));
  mostrarLista('listaCriticas', ordenarPorPrazo(criticas), 'Nenhuma demanda crítica em aberto.');
}

function mostrarListaPrazo(demandas) {
  const proximas = demandas.filter((d) => {
    const dias = diasAte(d.prazo);
    return demandaEmAberto(d) && dias !== null && dias <= DIAS_ALERTA_PRAZO;
  });
  mostrarLista('listaPrazo', ordenarPorPrazo(proximas), 'Nenhuma demanda próxima do prazo.');
}
