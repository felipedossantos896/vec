(() => {
  const hostCells = ['Aurora', 'Horizonte'];
  const demo = [
    { name: 'Ana Exemplo', cell: 'Aurora', distance: '0,8 km' },
    { name: 'Bruno Modelo', cell: 'Horizonte', distance: '1,2 km' },
    { name: 'Clara Ensaio', cell: 'Aurora', distance: '1,5 km' },
    { name: 'Daniel Teste', cell: 'Horizonte', distance: '1,6 km' }
  ];
  const registration = [
    ['Dados pessoais', '<label>Nome completo<input name="name" autocomplete="off" required></label><label>Nascimento<input type="date" name="birth" required></label>'],
    ['Sua fé', '<fieldset><legend>Marcos já registrados</legend><label class="inv-check"><input type="checkbox"> Café com o Pastor</label><label class="inv-check"><input type="checkbox"> Nova Criatura</label></fieldset>'],
    ['Sua célula', '<label>Célula<select><option>Aurora</option><option>Horizonte</option><option>Sem célula</option></select></label><label>Ministério<input autocomplete="off"></label>'],
    ['Treinamentos', '<fieldset><legend>Treinamentos que você já fez</legend><label class="inv-check"><input type="checkbox"> Expresso 01</label><label class="inv-check"><input type="checkbox"> Expresso 02</label></fieldset>'],
    ['Para terminar', '<label>Sugestão<textarea rows="3"></textarea></label><label class="inv-check"><input type="checkbox" required> Confirmo que usei dados fictícios</label>']
  ];
  let step = /^registration-[1-5]$/.test(key) ? Number(key.at(-1)) - 1 : 0;
  const formView = () => {
    const [title, fields] = registration[step];
    app.innerHTML = '<div class="login inv-registration"><form class="panel inv-form"><small>Cadastro demonstrativo · Etapa ' + (step + 1) + ' de 5</small><h1>' + title + '</h1>' + fields +
      '<div class="actions">' + (step ? '<button type="button" data-back>Voltar</button>' : '') + '<button class="primary">' + (step === 4 ? 'Concluir' : 'Continuar') + '</button></div></form></div>';
    const form = app.querySelector('form');
    for (const [i, item] of [...form.querySelectorAll('input,select,textarea')].entries()) {
      const saved = draft[step]?.[i];
      if (saved === undefined) continue;
      if (item.type === 'checkbox') item.checked = saved;
      else item.value = saved;
    }
    const remember = () => { draft[step] = [...form.querySelectorAll('input,select,textarea')].map(item => item.type === 'checkbox' ? item.checked : item.value); };
    form.addEventListener('submit', event => {
      event.preventDefault();
      remember();
      if (step === 4) done();
      else { step++; formView(); app.querySelector('h1').focus(); }
    });
    form.querySelector('[data-back]')?.addEventListener('click', () => { remember(); step--; formView(); app.querySelector('h1').focus(); });
    app.querySelector('h1').tabIndex = -1;
  };
  const draft = [];
  function done() {
    draft.length = 0;
    app.innerHTML = '<div class="login"><section class="panel"><h1>Cadastro recebido</h1><p>Simulação concluída. Nenhum dado foi enviado.</p><button type="button" class="primary">Iniciar novo exemplo</button></section></div>';
    app.querySelector('button').addEventListener('click', () => { step = 0; formView(); });
  }
  if (key === 'registration-done') { done(); return; }
  if (/^registration-[1-5]$/.test(key)) { formView(); return; }

  function layout(title, content) {
    app.innerHTML = shell(title, '<section class="inv-screen">' + content + '</section>');
    app.querySelector('.content > .top .actions').remove();
    return app.querySelector('.inv-screen');
  }
  const cellPicker = '<label>Célula <select aria-label="Célula">' + hostCells.map(c => '<option>' + c + '</option>').join('') + '</select></label>';
  if (key === 'host') {
    const view = layout('Escolher anfitrião', '<div class="panel inv-stack">' + cellPicker + '<p class="muted">Distâncias ilustrativas</p><ol class="inv-ranking"></ol></div>');
    const select = view.querySelector('select'), list = view.querySelector('ol');
    function ranking() {
      list.innerHTML = demo.filter(item => item.cell === select.value).map(item =>
        '<li><strong>' + item.name + '</strong><span>' + item.distance + ' · distância média</span></li>').join('');
    }
    select.addEventListener('change', ranking);
    ranking();
  } else if (key === 'multiply') {
    const view = layout('Planejar multiplicação', '<div class="panel inv-stack">' + cellPicker + '<p class="muted">Mover altera somente a simulação.</p><div class="inv-grid"></div><p role="status"></p></div>');
    const select = view.querySelector('select'), grid = view.querySelector('.inv-grid');
    let teams;
    function renderTeams() {
      grid.innerHTML = teams.map((team, index) => '<section class="panel"><h2>Grupo ' + (index + 1) + '</h2>' +
        (team.length ? team.map((item, i) => '<div class="person"><strong>' + item.name + '</strong><button data-team="' + index + '" data-index="' + i + '">Mover: ' + item.name + '</button></div>').join('') : '<p>Nenhuma pessoa neste grupo</p>') + '</section>').join('');
    }
    function reset() {
      const pair = demo.filter(item => item.cell === select.value);
      teams = [[pair[0]], [pair[1]]];
      view.querySelector('[role="status"]').textContent = '';
      renderTeams();
    }
    grid.addEventListener('click', event => {
      const b = event.target.closest('[data-team]');
      if (!b) return;
      const from = Number(b.dataset.team);
      const [person] = teams[from].splice(Number(b.dataset.index), 1);
      teams[1 - from].push(person);
      renderTeams();
      view.querySelector('[role="status"]').textContent = person.name + ' mudou de grupo.';
      [...grid.querySelectorAll('button')].find(button => button.textContent === 'Mover: ' + person.name)?.focus();
    });
    select.addEventListener('change', reset);
    reset();
  } else if (key === 'disciples') {
    layout('Meus discípulos', '<div class="inv-grid">' + demo.slice(0, 2).map((p, index) =>
      '<article class="panel inv-stack"><h2>' + p.name + '</h2><p>' + p.cell + '</p><p>' + (index + 2) + ' de 6 etapas</p><progress max="6" value="' + (index + 2) + '" aria-label="Etapas da jornada"></progress><a href="?screen=profile">Ver ficha de exemplo</a></article>').join('') + '</div>');
  } else if (key === 'metrics') {
    const view = layout('Indicadores', '<div class="panel inv-stack">' + cellPicker + '<div class="inv-grid inv-kpis"></div><section><h2>Cadastros por mês</h2><ul class="inv-chart"></ul></section></div>');
    const picker = view.querySelector('select');
    function metrics() {
      const count = picker.selectedIndex ? 8 : 12;
      view.querySelector('.inv-kpis').innerHTML = ['Pessoas', 'Novos cadastros', 'Jornada completa', 'Com discipulador'].map((label, i) =>
        '<div class="panel"><small>' + label + '</small><strong>' + [count, 2, count / 2, count - 2][i] + '</strong></div>').join('');
      view.querySelector('ul').innerHTML = ['Setembro', 'Outubro', 'Novembro'].map((label, i) =>
        '<li><span>' + label + '</span><meter min="0" max="12" value="' + (count - i * 2) + '">' + (count - i * 2) + '</meter><span>' + (count - i * 2) + '</span></li>').join('');
    }
    picker.addEventListener('change', metrics);
    metrics();
  } else if (key === 'settings') {
    layout('Configurações e usuários', '<div class="panel inv-stack"><div class="top"><h2>Acessos fictícios</h2><a href="?screen=new-user">Novo usuário</a></div><ul class="inv-ranking"><li><strong>Ana Exemplo</strong><span>Liderança de área</span></li><li><strong>Bruno Modelo</strong><span>Liderança de célula</span></li></ul></div>');
  } else if (key === 'new-user') {
    const view = layout('Novo usuário', '<form class="panel inv-form"><label>Nome<input required autocomplete="off"></label><label>Perfil<select><option>Líder de área</option><option>Líder de setor</option><option>Líder de célula</option></select></label><div class="actions"><a href="?screen=settings">Cancelar</a><button class="primary">Salvar acesso de exemplo</button></div></form>');
    view.querySelector('form').addEventListener('submit', event => { event.preventDefault(); location.search = '?screen=saved'; });
  } else if (key === 'saved') {
    layout('Acesso salvo', '<div class="panel inv-stack"><h2>Simulação concluída</h2><p>Nenhuma conta ou senha foi criada.</p><a href="?screen=settings">Voltar aos acessos</a></div>');
  }
})();
