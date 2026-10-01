// =========================================================
// NAVEGACIÓN GLOBAL Y CONTROLADOR DE VISTAS (SPA)
// =========================================================

let currentActiveView = 'hub';

function switchView(viewName) {
  currentActiveView = viewName;

  // Actualizar estado de botones de navegación
  const navBtnHub = document.getElementById('nav-btn-hub');
  const navBtnExamenes = document.getElementById('nav-btn-examenes');
  const navBtnAtl = document.getElementById('nav-btn-atl');
  const navBtnSecuencia = document.getElementById('nav-btn-secuencia');
  const navBtnAuditor = document.getElementById('nav-btn-auditor');
  const navBtnVuelos = document.getElementById('nav-btn-vuelos');

  if (navBtnHub) navBtnHub.classList.toggle('active', viewName === 'hub');
  if (navBtnExamenes) navBtnExamenes.classList.toggle('active', viewName === 'examenes');
  if (navBtnAtl) navBtnAtl.classList.toggle('active', viewName === 'atl');
  if (navBtnSecuencia) navBtnSecuencia.classList.toggle('active', viewName === 'secuencia');
  if (navBtnAuditor) navBtnAuditor.classList.toggle('active', viewName === 'auditor');
  if (navBtnVuelos) navBtnVuelos.classList.toggle('active', viewName === 'vuelos');

  // Alternar visibilidad de las vistas
  const viewHub = document.getElementById('view-hub');
  const viewExamenes = document.getElementById('view-examenes');
  const viewAtl = document.getElementById('view-atl');
  const viewSecuencia = document.getElementById('view-secuencia');
  const viewAuditor = document.getElementById('view-auditor');
  const viewVuelos = document.getElementById('view-vuelos');

  if (viewHub) viewHub.classList.toggle('hidden', viewName !== 'hub');
  if (viewExamenes) viewExamenes.classList.toggle('hidden', viewName !== 'examenes');
  if (viewAtl) viewAtl.classList.toggle('hidden', viewName !== 'atl');
  if (viewSecuencia) viewSecuencia.classList.toggle('hidden', viewName !== 'secuencia');
  if (viewAuditor) viewAuditor.classList.toggle('hidden', viewName !== 'auditor');
  if (viewVuelos) viewVuelos.classList.toggle('hidden', viewName !== 'vuelos');

  // Guardar en sessionStorage para mantener la pestaña activa al recargar
  sessionStorage.setItem('blue_team_active_view', viewName);

  // Si entra a ATL, Exámenes, Secuencia, Auditor o Vuelos, forzar refresco de datos
  if (viewName === 'atl' && typeof loadAtlItems === 'function') {
    loadAtlItems();
  } else if (viewName === 'examenes' && typeof loadExamenes === 'function') {
    loadExamenes();
  } else if (viewName === 'secuencia' && typeof loadSecuenciaDocs === 'function') {
    loadSecuenciaDocs();
  } else if (viewName === 'auditor') {
    if (typeof runAuditorScan === 'function' && (!auditorState || !auditorState.data)) {
      runAuditorScan();
    }
  } else if (viewName === 'vuelos') {
    if (typeof initVuelosView === 'function') {
      if (!vuelosState || !vuelosState.matchedFlights || vuelosState.matchedFlights.length === 0) {
        initVuelosView();
      } else if (typeof renderVuelosUI === 'function') {
        renderVuelosUI();
      }
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateNavBadges() {
  const badgeVuelos = document.getElementById('nav-badge-vuelos');
  const hubVuelosCount = document.getElementById('hub-vuelos-count');
  const hubVuelosCancelados = document.getElementById('hub-vuelos-cancelados');
  if (typeof vuelosState !== 'undefined' && vuelosState.matchedFlights) {
    const totalVuelos = vuelosState.matchedFlights.length;
    const cancelados = vuelosState.kpis ? vuelosState.kpis.cancelledFlightsCount : 0;
    if (badgeVuelos) badgeVuelos.textContent = totalVuelos;
    if (hubVuelosCount) hubVuelosCount.textContent = totalVuelos;
    if (hubVuelosCancelados) hubVuelosCancelados.textContent = cancelados;
  }
  const badgeExamenes = document.getElementById('nav-badge-examenes');
  const hubExamCount = document.getElementById('hub-exam-count');
  const hubExamPending = document.getElementById('hub-exam-pending');

  if (typeof examenes !== 'undefined' && Array.isArray(examenes)) {
    const totalExams = examenes.length;
    const pendingExams = examenes.filter(e => e.estado === 'pendiente').length;
    if (badgeExamenes) badgeExamenes.textContent = totalExams;
    if (hubExamCount) hubExamCount.textContent = totalExams;
    if (hubExamPending) hubExamPending.textContent = pendingExams;
  }

  const badgeAtl = document.getElementById('nav-badge-atl');
  const hubAtlCount = document.getElementById('hub-atl-count');
  const hubAtlPending = document.getElementById('hub-atl-pending');

  if (typeof atlItems !== 'undefined' && Array.isArray(atlItems)) {
    const totalAtls = atlItems.length;
    const pendingAtls = atlItems.filter(it => it.estado === 'pendiente' || !it.fecha || !it.log_numero).length;
    if (badgeAtl) badgeAtl.textContent = totalAtls;
    if (hubAtlCount) hubAtlCount.textContent = totalAtls;
    if (hubAtlPending) hubAtlPending.textContent = pendingAtls;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Restaurar vista previa si existe en sesión
  const savedView = sessionStorage.getItem('blue_team_active_view') || 'hub';
  switchView(savedView);

  // Preparar los contadores una vez; switchView ya inicia Vuelos si esa vista quedó activa.
  if (savedView !== 'vuelos' && typeof initVuelosView === 'function') {
    initVuelosView();
  }

  // Refrescar badges inmediatamente
  updateNavBadges();

  // Escuchar cambios de estado para actualizar badges periódicamente
  setInterval(updateNavBadges, 2000);
});
