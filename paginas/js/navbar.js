/* =========================================
   navbar.js - navbar única do sistema.
   Em cada página basta colocar no <body>:
     <div id="navbar" data-ativo="dashboard"></div>
   data-ativo: "dashboard" ou "demandas".
   Requer navbar.css, api.js e utils.js.
   ========================================= */

const LINKS_NAVBAR = [
  { id: 'dashboard', texto: 'Dashboard', href: 'dashboard.html' },
  { id: 'demandas', texto: 'Demandas', href: 'demandas.html' }
];

function criarNavbar(ativo, usuario) {
  const links = LINKS_NAVBAR.map((link) => {
    const ehAtivo = link.id === ativo;
    return `<a class="barra-topo-link${ehAtivo ? ' barra-topo-link-ativo' : ''}" href="${link.href}"${ehAtivo ? ' aria-current="page"' : ''}>${link.texto}</a>`;
  }).join('');

  // Administração só aparece para administradores
  const admin = usuario.perfil === 'ADMINISTRADOR'
    ? '<a class="barra-topo-link" href="#">Administração</a>'
    : '';

  return `
    <header class="barra-topo">
      <div class="barra-topo-conteudo">
        <a class="barra-topo-marca" href="dashboard.html">Demandas PI-II</a>
        <nav class="barra-topo-links" aria-label="Navegação principal">${links}${admin}</nav>
        <div class="barra-topo-usuario">
          <div class="barra-topo-usuario-info">
            ${escaparHtml(usuario.nome)}
            <strong>${escaparHtml(ROTULOS.perfil[usuario.perfil] || usuario.perfil)}</strong>
          </div>
          <button type="button" class="barra-topo-sair" id="navbarSair">Sair</button>
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
