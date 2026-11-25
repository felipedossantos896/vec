(() => {
  const app = document.querySelector('#app');
  const gallery = {
    foundations: () => `<h1>Fundamentos</h1>
      <section class="panel"><h2>Cores</h2>
        <div class="swatches">${[['cloud', 'Cloud · 60%', 'Fundo'], ['navy', 'Navy · 30%', 'Estrutura'], ['blue', 'Blue · 10%', 'Ação']].map(([token, name, use]) =>
          `<div class="swatch swatch-${token}"><strong>${name}</strong><code>--${token}</code><span>${use}</span></div>`).join('')}</div>
      </section>
      <section class="panel library-type"><h2>Tipografia</h2>
        <p class="library-title">Título de tela</p><p class="library-heading">Título de seção</p>
        <p>Texto de interface</p><small>Texto auxiliar</small>
      </section>
      <section class="panel"><h2>Densidade</h2><p>Controles de 36 px no desktop e 44 px no mobile.</p></section>`,
    components: () => `<h1>Componentes</h1>
      <section class="panel"><h2>Ações</h2>
        <div class="actions"><button class="primary" data-action="dialog">Nova pessoa</button>
        <button data-action="clear">Limpar filtros</button><button disabled>Indisponível</button></div>
      </section>
      <section class="panel"><h2>Filtros</h2>
        <div class="library-fields">
          <label>Buscar por nome<input type="search" placeholder="Ex.: Ana"></label>
          <label>Célula<select><option>Todas as células</option><option>Célula Modelo</option></select></label>
        </div><p class="muted" role="status"></p>
      </section>
      <section class="panel"><h2>Status</h2>
        <div class="actions"><span class="tag library-ok">Concluído</span><span class="tag library-warn">Pendente</span><span class="tag library-danger">Indisponível</span></div>
      </section>
      <dialog aria-labelledby="library-dialog-title"><h2 id="library-dialog-title">Nova pessoa</h2>
        <p>Cadastro demonstrativo.</p><button type="button" class="primary" autofocus>Fechar</button>
      </dialog>`
  };
  const key = new URLSearchParams(location.search).get('screen');
  if (!Object.hasOwn(gallery, key)) return;
  app.innerHTML = `<div class="demo library">${gallery[key]()}</div>`;
  if (key !== 'components') return;
  const dialog = app.querySelector('dialog');
  const search = app.querySelector('input');
  const cell = app.querySelector('select');
  const status = app.querySelector('[role="status"]');
  app.querySelector('[data-action="dialog"]').addEventListener('click', () => dialog.showModal());
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  app.querySelector('[data-action="clear"]').addEventListener('click', () => {
    search.value = '';
    cell.selectedIndex = 0;
    status.textContent = 'Filtros limpos.';
  });
  for (const field of [search, cell]) {
    field.addEventListener('input', () => {
      status.textContent = search.value || cell.selectedIndex ? 'Filtros aplicados.' : '';
    });
  }
})();
