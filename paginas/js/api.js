/*
Autor: Leonardo Setti Garcia Peres
RA: 26029250
*/

const API_URL = 'http://localhost:3000/api';

const USAR_DADOS_EXEMPLO = true;

const CHAVE_TOKEN = 'token';
const CHAVE_USUARIO = 'usuario';

function salvarSessao(token, usuario) {
  localStorage.setItem(CHAVE_TOKEN, token);
  localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
}

function obterToken() {
  return localStorage.getItem(CHAVE_TOKEN);
}

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

function exigirLogin() {
  const usuario = obterUsuarioLogado();
  if (!usuario) {
    window.location.href = 'login.html';
  }
  return usuario;
}

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

  if (resposta.status === 401) {
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

const api = {
  get: (caminho) => requisicaoApi('GET', caminho),
  post: (caminho, corpo) => requisicaoApi('POST', caminho, corpo),
  put: (caminho, corpo) => requisicaoApi('PUT', caminho, corpo),
  delete: (caminho) => requisicaoApi('DELETE', caminho)
};
