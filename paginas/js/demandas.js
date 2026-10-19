
const DIAS_ALERTA_PRAZO = 7;

// Peso de cada prioridade, usado para ordenar
const ORDEM_PRIORIDADE = { CRITICA: 4, ALTA: 3, MEDIA: 2, BAIXA: 1 };

let demandas = [];
let projetos = [];
let usuarios = [];

document.addEventListener('DOMContentLoaded', iniciarDemandas);

async function iniciarDemandas() {
  ligarFiltros();
  await carregarDados();
}

function ligarFiltros() {
  const formulario = document.getElementById('filtros');

  formulario.addEventListener('input', mostrarDemandas);
  formulario.addEventListener('change', mostrarDemandas);

  // O reset acontece depois do evento, por isso o setTimeout
  formulario.addEventListener('reset', () => setTimeout(mostrarDemandas));
}

async function carregarDados() {
  limparMensagem();

  try {
    [demandas, projetos, usuarios] = await Promise.all([
      api.get('/demandas'),
      api.get('/projetos'),
      api.get('/usuarios')
    ]);

    preencherFiltros();
    mostrarDemandas();
  } catch (erro) {
    mostrarMensagem(erro.message);
    document.getElementById('contador').textContent = 'Não foi possível carregar as demandas.';
  }
}


/* ===================== Filtros ===================== */

function preencherOpcoes(idCampo, opcoes, textoTodos) {
  const campo = document.getElementById(idCampo);

  campo.innerHTML = `<option value="">${textoTodos}</option>` + opcoes
    .map((opcao) => `<option value="${escaparHtml(opcao.valor)}">${escaparHtml(opcao.texto)}</option>`)
    .join('');
}

function opcoesDeRotulo(campo) {
  return Object.entries(ROTULOS[campo]).map(([valor, texto]) => ({ valor, texto }));
}

function preencherFiltros() {
  preencherOpcoes('status', opcoesDeRotulo('status'), 'Todos');
  preencherOpcoes('prioridade', opcoesDeRotulo('prioridade'), 'Todas');
  preencherOpcoes('tipo', opcoesDeRotulo('tipo'), 'Todos');

  preencherOpcoes(
    'projeto',
    projetos.map((projeto) => ({ valor: String(projeto.id), texto: projeto.nome })),
    'Todos'
  );

  const responsaveis = usuarios.filter((usuario) => usuario.ativo && usuario.perfil !== 'ADMINISTRADOR');
  preencherOpcoes(
    'responsavel',
    responsaveis.map((usuario) => ({ valor: String(usuario.id), texto: usuario.nome })),
    'Todos'
  );
}

function lerFiltros() {
  return {
    busca: document.getElementById('buscar').value.trim().toLowerCase(),
    status: document.getElementById('status').value,
    prioridade: document.getElementById('prioridade').value,
    tipo: document.getElementById('tipo').value,
    projeto: document.getElementById('projeto').value,
    responsavel: document.getElementById('responsavel').value,
    minhas: document.getElementById('minhas').checked,
    ordenar: document.getElementById('ordenar').value,
    direcao: document.getElementById('direcao').value
  };
}

function combinaComBusca(demanda, busca) {
  if (!busca) return true;

  const titulo = (demanda.titulo || '').toLowerCase();
  const descricao = (demanda.descricao || '').toLowerCase();

  return titulo.includes(busca) || descricao.includes(busca);
}

function aplicarFiltros(filtros) {
  const logado = obterUsuarioLogado();

  return demandas.filter((demanda) => {
    const idResponsavel = demanda.responsavel ? String(demanda.responsavel.id) : '';

    if (!combinaComBusca(demanda, filtros.busca)) return false;
    if (filtros.status && demanda.status !== filtros.status) return false;
    if (filtros.prioridade && demanda.prioridade !== filtros.prioridade) return false;
    if (filtros.tipo && demanda.tipo !== filtros.tipo) return false;
    if (filtros.projeto && String(demanda.projeto.id) !== filtros.projeto) return false;
    if (filtros.responsavel && idResponsavel !== filtros.responsavel) return false;
    if (filtros.minhas && (!logado || idResponsavel !== String(logado.id))) return false;

    return true;
  });
}


/* ===================== Ordenação ===================== */

function valorParaOrdenar(demanda, campo) {
  if (campo === 'prioridade') {
    return ORDEM_PRIORIDADE[demanda.prioridade] || 0;
  }

  const data = converterData(campo === 'prazo' ? demanda.prazo : demanda.dataCriacao);
  return data ? data.getTime() : null;
}

function ordenarDemandas(lista, campo, direcao) {
  const fator = direcao === 'crescente' ? 1 : -1;

  return [...lista].sort((a, b) => {
    const valorA = valorParaOrdenar(a, campo);
    const valorB = valorParaOrdenar(b, campo);

    // Demanda sem data fica sempre no fim, independente da direção
    if (valorA === null && valorB === null) return 0;
    if (valorA === null) return 1;
    if (valorB === null) return -1;

    return (valorA - valorB) * fator;
  });
}


/* ===================== Tabela ===================== */

function classePrazo(demanda) {
  if (!demandaEmAberto(demanda)) return '';

  const dias = diasAte(demanda.prazo);
  if (dias === null) return '';
  if (dias < 0) return 'prazo-vencido';
  if (dias <= DIAS_ALERTA_PRAZO) return 'prazo-proximo';
  return '';
}

function criarLinha(demanda) {
  const responsavel = demanda.responsavel ? demanda.responsavel.nome : 'Sem resp.';

  return `
    <tr>
      <td class="text-secondary">#${escaparHtml(demanda.id)}</td>
      <th scope="row">
        <a class="titulo-demanda fw-semibold text-decoration-none"
           href="demanda.html?id=${encodeURIComponent(demanda.id)}">${escaparHtml(demanda.titulo)}</a>
      </th>
      <td><span class="badge rounded-pill tipo-${escaparHtml(demanda.tipo)}">${escaparHtml(ROTULOS.tipo[demanda.tipo] || demanda.tipo)}</span></td>
      <td><span class="badge rounded-pill prioridade-${escaparHtml(demanda.prioridade)}">${escaparHtml(ROTULOS.prioridade[demanda.prioridade] || demanda.prioridade)}</span></td>
      <td><span class="badge rounded-pill status-${escaparHtml(demanda.status)}">${escaparHtml(ROTULOS.status[demanda.status] || demanda.status)}</span></td>
      <td>${escaparHtml(demanda.projeto.nome)}</td>
      <td>${escaparHtml(responsavel)}</td>
      <td class="text-secondary small">${formatarData(demanda.dataCriacao)}</td>
      <td class="${classePrazo(demanda)}">${formatarData(demanda.prazo)}</td>
    </tr>`;
}

function mostrarContador(quantidadeVisivel) {
  const contador = document.getElementById('contador');

  contador.textContent = quantidadeVisivel === demandas.length
    ? `${quantidadeVisivel} demanda(s) encontrada(s).`
    : `${quantidadeVisivel} de ${demandas.length} demanda(s) encontrada(s).`;
}

function mostrarDemandas() {
  const filtros = lerFiltros();
  const lista = ordenarDemandas(aplicarFiltros(filtros), filtros.ordenar, filtros.direcao);

  mostrarContador(lista.length);

  document.getElementById('corpoDemandas').innerHTML = lista.length
    ? lista.map(criarLinha).join('')
    : `<tr>
         <td colspan="9" class="text-center text-secondary py-4">
           Nenhuma demanda encontrada com esses filtros.
         </td>
       </tr>`;
}
