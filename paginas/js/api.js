/*
Autor: Leonardo Setti Garcia Peres
RA: 26029250
*/
// Guarda a sessão (token no localStorage) e faz as chamadas para a API.
// Com USAR_DADOS_EXEMPLO = true o front usa os dados de dados-exemplo.js.

const API_URL = 'http://localhost:3000/api';

const USAR_DADOS_EXEMPLO = false;

// Nomes das chaves usadas no localStorage
const CHAVE_TOKEN = 'token';
const CHAVE_USUARIO = 'usuario';

// Guarda o token e o usuário depois do login
function salvarSessao(token, usuario) {
  localStorage.setItem(CHAVE_TOKEN, token);
  localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
}

function obterToken() {
  return localStorage.getItem(CHAVE_TOKEN);
}

// Devolve o usuário logado, ou null se não houver sessão
function obterUsuarioLogado() {
  if (USAR_DADOS_EXEMPLO) {
    return USUARIO_EXEMPLO;
  }

  const usuario = localStorage.getItem(CHAVE_USUARIO);
  return usuario ? JSON.parse(usuario) : null;
}

// Apaga a sessão e volta para o login
function encerrarSessao() {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_USUARIO);
  window.location.href = 'login.html';
}

// Manda para o login quem abrir a página sem estar logado
function exigirLogin() {
  const usuario = obterUsuarioLogado();
  if (!usuario) {
    window.location.href = 'login.html';
  }
  return usuario;
}

// Chama a API com o token; se a resposta for 401, encerra a sessão
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

  if (resposta.status === 401 && caminho !== '/auth/login') {
    encerrarSessao();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const mensagem = (dados && dados.mensagem) || 'Erro ' + resposta.status + ' ao acessar a API.';
    throw new Error(mensagem);
  }

  return dados;
}

// Atalhos usados nas páginas: api.get, api.post, api.put e api.delete
const api = {
  get: (caminho) => requisicaoApi('GET', caminho),
  post: (caminho, corpo) => requisicaoApi('POST', caminho, corpo),
  put: (caminho, corpo) => requisicaoApi('PUT', caminho, corpo),
  delete: (caminho) => requisicaoApi('DELETE', caminho)
};
