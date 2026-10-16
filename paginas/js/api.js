/* =========================================
   api.js - comunicação com o back-end e sessão do usuário.
   Incluir em TODAS as páginas, antes dos outros scripts.
   ========================================= */

// Endereço base da API (ajustar quando o back-end estiver pronto)
const API_URL = 'http://localhost:3000/api';

// Enquanto o back-end não existir, as páginas usam os dados de dados-exemplo.js.
// Quando a API estiver no ar: trocar para false e remover o <script> de dados-exemplo.js.
const USAR_DADOS_EXEMPLO = true;

const CHAVE_TOKEN = 'token';
const CHAVE_USUARIO = 'usuario';

/* ---------- Sessão ---------- */

// Chamar no login, depois que a API devolver o token e os dados do usuário
function salvarSessao(token, usuario) {
  localStorage.setItem(CHAVE_TOKEN, token);
  localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
}

function obterToken() {
  return localStorage.getItem(CHAVE_TOKEN);
}

// Retorna { id, nome, perfil } ou null se ninguém estiver logado
function obterUsuarioLogado() {
  if (USAR_DADOS_EXEMPLO) {
    return USUARIO_EXEMPLO;
  }

  const usuario = localStorage.getItem(CHAVE_USUARIO);
  return usuario ? JSON.parse(usuario) : null;
}

function encerrarSessao() {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_USUARIO);
  window.location.href = 'login.html';
}

// Chamar no início das páginas que exigem login
function exigirLogin() {
  const usuario = obterUsuarioLogado();
  if (!usuario) {
    window.location.href = 'login.html';
  }
  return usuario;
}

/* ---------- Requisições ---------- */

// Faz uma requisição para a API e devolve o JSON da resposta.
// Lança um Error com a mensagem da API se algo der errado.
async function requisicaoApi(metodo, caminho, corpo) {
  if (USAR_DADOS_EXEMPLO) {
    return respostaExemplo(metodo, caminho, corpo);
  }

  const opcoes = {
    method: metodo,
    headers: { 'Content-Type': 'application/json' }
  };

  const token = obterToken();
  if (token) {
    opcoes.headers.Authorization = 'Bearer ' + token;
  }

  if (corpo !== undefined) {
    opcoes.body = JSON.stringify(corpo);
  }

  let resposta;
  try {
    resposta = await fetch(API_URL + caminho, opcoes);
  } catch (erro) {
    throw new Error('Não foi possível conectar ao servidor.');
  }

  // Sessão expirada ou inválida: volta para o login
  if (resposta.status === 401) {
    encerrarSessao();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  // 204 = sucesso sem conteúdo (ex.: DELETE)
  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const mensagem = (dados && dados.mensagem) || 'Erro ' + resposta.status + ' ao acessar a API.';
    throw new Error(mensagem);
  }

  return dados;
}

// Atalhos: api.get('/demandas'), api.post('/demandas', { ... }), etc.
const api = {
  get: (caminho) => requisicaoApi('GET', caminho),
  post: (caminho, corpo) => requisicaoApi('POST', caminho, corpo),
  put: (caminho, corpo) => requisicaoApi('PUT', caminho, corpo),
  delete: (caminho) => requisicaoApi('DELETE', caminho)
};
