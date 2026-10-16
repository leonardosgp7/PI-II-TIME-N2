/* =========================================
   administracao.js - usuários e equipes dos projetos (só ADMINISTRADOR).
   API usada:
     GET  /usuarios        -> [{ id, nome, email, perfil, ativo, projetos: [idProjeto] }]
     GET  /projetos        -> [{ id, nome }]
     POST /usuarios        -> cria usuário (inclui senha)
     PUT  /usuarios/:id    -> altera usuário (inclui a lista "projetos")
   ========================================= */

let usuarios = [];
let projetos = [];
let modalUsuario;

document.addEventListener('DOMContentLoaded', iniciarAdministracao);

async function iniciarAdministracao() {
  const logado = obterUsuarioLogado();
  if (logado && logado.perfil !== 'ADMINISTRADOR') {
    window.location.href = 'dashboard.html';
    return;
  }

  modalUsuario = new bootstrap.Modal(document.getElementById('modalUsuario'));

  document.getElementById('botaoNovoUsuario').addEventListener('click', () => abrirModal(null));
  document.getElementById('formularioUsuario').addEventListener('submit', salvarUsuario);
  document.getElementById('corpoUsuarios').addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-editar]');
    if (botao) abrirModal(Number(botao.dataset.editar));
  });

  document.getElementById('selecaoProjeto').addEventListener('change', mostrarEquipe);
  document.getElementById('botaoVincular').addEventListener('click', adicionarMembro);
  document.getElementById('listaMembros').addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-remover]');
    if (botao) removerMembro(Number(botao.dataset.remover));
  });

  document.getElementById('campoPerfil').innerHTML = Object.entries(ROTULOS.perfil)
    .map(([codigo, rotulo]) => `<option value="${codigo}">${rotulo}</option>`).join('');

  await carregarDados();
}

async function carregarDados() {
  try {
    [usuarios, projetos] = await Promise.all([api.get('/usuarios'), api.get('/projetos')]);
    mostrarUsuarios();
    mostrarSelecaoProjeto();
    mostrarEquipe();
  } catch (erro) {
    mostrarMensagem(erro.message);
  }
}

function iniciais(nome) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((parte) => parte[0].toUpperCase()).join('');
}

function etiquetaPerfil(perfil) {
  return `<span class="badge rounded-pill perfil-${perfil}">${ROTULOS.perfil[perfil] || perfil}</span>`;
}

/* ---------- Aba Usuários ---------- */

function mostrarUsuarios() {
  document.getElementById('contadorUsuarios').textContent = `${usuarios.length} usuário(s) cadastrado(s).`;

  document.getElementById('corpoUsuarios').innerHTML = usuarios.map((u) => {
    const nomesProjetos = projetos.filter((p) => u.projetos.includes(p.id)).map((p) => p.nome);
    const listaProjetos = nomesProjetos.length
      ? nomesProjetos.map((nome) => `<span class="badge text-bg-light border fw-normal">${escaparHtml(nome)}</span>`).join(' ')
      : '<span class="text-secondary">-</span>';

    return `
      <tr class="${u.ativo ? '' : 'usuario-inativo'}">
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="avatar">${escaparHtml(iniciais(u.nome))}</div>
            <div>
              <div class="fw-semibold">${escaparHtml(u.nome)}</div>
              <div class="small text-secondary">${escaparHtml(u.email)}</div>
            </div>
          </div>
        </td>
        <td>${etiquetaPerfil(u.perfil)}</td>
        <td>${listaProjetos}</td>
        <td><span class="badge rounded-pill ${u.ativo ? 'situacao-ativo' : 'situacao-inativo'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
        <td class="text-end">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-editar="${u.id}">Editar</button>
        </td>
      </tr>`;
  }).join('');
}

/* ---------- Modal de cadastro/edição ---------- */

function abrirModal(idUsuario) {
  const editando = idUsuario !== null;
  const usuario = editando ? usuarios.find((u) => u.id === idUsuario) : null;

  document.getElementById('formularioUsuario').dataset.id = editando ? idUsuario : '';
  document.getElementById('tituloUsuario').textContent = editando ? 'Editar usuário' : 'Novo usuário';
  document.getElementById('mensagemModal').innerHTML = '';

  document.getElementById('campoNome').value = usuario ? usuario.nome : '';
  document.getElementById('campoEmail').value = usuario ? usuario.email : '';
  document.getElementById('campoEmail').readOnly = editando;
  document.getElementById('campoSenha').value = '';
  document.getElementById('rotuloSenha').textContent = editando ? 'Nova senha' : 'Senha *';
  document.getElementById('avisoSenha').textContent = editando
    ? 'Deixe em branco para manter a senha atual.'
    : 'Mínimo de 6 caracteres.';
  document.getElementById('campoPerfil').value = usuario ? usuario.perfil : 'MEMBRO';
  document.getElementById('blocoAtivo').hidden = !editando;
  document.getElementById('campoAtivo').checked = usuario ? usuario.ativo : true;

  modalUsuario.show();
}

async function salvarUsuario(evento) {
  evento.preventDefault();

  const id = document.getElementById('formularioUsuario').dataset.id;
  const editando = id !== '';
  const nome = document.getElementById('campoNome').value.trim();
  const email = document.getElementById('campoEmail').value.trim();
  const senha = document.getElementById('campoSenha').value;
  const perfil = document.getElementById('campoPerfil').value;

  const erro = validarUsuario(nome, email, senha, editando);
  if (erro) {
    document.getElementById('mensagemModal').innerHTML =
      `<div class="alert alert-danger" role="alert">${escaparHtml(erro)}</div>`;
    return;
  }

  const dados = { nome, email, perfil };
  if (senha) dados.senha = senha;
  if (editando) dados.ativo = document.getElementById('campoAtivo').checked;

  try {
    if (editando) {
      await api.put(`/usuarios/${id}`, dados);
    } else {
      await api.post('/usuarios', dados);
    }
    modalUsuario.hide();
    await carregarDados();
    mostrarMensagem(editando ? 'Usuário atualizado.' : 'Usuário cadastrado.', 'sucesso');
  } catch (e) {
    document.getElementById('mensagemModal').innerHTML =
      `<div class="alert alert-danger" role="alert">${escaparHtml(e.message)}</div>`;
  }
}

function validarUsuario(nome, email, senha, editando) {
  if (!nome) return 'Informe o nome do usuário.';
  if (!/^\S+@\S+\.\S+$/.test(email)) return 'Informe um e-mail válido.';
  if (!editando && senha.length < 6) return 'A senha deve ter no mínimo 6 caracteres.';
  if (editando && senha && senha.length < 6) return 'A nova senha deve ter no mínimo 6 caracteres.';
  return null;
}

/* ---------- Aba Equipes ---------- */

function mostrarSelecaoProjeto() {
  const selecao = document.getElementById('selecaoProjeto');
  const atual = selecao.value;

  selecao.innerHTML = projetos.map((p) => `<option value="${p.id}">${escaparHtml(p.nome)}</option>`).join('');
  if (atual) selecao.value = atual;
}

function projetoSelecionado() {
  return Number(document.getElementById('selecaoProjeto').value);
}

function mostrarEquipe() {
  const idProjeto = projetoSelecionado();
  const membros = usuarios.filter((u) => u.projetos.includes(idProjeto));
  const lider = membros.find((u) => u.perfil === 'LIDER' && u.ativo);

  document.getElementById('avisoLider').innerHTML = lider
    ? `<div class="alert alert-success py-2">Líder do projeto: <strong>${escaparHtml(lider.nome)}</strong></div>`
    : '<div class="alert alert-warning py-2">Este projeto ainda não tem Líder. Adicione um usuário com perfil Líder.</div>';

  const disponiveis = usuarios.filter((u) => u.ativo && u.perfil !== 'ADMINISTRADOR' && !u.projetos.includes(idProjeto));
  document.getElementById('selecaoUsuario').innerHTML = disponiveis.length
    ? disponiveis.map((u) => `<option value="${u.id}">${escaparHtml(u.nome)} (${ROTULOS.perfil[u.perfil]})</option>`).join('')
    : '<option value="">Nenhum usuário disponível</option>';
  document.getElementById('botaoVincular').disabled = disponiveis.length === 0;

  document.getElementById('listaMembros').innerHTML = membros.length
    ? `<ul class="list-group list-group-flush">${membros.map((u) => `
        <li class="list-group-item d-flex align-items-center gap-3 px-0">
          <div class="avatar">${escaparHtml(iniciais(u.nome))}</div>
          <div class="flex-grow-1">
            <div class="fw-semibold">${escaparHtml(u.nome)}</div>
            <div class="small text-secondary">${escaparHtml(u.email)}</div>
          </div>
          ${etiquetaPerfil(u.perfil)}
          <button type="button" class="btn btn-outline-danger btn-sm" data-remover="${u.id}">Remover</button>
        </li>`).join('')}</ul>`
    : '<p class="text-secondary mb-0">Nenhum membro neste projeto.</p>';
}

async function alterarProjetosDoUsuario(idUsuario, novosProjetos) {
  limparMensagem();
  try {
    await api.put(`/usuarios/${idUsuario}`, { projetos: novosProjetos });
    await carregarDados();
  } catch (erro) {
    mostrarMensagem(erro.message);
  }
}

function adicionarMembro() {
  const idUsuario = Number(document.getElementById('selecaoUsuario').value);
  const usuario = usuarios.find((u) => u.id === idUsuario);
  if (usuario) alterarProjetosDoUsuario(idUsuario, [...usuario.projetos, projetoSelecionado()]);
}

function removerMembro(idUsuario) {
  const usuario = usuarios.find((u) => u.id === idUsuario);
  if (usuario) alterarProjetosDoUsuario(idUsuario, usuario.projetos.filter((p) => p !== projetoSelecionado()));
}
