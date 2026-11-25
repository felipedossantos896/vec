(async () => {
  const status = document.querySelector('#status');
  try {
    const session = JSON.parse(sessionStorage.getItem('vec_admin_sessao') || 'null');
    if (!session?.token || session.expira <= Date.now()) return;
    const response = await fetch('session', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + session.token }
    });
    if (response.ok) {
      location.reload();
    } else if (response.status !== 401) {
      status.textContent = 'Não foi possível abrir o catálogo. Tente novamente.';
    }
  } catch {
    status.textContent = 'Não foi possível abrir o catálogo. Tente novamente.';
  }
})();
