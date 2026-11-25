(() => {
  if (!['people', 'profile', 'new-person', 'edit-person'].includes(key)) return;
  const cells = ['Aurora', 'Horizonte'];
  const people = [
    { name: 'Ana Exemplo', cell: 'Aurora', mentor: 1, birth: '1995-04-12', stages: ['Café com o Pastor', 'Estação DNA'], disciple: true, leader: false },
    { name: 'Bruno Modelo', cell: 'Horizonte', mentor: null, birth: '1990-08-26', stages: [], disciple: false, leader: false },
    { name: 'Clara Ensaio', cell: 'Aurora', mentor: 0, birth: '1998-02-10', stages: ['Nova Criatura'], disciple: false, leader: true }
  ];
  const stages = ['Café com o Pastor', 'Estação DNA', 'Acompanhamento Inicial', 'Nova Criatura', 'Batismo nas Águas', 'Batismo no Espírito'];
  const html = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const initials = name => name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const options = (items, selected) => items.map(item => `<option${item === selected ? ' selected' : ''}>${html(item)}</option>`).join('');
  const norm = text => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');
  app.innerHTML = shell('Pessoas', `
    <section class="people-screen" aria-label="Gestão de pessoas">
      <div class="top"><h2>Cadastros</h2><button type="button" class="primary" data-new>Nova pessoa</button></div>
      <div class="people-filters">
        <label>Busca<input type="search" placeholder="Nome ou discipulador"></label>
        <label>Célula<select aria-label="Célula"><option value="">Todas as células</option>${options(cells)}</select></label>
      </div>
      <p class="muted" role="status" id="people-status"></p>
      <ul class="people-list" aria-label="Pessoas"></ul>
      <p class="muted">Dados fictícios. Alterações são descartadas ao sair do preview.</p>
    </section>
    <dialog class="people-dialog" aria-labelledby="people-dialog-title"></dialog>`);
  app.querySelector('.content > .top .actions').remove();
  const section = app.querySelector('.people-screen');
  const rows = section.querySelector('ul');
  const search = section.querySelector('input');
  const cell = section.querySelector('select');
  const status = section.querySelector('#people-status');
  const dialog = app.querySelector('dialog');
  let selected = -1;
  let opener = null;
  const mentorName = p => people[p.mentor]?.name || '';

  function renderList(message = '') {
    const query = norm(search.value.trim());
    const matches = people.map((p, id) => ({ ...p, id })).filter(p =>
      (!cell.value || p.cell === cell.value) && [p.name, mentorName(p)].some(name => norm(name).includes(query)));
    status.textContent = message || (matches.length ? `${matches.length} de ${people.length} pessoas` : 'Nenhuma pessoa encontrada.');
    rows.innerHTML = matches.map(p => `<li><button type="button" class="people-row" data-person="${p.id}">
      <span class="avatar" aria-hidden="true">${html(initials(p.name))}</span>
      <span><strong>${html(p.name)}</strong><small>${html(p.cell)}</small></span>
      <span class="people-mentor"><small>Discipulador</small>${html(mentorName(p) || 'Sem discipulador')}</span>
      <span class="people-count"><small>Etapas da jornada</small>${p.stages.length} de ${stages.length}</span>
    </button></li>`).join('');
  }

  function show(title, body) {
    dialog.innerHTML = `<header class="top"><h2 id="people-dialog-title" tabindex="-1">${title}</h2><button type="button" data-close>Fechar</button></header>${body}`;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('h2').focus();
  }
  function profile() {
    const p = people[selected];
    show('Ficha individual', `
      <div class="person"><span class="avatar" aria-hidden="true">${html(initials(p.name))}</span><div><strong>${html(p.name)}</strong><br><small>${html(p.cell)} · ${html(mentorName(p) || 'Sem discipulador')}</small></div></div>
      <section><h3>Trilho do membro</h3><ul class="people-stages">${stages.map(stage => `<li>${stage}<span class="people-badge">${p.stages.includes(stage) ? 'Concluída' : 'Não informada'}</span></li>`).join('')}</ul></section>
      <section><h3>Trilho do discipulador</h3><p>Expresso 01 · ${p.disciple ? 'Registrado' : 'Não informado'}</p></section>
      <section><h3>Trilho do líder de célula (opcional)</h3><p>Expresso 02 · ${p.leader ? 'Registrado' : 'Não informado'}</p></section>
      <button type="button" class="primary" data-edit>Editar pessoa</button>`);
  }
  function form() {
    const p = people[selected];
    const now = new Date();
    const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map(n => String(n).padStart(2, '0')).join('-');
    const mentors = people.map((person, id) => id === selected ? '' :
      `<option value="${id}"${p?.mentor === id ? ' selected' : ''}>${html(person.name)} · Cadastro ${id + 1}</option>`).join('');
    show(p ? 'Editar pessoa' : 'Nova pessoa', `<form class="people-form">
      <label>Nome completo<input name="name" maxlength="100" required value="${html(p?.name || '')}"></label>
      <label>Nascimento<input name="birth" type="date" required max="${today}" value="${html(p?.birth || '')}"></label>
      <label>Célula<select name="cell" aria-label="Célula" required><option value="">Selecione</option>${options(cells, p?.cell)}</select></label>
      <label>Discipulador<select name="mentor" aria-label="Discipulador"><option value="">Sem discipulador</option>${mentors}</select></label>
      <p class="muted">Use somente dados fictícios.</p><p role="alert"></p>
      <div class="actions"><button type="submit" class="primary">Salvar</button><button type="button" data-cancel>Cancelar</button></div>
    </form>`);
  }

  section.addEventListener('input', () => renderList());
  section.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    opener = button;
    if (button.hasAttribute('data-new')) { selected = -1; form(); }
    else if (button.dataset.person) { selected = Number(button.dataset.person); profile(); }
  });
  dialog.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button?.hasAttribute('data-edit')) form();
    if (button?.hasAttribute('data-close')) dialog.close();
    if (button?.hasAttribute('data-cancel')) selected < 0 ? dialog.close() : profile();
  });
  dialog.addEventListener('close', () => {
    if (opener?.isConnected) opener.focus();
    else (rows.querySelector(`[data-person="${selected}"]`) || section.querySelector('[data-new]')).focus();
  });
  dialog.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.target);
    const name = data.get('name').trim();
    if (!name) {
      event.target.querySelector('[role="alert"]').textContent = 'Informe o nome completo.';
      event.target.elements.name.focus();
      return;
    }
    const values = { name, birth: data.get('birth'), cell: data.get('cell'), mentor: data.get('mentor') === '' ? null : Number(data.get('mentor')) };
    if (selected < 0) {
      selected = people.length;
      people.push({ ...values, stages: [], disciple: false, leader: false });
      search.value = cell.value = '';
    } else {
      Object.assign(people[selected], values);
    }
    renderList('Cadastro fictício salvo.');
    profile();
  });
  renderList();
  if (key === 'profile') { selected = 0; profile(); }
  if (key === 'new-person' || key === 'edit-person') { selected = key === 'edit-person' ? 0 : -1; form(); }
})();
