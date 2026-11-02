/*
Autor: Leonardo Setti Garcia Peres
RA: 26029250
*/
const LINKS_NAVBAR = [
  { id: 'dashboard', texto: 'Dashboard', href: 'dashboard.html' },
  { id: 'demandas', texto: 'Demandas', href: 'demandas.html' },
  { id: 'administracao', texto: 'Administração', href: 'administracao.html', soAdmin: true }
];

const ICONE_SAIR = '<svg class="barra-topo-icone" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';

function pegarIniciais(nome) {
  const partes = nome.trim().split(' ');
  let iniciais = partes[0].charAt(0);
  if (partes.length > 1) {
    iniciais = iniciais + partes[partes.length - 1].charAt(0);
  }
  return iniciais.toUpperCase();
}

function criarNavbar(ativo, usuario) {
  const links = LINKS_NAVBAR.filter((link) => !link.soAdmin || usuario.perfil === 'ADMINISTRADOR').map((link) => {
    const ehAtivo = link.id === ativo;
    return `<a class="barra-topo-link${ehAtivo ? ' barra-topo-link-ativo' : ''}" href="${link.href}"${ehAtivo ? ' aria-current="page"' : ''}>${link.texto}</a>`;
  }).join('');

  return `
    <header class="barra-topo">
      <div class="barra-topo-conteudo">
        <a class="barra-topo-marca" href="dashboard.html">
          <span class="barra-topo-nome">Demandas<small>PI-II</small></span>
        </a>
        <nav class="barra-topo-links" aria-label="Navegação principal">${links}</nav>
        <div class="barra-topo-usuario">
          <div class="barra-topo-avatar" aria-hidden="true">${escaparHtml(pegarIniciais(usuario.nome))}</div>
          <div class="barra-topo-usuario-info">
            <span class="barra-topo-usuario-nome">${escaparHtml(usuario.nome)}</span>
            <span class="barra-topo-usuario-perfil">${escaparHtml(ROTULOS.perfil[usuario.perfil] || usuario.perfil)}</span>
          </div>
          <button type="button" class="barra-topo-sair" id="navbarSair" title="Sair do sistema" aria-label="Sair do sistema">${ICONE_SAIR}</button>
        </div>
      </div>
    </header>`;
}

document.addEventListener('DOMContentLoaded', () => {
  const usuario = exigirLogin();
  const destino = document.getElementById('navbar');
  if (!usuario || !destino) return;

  destino.innerHTML = criarNavbar(destino.dataset.ativo, usuario);
  document.getElementById('navbarSair').addEventListener('click', encerrarSessao);
});
