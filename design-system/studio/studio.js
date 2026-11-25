const inventory=await fetch('../design-system/inventory.json'.replace('../design-system/','./')).then(r=>{if(!r.ok)throw Error('Inventário indisponível');return r.json()}).catch(()=>null);
const nav=document.querySelector('#nav'),select=document.querySelector('#viewport'),frame=document.querySelector('#preview'),stage=document.querySelector('#stage');
if(!inventory){document.querySelector('#status').textContent='Não foi possível carregar o inventário. Execute o servidor local conforme README.';}else{
for(const s of inventory.screens){const b=document.createElement('button');b.dataset.key=s.key;b.textContent=s.id+' · '+s.title;nav.append(b)}
for(const [i,v] of inventory.viewports.entries()){const o=document.createElement('option');o.value=i;o.textContent=v.name+' · '+v.width+' × '+v.height;select.append(o)}
function fit(){const v=inventory.viewports[Number(select.value)];const scale=Math.min(stage.clientWidth/v.width,stage.clientHeight/v.height,1);frame.style.width=v.width+'px';frame.style.height=v.height+'px';frame.style.transform='translate(-50%,-50%) scale('+scale+')'}
function open(key){const s=inventory.screens.find(x=>x.key===key);document.querySelector('#title').textContent=s?.title??(key==='foundations'?'Foundations':'Componentes');document.querySelector('#status').textContent=s?.status==='planned'?'Planejado · sem mockup ainda':'Protótipo · não aprovado';for(const b of nav.querySelectorAll('button'))b.setAttribute('aria-current',String(b.dataset.key===key));frame.src='screens/preview.html?screen='+encodeURIComponent(key)}
nav.addEventListener('click',e=>{const b=e.target.closest('button[data-key]');if(b){stage.dataset.loading='true';open(b.dataset.key)}});
frame.addEventListener('load',()=>{stage.dataset.loading='false'});
nav.addEventListener('keydown',e=>{
  const buttons=[...nav.querySelectorAll('button[data-key]')];
  const index=buttons.indexOf(e.target);
  if(index<0)return;
  const next={ArrowDown:index+1,ArrowUp:index-1,Home:0,End:buttons.length-1}[e.key];
  if(next===undefined)return;
  e.preventDefault();
  buttons[Math.max(0,Math.min(buttons.length-1,next))].focus();
});
select.addEventListener('change',fit);new ResizeObserver(fit).observe(stage);open('map');fit();
}
