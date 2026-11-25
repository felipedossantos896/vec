const key=new URLSearchParams(location.search).get('screen')||'map',app=document.querySelector('#app');
function navigatePreview(screen) {
  if (window.parent === window) {
    location.search = '?screen=' + encodeURIComponent(screen);
    return;
  }
  window.parent.postMessage({ vecStudioScreen: screen }, location.origin);
}

app.addEventListener('click', event => {
  const link = event.target.closest('a[href^="?screen="]');
  if (!link || window.parent === window) return;
  event.preventDefault();
  navigatePreview(new URL(link.href).searchParams.get('screen'));
});
const people=[['AM','Ana Modelo','Célula Exemplo A','Acompanhar'],['BM','Bruno Modelo','Célula Exemplo A','Sem discipulador'],['CM','Carla Modelo','Célula Exemplo B','Pronto para servir']];
const list=()=>people.map(p=>'<div class="person"><span class="avatar">'+p[0]+'</span><div><strong>'+p[1]+'</strong><br><small>'+p[2]+'</small></div><span class="tag">'+p[3]+'</span></div>').join('');
const panelSections = [
  { label: 'Área', target: 'map', screens: ['map', 'member', 'care', 'host', 'multiply'], icon: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15' },
  { label: 'Pessoas', target: 'people', screens: ['people', 'profile', 'new-person', 'edit-person', 'disciples'], icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-4M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M16 3a4 4 0 0 1 0 8' },
  { label: 'Indicadores', target: 'metrics', screens: ['metrics'], icon: 'M3 21h18M6 21v-6h3v6M11 21V9h3v12M16 21V4h3v17' },
  { label: 'Configurações', target: 'settings', screens: ['settings', 'new-user', 'saved'], icon: 'M3 6h18M3 12h18M3 18h18M8 4v4M16 10v4M10 16v4' }
];

function panelNavigation(screen) {
  return `<aside class="panel-nav">
    <div class="panel-brand"><span aria-hidden="true">✝</span><strong>Área VEC</strong></div>
    <nav aria-label="Seções do painel">${panelSections.map(({ label, target, screens, icon }) =>
      `<a href="?screen=${target}"${screens.includes(screen) ? ' aria-current="page"' : ''}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icon}"/></svg><span>${label}</span>
      </a>`).join('')}</nav>
  </aside>`;
}
const shell=(title,body)=>'<div class="shell">'+panelNavigation(key)+'<section class="content"><div class="top"><div><small>Área demonstrativa / V2</small><h1>'+title+'</h1></div><div class="actions"><input aria-label="Buscar pessoas" placeholder="Buscar pessoas…"><select aria-label="Setor"><option>Todos os setores</option></select></div></div>'+body+'</section></div>';
const map=()=>'<div class="map"><div class="panel overlay"><h2>Visão da área</h2><div class="kpis"><div><strong>14</strong><small>Pessoas</small></div><div><strong>2</strong><small>Células</small></div></div><p>Todos os membros</p><p>Precisam de cuidado · 6</p><p>Sem discipulador · 3</p><p>Prontos para servir · 5</p></div><span class="pin">AM</span><span class="pin">3</span><span class="pin">BM</span>'+(key==='member'?'<div class="panel member"><div class="person"><span class="avatar">AM</span><div><strong>Ana Modelo</strong><br><small>Célula Exemplo A</small></div></div><p class="tag">Acompanhamento demonstrativo</p><div class="actions"><button class="primary">Contato</button><button>Perfil</button></div></div>':'')+'<div class="panel bottom"><h2>Central de cuidado · 6</h2>'+(key==='care'?list():'<small>Acompanhamento pastoral · dados fictícios</small>')+'</div></div>';
if(['map','member','care'].includes(key))app.innerHTML=shell('Mapa da área',map());
else if(key==='people')app.innerHTML=shell('Pessoas','<div class="panel"><div class="top"><h2>Cadastros</h2><button class="primary">+ Nova pessoa</button></div>'+list()+'</div>');
else if(key==='profile')app.innerHTML=shell('Ficha individual','<div class="panel"><div class="person"><span class="avatar">AM</span><div><h2>Ana Modelo</h2><small>Célula Exemplo A</small></div><button>Editar</button></div><h2>Jornada de crescimento</h2><p class="muted">Seis etapas independentes · exemplo sem dados reais</p><div class="actions">'+Array.from({length:6},(_,i)=>'<span class="tag">Etapa '+(i+1)+' · não informada</span>').join('')+'</div></div>');
else if(key==='login')app.innerHTML='<div class="login"><div class="panel"><small>ÁREA VEC</small><h1>Entrar no painel</h1><p class="muted">Cada rosto, uma história para cuidar.</p><label>E-mail<input type="email" placeholder="exemplo@exemplo.invalid"></label><label>Senha<input type="password" placeholder="Sua senha"></label><button class="primary">Entrar</button><small>Preview sem autenticação</small></div></div>';
else app.innerHTML='<div class="demo"><h1>Frame planejado</h1><p>O inventário registra esta tela; seu mockup ainda não foi criado.</p></div>';
