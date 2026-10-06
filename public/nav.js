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
  const navBtnSuspendidos = document.getElementById('nav-btn-suspendidos');

  if (navBtnHub) navBtnHub.classList.toggle('active', viewName === 'hub');
  if (navBtnExamenes) navBtnExamenes.classList.toggle('active', viewName === 'examenes');
  if (navBtnAtl) navBtnAtl.classList.toggle('active', viewName === 'atl');
  if (navBtnSecuencia) navBtnSecuencia.classList.toggle('active', viewName === 'secuencia');
  if (navBtnAuditor) navBtnAuditor.classList.toggle('active', viewName === 'auditor');
  if (navBtnVuelos) navBtnVuelos.classList.toggle('active', viewName === 'vuelos');
  if (navBtnSuspendidos) navBtnSuspendidos.classList.toggle('active', viewName === 'suspendidos');

  // Alternar visibilidad de las vistas
  const viewHub = document.getElementById('view-hub');
  const viewExamenes = document.getElementById('view-examenes');
  const viewAtl = document.getElementById('view-atl');
  const viewSecuencia = document.getElementById('view-secuencia');
  const viewAuditor = document.getElementById('view-auditor');
  const viewVuelos = document.getElementById('view-vuelos');
  const viewSuspendidos = document.getElementById('view-suspendidos');

  if (viewHub) viewHub.classList.toggle('hidden', viewName !== 'hub');
  if (viewExamenes) viewExamenes.classList.toggle('hidden', viewName !== 'examenes');
  if (viewAtl) viewAtl.classList.toggle('hidden', viewName !== 'atl');
  if (viewSecuencia) viewSecuencia.classList.toggle('hidden', viewName !== 'secuencia');
  if (viewAuditor) viewAuditor.classList.toggle('hidden', viewName !== 'auditor');
  if (viewVuelos) viewVuelos.classList.toggle('hidden', viewName !== 'vuelos');
  if (viewSuspendidos) viewSuspendidos.classList.toggle('hidden', viewName !== 'suspendidos');

  // Guardar en sessionStorage para mantener la pestaña activa al recargar
  try {
    sessionStorage.setItem('blue_team_active_view', viewName);
  } catch (e) {
    // Modo local / sin permisos de storage
  }

  // Si entra a ATL, Exámenes, Secuencia, Auditor, Vuelos o Suspendidos, forzar refresco de datos
  try {
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
      if (typeof renderVuelosUI === 'function') {
        renderVuelosUI();
      }
      if (typeof initVuelosView === 'function') {
        if (!vuelosState || !vuelosState.matchedFlights || vuelosState.matchedFlights.length === 0) {
          initVuelosView();
        }
      }
    } else if (viewName === 'suspendidos') {
      if (typeof cargarItemsSuspendidos === 'function') {
        if (!suspendidosData) {
          cargarItemsSuspendidos();
        } else {
          renderizarSuspendidosUI();
        }
      }
      if (typeof setupDragAndDrop === 'function') {
        setupDragAndDrop();
      }
    }
  } catch (err) {
    console.error('Error al inicializar la vista ' + viewName + ':', err);
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
  // Añadir event listeners a las tarjetas del hub para garantizar la navegación en cualquier entorno
  document.querySelectorAll('.hub-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      const view = card.getAttribute('data-view')
        || (card.classList.contains('hub-card-vuelos') ? 'vuelos'
        : card.classList.contains('hub-card-atl') ? 'atl'
        : card.classList.contains('hub-card-secuencia') ? 'secuencia'
        : card.classList.contains('hub-card-auditor') ? 'auditor'
        : 'examenes');
      switchView(view);
    });
  });

  // Botones internos de las tarjetas
  document.querySelectorAll('.hub-card .hub-btn').forEach(btn => {
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.hub-card');
      const view = btn.getAttribute('data-view')
        || (card ? card.getAttribute('data-view') : null)
        || (card && card.classList.contains('hub-card-vuelos') ? 'vuelos'
        : card && card.classList.contains('hub-card-atl') ? 'atl'
        : card && card.classList.contains('hub-card-secuencia') ? 'secuencia'
        : card && card.classList.contains('hub-card-auditor') ? 'auditor'
        : 'examenes');
      switchView(view);
    });
  });

  // Botones de la barra de navegación
  const navBtns = [
    { id: 'nav-btn-hub', view: 'hub' },
    { id: 'nav-btn-examenes', view: 'examenes' },
    { id: 'nav-btn-atl', view: 'atl' },
    { id: 'nav-btn-secuencia', view: 'secuencia' },
    { id: 'nav-btn-vuelos', view: 'vuelos' },
    { id: 'nav-btn-auditor', view: 'auditor' }
  ];
  navBtns.forEach(({ id, view }) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => switchView(view));
    }
  });

  // Restaurar vista previa si existe en sesión
  let savedView = 'hub';
  try {
    savedView = sessionStorage.getItem('blue_team_active_view') || 'hub';
  } catch (e) {}

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
