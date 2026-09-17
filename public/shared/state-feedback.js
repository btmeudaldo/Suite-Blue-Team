async function loadStateItems(url, noticeId) {
  const notice = document.getElementById(noticeId);

  function show(message, level) {
    if (!notice) return;
    notice.textContent = message;
    notice.hidden = !message;
    notice.dataset.level = level;
    notice.setAttribute('role', level === 'error' ? 'alert' : 'status');
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los datos guardados.');
    if (!Array.isArray(data)) throw new Error('El servidor no devolvió una lista válida.');
    const warning = response.headers?.get('X-State-Warning');
    show(warning ? decodeURIComponent(warning) : '', 'warning');
    return data;
  } catch (error) {
    show(`No se pudieron cargar los datos: ${error.message}. Los datos que ya ves en pantalla se conservan.`, 'error');
    throw error;
  }
}
