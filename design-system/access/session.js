(async () => {
  const status = document.querySelector('#status');
  try {
    const session = JSON.parse(sessionStorage.getItem('vec_admin_sessao') || 'null');
    if (!session?.token || session.expira <= Date.now()) return;
    const headers = { Authorization: 'Bearer ' + session.token };
    const response = await fetch('/design-system/session', {
      method: 'POST',
      headers
    });
    if (response.ok) {
      const catalog = await response.text();
      const root = response.headers.get('X-Vec-Studio-Assets') || '';
      if (!/^\/design-system\/files\/[A-Za-z0-9_-]{43}\/$/.test(root)) {
        status.textContent = 'Não foi possível abrir o catálogo. Tente novamente.';
        return;
      }
      const check = await fetch(root + 'inventory.json', { method: 'HEAD', headers });
      if (!check.ok) {
        status.textContent = 'Permita cookies para o Área VEC e abra o endereço do Studio novamente.';
        return;
      }
      // The authenticated server response contains only bundled Studio HTML.
      history.replaceState(null, '', '/design-system/');
      document.open();
      document.write(catalog);
      document.close();
    } else if (response.status !== 401) {
      status.textContent = 'Não foi possível abrir o catálogo. Tente novamente.';
    }
  } catch {
    status.textContent = 'Não foi possível abrir o catálogo. Tente novamente.';
  }
})();
