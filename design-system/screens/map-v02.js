(() => {
const app=document.querySelector('#app'), key=new URLSearchParams(location.search).get('screen')||'map';
if(!['map','member','care'].includes(key))return;
const data=[{id:1,n:'Ana Modelo',a:'AM',cell:'Norte',care:true,x:44,y:34},{id:2,n:'Bruno Modelo',a:'BM',cell:'Norte',care:true,x:48,y:39},{id:3,n:'Carla Modelo',a:'CM',cell:'Sul',care:false,x:70,y:58},{id:4,n:'Daniel Modelo',a:'DM',cell:'Sul',care:false,x:63,y:68},{id:5,n:'Eva Modelo',a:'EM',cell:'Norte',care:true,x:78,y:25},{id:6,n:'Fábio Modelo',a:'FM',cell:'Sul',care:true,x:null,y:null}];
let selected=key==='member'?1:null, expanded=key==='care', zoom=1, mode='all', cell='all', query='';
const icon=(name)=>{const paths={map:'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-4',search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',heart:'M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-5 5 2 11 8 16 6-5 13-11 8-16',target:'M12 2v4m0 12v4M2 12h4m12 0h4M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0',close:'M6 6l12 12M18 6L6 18'};return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="'+paths[name]+'"/></svg>'};
app.innerHTML='<div class="mx"><aside class="mx-nav"><strong>V<span>EC</span></strong><span class="mx-active">'+icon('map')+'<span>Mapa</span></span><span>'+icon('users')+'<span>Pessoas</span></span><small>STUDIO<br>V0.2</small></aside><div class="mx-main"><header class="mx-head"><div><small>ÁREA / VISÃO TERRITORIAL</small><h1>Mapa da área</h1></div><span class="mx-demo">Dados fictícios</span></header><div class="mx-tools"><label class="mx-search">'+icon('search')+'<input id="mx-search" placeholder="Buscar pessoa ou célula" aria-label="Buscar pessoa ou célula"></label><select id="mx-cell" aria-label="Célula"><option value="all">Todas as células</option><option>Norte</option><option>Sul</option></select><button id="mx-reset">Limpar</button></div><div class="mx-map"><div class="mx-world" id="mx-world"></div><aside class="mx-panel"><small>VISÃO GERAL</small><div id="mx-count" class="mx-count"></div><div class="mx-modes"><button data-mode="all">Todas as pessoas</button><button data-mode="care">Precisam de cuidado</button></div><div class="mx-legend"><i></i>Norte <i></i>Sul</div></aside><div class="mx-controls"><button id="mx-plus" aria-label="Aproximar">+</button><button id="mx-minus" aria-label="Afastar">−</button><button id="mx-center" aria-label="Restaurar zoom">'+icon('target')+'</button></div><section id="mx-member" class="mx-member" aria-label="Membro selecionado"></section><section class="mx-care"><button id="mx-toggle" aria-expanded="false"><span>'+icon('heart')+' <strong>Central de cuidado</strong> <span id="mx-care-count"></span></span><span id="mx-chevron">⌃</span></button><div id="mx-list" class="mx-list"></div></section><small class="mx-credit">Mapa ilustrativo · sem localização real</small></div><div id="mx-note" role="status" class="mx-note"></div></div></div>';
const $=s=>app.querySelector(s), normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function visible(){return data.filter(p=>(cell==='all'||p.cell===cell)&&(mode==='all'||p.care)&&normalize(p.n+' '+p.cell).includes(normalize(query)))}
function render(){const v=visible(),located=v.filter(p=>p.x!==null),care=v.filter(p=>p.care);if(!v.some(p=>p.id===selected))selected=null;
$('#mx-count').innerHTML='<div><strong>'+v.length+'</strong><small>Pessoas</small></div><div><strong>'+new Set(v.map(p=>p.cell)).size+'</strong><small>Células</small></div><div><strong>'+care.length+'</strong><small>Cuidado</small></div>';
app.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
const cluster=zoom===1&&located.some(p=>p.id===1)&&located.some(p=>p.id===2);const pins=located.filter(p=>!cluster||![1,2].includes(p.id)).map(p=>'<button class="mx-pin '+(p.cell==='Sul'?'south':'')+(p.id===selected?' chosen':'')+'" style="left:'+p.x+'%;top:'+p.y+'%" data-person="'+p.id+'" aria-label="'+p.n+'">'+p.a+(p.care?'<i aria-hidden="true">!</i>':'')+'</button>').join('');
$('#mx-world').style.transform='scale('+ (1+(zoom-1)*.25)+')';$('#mx-world').innerHTML=pins+(cluster?'<button class="mx-pin mx-cluster" style="left:46%;top:36%" id="mx-cluster" aria-label="Expandir grupo de duas pessoas">2</button>':'')+(located.length?'':'<div class="mx-empty">Nenhuma pessoa localizada neste filtro</div>');
const p=v.find(p=>p.id===selected);$('#mx-member').hidden=!p;$('#mx-member').innerHTML=p?'<div class="mx-person"><span class="mx-avatar">'+p.a+'</span><div><strong>'+p.n+'</strong><small>Célula '+p.cell+' · Membro</small></div><button id="mx-close" aria-label="Fechar cartão">'+icon('close')+'</button></div><p class="mx-state">'+(p.care?'Acompanhamento pendente':'Sem pendência demonstrativa')+'</p><small>'+ (p.x===null?'Sem localização':'Localização ilustrativa')+'</small><div class="mx-actions"><button class="primary" data-demo="Contato">Contato</button><button data-demo="Perfil">Ver perfil</button></div>':'';
$('#mx-care-count').textContent=care.length;$('#mx-toggle').setAttribute('aria-expanded',String(expanded));$('#mx-chevron').textContent=expanded?'⌄':'⌃';$('#mx-list').hidden=!expanded;$('#mx-list').innerHTML=care.length?care.map(p=>'<button class="mx-row" data-person="'+p.id+'"><span class="mx-avatar">'+p.a+'</span><span><strong>'+p.n+'</strong><small>'+ (p.x===null?'Sem localização':'Acompanhamento pendente')+'</small></span><span>›</span></button>').join(''):'<p class="mx-empty-list">Nenhuma pendência neste filtro.</p>';
}
$('#mx-search').addEventListener('input',e=>{query=e.target.value;render()});$('#mx-cell').addEventListener('change',e=>{cell=e.target.value;render()});
let openedFromList = false;
function fecharPessoa() {
  const id = selected;
  const restoreList = openedFromList;
  openedFromList = false;
  selected = null;
  if (restoreList) expanded = true;
  render();
  const trigger = restoreList
    ? $('.mx-row[data-person="' + id + '"]') || $('#mx-toggle')
    : $('.mx-pin[data-person="' + id + '"]') || $('#mx-search');
  trigger.focus();
}
app.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.person) {
    openedFromList = b.classList.contains('mx-row');
    selected = Number(b.dataset.person);
    if ([1, 2].includes(selected)) zoom = Math.max(2, zoom);
    expanded = false;
    render();
    $('#mx-close')?.focus();
    return;
  }
  if (b.dataset.demo) {
    $('#mx-note').textContent = b.dataset.demo + ' — ação demonstrativa, sem integração.';
    return;
  }
  if (b.id === 'mx-close') { fecharPessoa(); return; }
  if (b.dataset.mode) mode = b.dataset.mode;
  else if (b.id === 'mx-toggle') expanded = !expanded;
  else if (b.id === 'mx-plus' || b.id === 'mx-cluster') zoom = Math.min(3, zoom + 1);
  else if (b.id === 'mx-minus') zoom = Math.max(1, zoom - 1);
  else if (b.id === 'mx-center') zoom = 1;
  else if (b.id === 'mx-reset') {
    query = ''; cell = 'all'; mode = 'all'; selected = null; zoom = 1;
    $('#mx-search').value = ''; $('#mx-cell').value = 'all';
  } else return;
  render();
  if (b.id === 'mx-cluster') $('#mx-plus').focus();
});
app.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (selected) fecharPessoa();
  else if (expanded) {
    expanded = false;
    render();
    $('#mx-toggle').focus();
  }
});
render();
})();
