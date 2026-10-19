
const LINKS_NAVBAR = [
  { id: 'dashboard', texto: 'Dashboard', href: 'dashboard.html' },
  { id: 'demandas', texto: 'Demandas', href: 'demandas.html' },
  { id: 'administracao', texto: 'Administração', href: 'administracao.html', soAdmin: true }
];

function criarNavbar(ativo, usuario) {
  const links = LINKS_NAVBAR.filter((link) => !link.soAdmin || usuario.perfil === 'ADMINISTRADOR').map((link) => {
    const ehAtivo = link.id === ativo;
    return `<a class="barra-topo-link${ehAtivo ? ' barra-topo-link-ativo' : ''}" href="${link.href}"${ehAtivo ? ' aria-current="page"' : ''}>${link.texto}</a>`;
  }).join('');

  return `
    <header class="barra-topo">
      <div class="barra-topo-conteudo">
        <a class="barra-topo-marca" href="dashboard.html">Demandas PI-II</a>
        <nav class="barra-topo-links" aria-label="Navegação principal">${links}</nav>
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
