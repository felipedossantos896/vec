(async () => {
  const status = document.querySelector('#status');
  try {
    const session = JSON.parse(sessionStorage.getItem('vec_admin_sessao') || 'null');
    if (!session?.token || session.expira <= Date.now()) return;
    if (new URLSearchParams(location.search).get('catalogo') === '1') {
      status.textContent = 'Permita cookies para o Área VEC e abra o endereço do Studio novamente.';
      return;
    }
    const response = await fetch('session', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + session.token }
    });
    if (response.ok) {
      location.replace('?catalogo=1');
    } else if (response.status !== 401) {
      status.textContent = 'Não foi possível abrir o catálogo. Tente novamente.';
    }
  } catch {
    status.textContent = 'Não foi possível abrir o catálogo. Tente novamente.';
  }
})();
