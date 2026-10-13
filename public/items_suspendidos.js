// =========================================================
// MÓDULO: REVISIÓN DE ÍTEMS SUSPENDIDOS EN ALUMNOS
// =========================================================

let suspendidosData = null;
let currentCursoFilter = "all";
let currentSearchTerm = "";
let currentStatusFilter = "all"; // 'all', 'superados', 'pendientes'
let currentModoVista = "activos"; // 'activos' (oculta los superados/corregidos), 'corregidos', 'todos'
let currentExpedienteFilter = "all"; // 'all', 'pendientes', 'revisados'

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  cargarItemsSuspendidos(true);
});

async function cargarItemsSuspendidos(silencioso = false) {
  const container = document.getElementById("suspendidos-content-area");
  if (!silencioso && container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
        <div style="font-size: 2.5rem; margin-bottom: 1rem; animation: spin 1s linear infinite;">⏳</div>
        <p style="font-size: 1.1rem; font-weight: 500;">Analizando hojas de ejercicios de alumnos...</p>
      </div>
    `;
  }

  try {
    const res = await fetch("/api/items_suspendidos/analizar");
    if (!res.ok) throw new Error("Error en respuesta del servidor");
    suspendidosData = await res.json();

    actualizarBadgesSuspendidos();
    renderizarSuspendidosUI();
  } catch (err) {
    console.error("Error al cargar ítems suspendidos:", err);
    if (container) {
      container.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 2rem; text-align: center; margin: 1.5rem 0;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
          <h3 style="color: #ef4444; margin-bottom: 0.5rem;">Error al analizar los archivos de ejercicios</h3>
          <p style="color: var(--text-muted); margin-bottom: 1rem;">${err.message}</p>
          <button class="btn btn-primary" onclick="cargarItemsSuspendidos()">Reintentar</button>
        </div>
      `;
    }
  }
}

function actualizarBadgesSuspendidos() {
  if (!suspendidosData) return;

  // Calculamos alumnos con ítems activos (no resueltos)
  const alumnosActivos = suspendidosData.alumnos.filter(a => {
    return a.items.some(i => !i.corregido_en_pr);
  });
  const countAlumnos = alumnosActivos.length;
  const totalActivos = suspendidosData.total_activos_pr !== undefined ? suspendidosData.total_activos_pr : suspendidosData.total_items_suspendidos;

  const navBadge = document.getElementById("nav-badge-suspendidos");
  if (navBadge) {
    navBadge.textContent = countAlumnos;
    navBadge.style.display = countAlumnos > 0 ? "inline-block" : "none";
  }

  const hubAlumnos = document.getElementById("hub-suspendidos-alumnos");
  if (hubAlumnos) hubAlumnos.textContent = countAlumnos;

  const hubTotal = document.getElementById("hub-suspendidos-total");
  if (hubTotal) hubTotal.textContent = totalActivos;
}

function renderizarSuspendidosUI() {
  if (!suspendidosData) return;

  renderizarCursosTabs();
  renderizarKPIs();
  renderizarListadoAlumnos();
}

function renderizarCursosTabs() {
  const container = document.getElementById("suspendidos-cursos-tabs");
  if (!container) return;

  const cursos = suspendidosData.cursos || [];
  
  // Conteo de alumnos activos por curso
  const alumnosFiltrados = suspendidosData.alumnos.filter(a => {
    if (currentModoVista === "activos") return a.items.some(i => !i.corregido_en_pr);
    if (currentModoVista === "corregidos") return a.items.some(i => i.corregido_en_pr);
    return true;
  });

  let html = `
    <button class="pill-btn ${currentCursoFilter === 'all' ? 'active' : ''}" onclick="setCursoFilter('all')">
      🌐 Todos los Cursos (${alumnosFiltrados.length})
    </button>
  `;

  cursos.forEach(curso => {
    const countCurso = alumnosFiltrados.filter(a => a.cursos.includes(curso)).length;
    html += `
      <button class="pill-btn ${currentCursoFilter === curso ? 'active' : ''}" onclick="setCursoFilter('${curso}')">
        ${getCursoIcon(curso)} ${curso} (${countCurso})
      </button>
    `;
  });

  container.innerHTML = html;
}

function getCursoIcon(curso) {
  if (curso === "MEP") return "✈️";
  if (curso === "IR") return "🧭";
  if (curso === "CPL") return "🛫";
  if (curso === "PPL") return "🛩️";
  return "📘";
}

function setCursoFilter(curso) {
  currentCursoFilter = curso;
  renderizarCursosTabs();
  renderizarKPIs();
  renderizarListadoAlumnos();
}

function setStatusFilter(status) {
  currentStatusFilter = status;
  document.querySelectorAll(".status-filter-btn[data-status]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.status === status);
  });
  renderizarListadoAlumnos();
}

function setExpedienteFilter(exp) {
  currentExpedienteFilter = exp;
  document.querySelectorAll(".exp-filter-btn[data-exp]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.exp === exp);
  });
  renderizarListadoAlumnos();
}

function setModoVista(modo) {
  currentModoVista = modo;
  document.querySelectorAll(".modo-vista-btn[data-modo]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.modo === modo);
  });
  renderizarCursosTabs();
  renderizarKPIs();
  renderizarListadoAlumnos();
}

function onSearchInput(val) {
  currentSearchTerm = val.toLowerCase().trim();
  renderizarListadoAlumnos();
}

function renderizarKPIs() {
  let alumnos = suspendidosData.alumnos || [];
  if (currentCursoFilter !== "all") {
    alumnos = alumnos.filter(a => a.cursos.includes(currentCursoFilter));
  }

  let totalItems = 0;
  let totalActivos = 0;
  let totalCorregidos = 0;
  let totalConVueloPosterior = 0;

  alumnos.forEach(a => {
    const items = currentCursoFilter === "all" ? a.items : a.items.filter(i => i.curso === currentCursoFilter);
    totalItems += items.length;
    items.forEach(i => {
      if (i.corregido_en_pr) {
        totalCorregidos++;
      } else {
        totalActivos++;
        if (i.con_vuelo_posterior || i.recuperado) totalConVueloPosterior++;
      }
    });
  });

  const kpiAlumnos = document.getElementById("kpi-suspendidos-alumnos");
  if (kpiAlumnos) {
    const alActivos = alumnos.filter(a => (currentCursoFilter === "all" ? a.items : a.items.filter(i => i.curso === currentCursoFilter)).some(i => !i.corregido_en_pr));
    kpiAlumnos.textContent = alActivos.length;
  }

  const kpiTotal = document.getElementById("kpi-suspendidos-total");
  if (kpiTotal) kpiTotal.textContent = totalActivos;

  const kpiRecuperados = document.getElementById("kpi-suspendidos-recuperados");
  if (kpiRecuperados) kpiRecuperados.textContent = totalConVueloPosterior;

  const kpiPendientes = document.getElementById("kpi-suspendidos-pendientes");
  if (kpiPendientes) kpiPendientes.textContent = totalCorregidos;

  const kpiRevisados = document.getElementById("kpi-suspendidos-revisados");
  if (kpiRevisados) {
    const revCount = alumnos.filter(a => a.expediente_revisado).length;
    kpiRevisados.textContent = revCount;
  }
}

function renderizarListadoAlumnos() {
  const container = document.getElementById("suspendidos-content-area");
  if (!container) return;

  let alumnos = suspendidosData.alumnos || [];

  // 1. Filtrar por curso
  if (currentCursoFilter !== "all") {
    alumnos = alumnos.filter(a => a.cursos.includes(currentCursoFilter));
  }

  // 1.1 Filtrar por estado de auditoría del expediente
  if (currentExpedienteFilter === "revisados") {
    alumnos = alumnos.filter(a => a.expediente_revisado);
  } else if (currentExpedienteFilter === "pendientes") {
    alumnos = alumnos.filter(a => !a.expediente_revisado);
  }

  // 2. Preparar ítems por alumno aplicando filtros
  const processedAlumnos = alumnos.map(a => {
    let items = currentCursoFilter === "all" ? a.items : a.items.filter(i => i.curso === currentCursoFilter);

    // Filtro por MODO (Activos vs Corregidos vs Todos)
    if (currentModoVista === "activos") {
      items = items.filter(i => !i.corregido_en_pr);
    } else if (currentModoVista === "corregidos") {
      items = items.filter(i => i.corregido_en_pr);
    }

    // Filtro por STATUS / TIPO adicional
    if (currentStatusFilter === "suspendidos") {
      items = items.filter(i => i.tipo === "SUSPENDIDO" || (!i.tipo && i.nota !== "N/A" && i.nota !== "NA"));
    } else if (currentStatusFilter === "abiertos") {
      items = items.filter(i => i.tipo === "ABIERTO" || i.nota === "N/A" || i.nota === "NA");
    } else if (currentStatusFilter === "con_posterior") {
      items = items.filter(i => i.con_vuelo_posterior || i.recuperado);
    }

    // Filtro por búsqueda
    if (currentSearchTerm) {
      const matchAlumno = a.name.toLowerCase().includes(currentSearchTerm) || a.code.toLowerCase().includes(currentSearchTerm);
      if (!matchAlumno) {
        items = items.filter(i => i.item.toLowerCase().includes(currentSearchTerm) || (i.lesson && i.lesson.toLowerCase().includes(currentSearchTerm)));
      }
    }

    return {
      ...a,
      filteredItems: items
    };
  }).filter(a => a.filteredItems.length > 0);

  if (processedAlumnos.length === 0) {
    let mensaje = "";
    if (currentModoVista === "activos") {
      mensaje = currentSearchTerm 
        ? "No hay resultados para la búsqueda actual." 
        : "¡Excelente! No hay alumnos con maniobras pendientes de reprogramar o cerrar.";
    } else if (currentModoVista === "corregidos") {
      mensaje = "Aún no hay ítems marcados como reprogramados y superados.";
    } else {
      mensaje = "No hay registros bajo los filtros actuales.";
    }

    container.innerHTML = `
      <div style="background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-lg); padding: 3.5rem 1.5rem; text-align: center;">
        <div style="font-size: 2.8rem; margin-bottom: 0.75rem;">🎉</div>
        <h3 style="color: var(--text-main); margin-bottom: 0.5rem; font-size: 1.25rem;">
          ${currentModoVista === 'activos' ? 'Sin maniobras pendientes' : 'Sin ítems'}
        </h3>
        <p style="color: var(--text-muted); font-size: 0.92rem; max-width: 500px; margin: 0 auto 1.25rem auto;">
          ${mensaje}
        </p>
        ${currentModoVista === 'activos' && suspendidosData.total_corregidos_pr > 0 ? `
          <button class="btn btn-secondary btn-sm" onclick="setModoVista('corregidos')">
            👁️ Ver ${suspendidosData.total_corregidos_pr} ítems resueltos en el historial
          </button>
        ` : ''}
      </div>
    `;
    return;
  }

  let html = `<div class="students-accordion-list">`;

  processedAlumnos.forEach((alumno, index) => {
    const suspendidosCount = alumno.filteredItems.filter(i => !i.corregido_en_pr && (i.tipo === 'SUSPENDIDO' || (i.tipo !== 'ABIERTO' && i.nota !== 'N/A' && i.nota !== 'NA'))).length;
    const abiertosCount = alumno.filteredItems.filter(i => !i.corregido_en_pr && (i.tipo === 'ABIERTO' || i.nota === 'N/A' || i.nota === 'NA')).length;
    const conPosteriorCount = alumno.filteredItems.filter(i => !i.corregido_en_pr && (i.con_vuelo_posterior || i.recuperado)).length;
    const yaCorregidosCount = alumno.filteredItems.filter(i => i.corregido_en_pr).length;
    const isRevisado = !!alumno.expediente_revisado;
    const revFecha = alumno.fecha_expediente_revisado ? ` (auditado el ${alumno.fecha_expediente_revisado})` : "";

    html += `
      <div class="student-card ${isRevisado ? 'card-expediente-revisado' : ''}" id="student-card-${index}">
        <!-- Cabecera del Alumno -->
        <div class="student-card-header" onclick="toggleStudentCard(${index})">
          <div class="student-info-left">
            <div class="student-avatar-code">
              <span class="student-code-badge" title="Código de Alumno en Private Radar">${escapeHtml(alumno.code || 'SIN CÓDIGO')}</span>
              <button class="btn-copy-code" title="Copiar código Private Radar" onclick="event.stopPropagation(); copiarAlPortapapeles('${escapeHtml(alumno.code)}', 'Código ${alumno.code} copiado')">
                📋
              </button>
            </div>
            <div class="student-name-group">
              <h3 class="student-full-name">${escapeHtml(alumno.name)}</h3>
              <div class="student-meta-badges">
                ${(() => {
                  const cursosPendientes = Array.from(new Set(alumno.items.filter(i => !i.corregido_en_pr).map(i => i.curso).filter(Boolean)));
                  const cursosMostrar = currentModoVista === 'activos' && cursosPendientes.length > 0 ? cursosPendientes : alumno.cursos;
                  return cursosMostrar.map(c => `<span class="badge-curso badge-curso-${c.toLowerCase()}">${c}</span>`).join('');
                })()}
                <span class="badge-sub-info">${alumno.filteredItems.length} maniobra(s) ${currentModoVista === 'activos' ? 'por resolver' : 'listada(s)'}</span>
              </div>
            </div>
          </div>

          <div class="student-info-right">
            <!-- Indicador de Expediente Revisado -->
            <button class="btn-toggle-expediente ${isRevisado ? 'is-reviewed' : ''}" 
                    onclick="event.stopPropagation(); toggleExpedienteRevisado('${escapeHtml(alumno.code || alumno.name)}', ${!isRevisado})"
                    title="${isRevisado ? 'Expediente marcado como auditado' + revFecha + '. Clic para desmarcar' : 'Marcar este expediente como auditado / revisado'}">
              ${isRevisado ? '👁️ Revisado' : '⚪ Por auditar'}
            </button>

            <div class="student-status-summary">
              ${suspendidosCount > 0 ? `
                <span class="badge-item-suspendido" title="${suspendidosCount} maniobra(s) con nota suspendida (≤ 2.0)">
                  🔴 ${suspendidosCount} Suspendido(s)
                </span>
              ` : ''}
              ${abiertosCount > 0 ? `
                <span class="badge-item-abierto" title="${abiertosCount} ítem(s) abierto(s) pendientes (evaluación N/A)">
                  🟡 ${abiertosCount} Abierto(s)
                </span>
              ` : ''}
              ${conPosteriorCount > 0 ? `
                <span class="badge-pr-comment" title="${conPosteriorCount} ítem(s) con comentario de realización en vuelo posterior. Requieren ser reprogramados y superados para darse por cerrados.">
                  💬 ${conPosteriorCount} Con Vuelo Posterior
                </span>
              ` : ''}
              ${yaCorregidosCount > 0 ? `
                <span class="badge-pr-resolved" title="${yaCorregidosCount} maniobra(s) reprogramadas y superadas / resueltas">
                  ✓ ${yaCorregidosCount} Superada(s)
                </span>
              ` : ''}
            </div>
            <button class="btn-accordion-toggle" id="toggle-btn-${index}">▼</button>
          </div>
        </div>

        <!-- Cuerpo del Alumno: Tabla de Ejercicios Suspendidos -->
        <div class="student-card-body" id="student-body-${index}">
          <div class="student-quick-actions">
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <span class="actions-label">Acciones rápidas:</span>
              <button class="btn btn-secondary btn-sm" onclick="copiarResumenAlumno('${escapeHtml(alumno.name)}', '${escapeHtml(alumno.code)}')">
                📋 Copiar lista de ${escapeHtml(alumno.name.split(',')[0])}
              </button>
              <button class="btn btn-secondary btn-sm" onclick="descargarPDFInformeAlumno('${escapeHtml(alumno.code || alumno.name)}')" title="Generar informe oficial en PDF para este alumno">
                📄 Descargar PDF Alumno
              </button>
              <button class="btn btn-secondary btn-sm" onclick="abrirModalAddItemManual('${escapeHtml(alumno.name)}', '${escapeHtml(alumno.code)}', '${escapeHtml(alumno.cursos[0] || 'MEP')}')" title="Añadir una maniobra suspendida manual a este expediente">
                ➕ Añadir Maniobra Manual
              </button>
              ${currentModoVista !== 'corregidos' ? `
                <button class="btn btn-success btn-sm btn-mark-all" onclick="marcarTodosAlumnoSuperados('${escapeHtml(alumno.name)}', true)" title="Marcar todas las maniobras visibles de este alumno como reprogramadas y superadas para que no se muestren más">
                  ✓ Marcar todas de ${escapeHtml(alumno.name.split(',')[0])} como Superadas
                </button>
              ` : `
                <button class="btn btn-secondary btn-sm" onclick="marcarTodosAlumnoSuperados('${escapeHtml(alumno.name)}', false)" title="Devolver todas las maniobras a la lista activa">
                  ↩ Desmarcar todas y devolver a activos
                </button>
              `}
            </div>
          </div>

          <div class="table-responsive">
            <table class="table-suspendidos">
              <thead>
                <tr>
                  <th style="width: 28%;">Ejercicio / Maniobra</th>
                  <th style="width: 14%;">Curso & Misión</th>
                  <th style="width: 11%;">Vuelo Suspensión</th>
                  <th style="width: 7%; text-align: center;">Nota / Eval</th>
                  <th style="width: 25%;">Diagnóstico & Observaciones</th>
                  <th style="width: 15%; text-align: center;">Acción</th>
                </tr>
              </thead>
              <tbody>
                ${alumno.filteredItems.map(item => `
                  <tr id="row-item-${escapeIdForSelector(item.id)}" class="${item.corregido_en_pr ? 'row-corregido' : (item.con_vuelo_posterior ? 'row-con-posterior' : 'row-pendiente')}">
                    <td>
                      <div class="item-title">
                        <strong>${escapeHtml(item.item)}</strong>
                        <div style="display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap;">
                          ${item.tipo === 'ABIERTO' || item.nota === 'N/A' || item.nota === 'NA'
                            ? '<span class="badge-item-abierto" style="font-size: 0.68rem; padding: 2px 6px;">ABIERTO</span>' 
                            : '<span class="badge-item-suspendido" style="font-size: 0.68rem; padding: 2px 6px;">SUSPENDIDO</span>'}
                          ${item.es_manual ? '<span class="badge-item-manual" title="Registrado manualmente">MANUAL</span>' : ''}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge-tag-curso">${escapeHtml(item.curso)}</span>
                      <div class="lesson-name" title="${escapeHtml(item.lesson)}">${escapeHtml(item.lesson)}</div>
                    </td>
                    <td>
                      <div class="flight-date">📅 ${escapeHtml(item.fecha_display)}</div>
                      <div class="flight-id">${item.flight_id ? ('Vuelo #' + escapeHtml(item.flight_id)) : 'Manual'}</div>
                    </td>
                    <td style="text-align: center;">
                      ${item.tipo === 'ABIERTO' || item.nota === 'N/A' || item.nota === 'NA'
                        ? '<span class="badge-grade-na">N/A</span>'
                        : `<span class="badge-grade-fail">${item.nota}</span>`}
                    </td>
                    <td>
                      ${item.con_vuelo_posterior ? `
                        <div class="status-box status-box-observation">
                          <div class="status-box-header">
                            <span class="status-icon">💬</span>
                            <strong>REALIZADO EN VUELO POSTERIOR (COMENTARIO)</strong>
                          </div>
                          <p class="status-box-desc">${escapeHtml(item.detalle_recuperacion)}</p>
                          <div style="margin-top: 5px; font-size: 0.72rem; color: #b45309; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                            <span>⚠️</span>
                            <span>Requiere ser reprogramado y superado para darse por cerrado.</span>
                          </div>
                        </div>
                      ` : (item.tipo === 'ABIERTO' || item.nota === 'N/A' || item.nota === 'NA') ? `
                        <div class="status-box status-box-warning-item">
                          <div class="status-box-header">
                            <span class="status-icon">🟡</span>
                            <strong>ÍTEM ABIERTO PENDIENTE</strong>
                          </div>
                          <p class="status-box-desc">${escapeHtml(item.detalle_recuperacion)}</p>
                        </div>
                      ` : `
                        <div class="status-box status-box-danger">
                          <div class="status-box-header">
                            <span class="status-icon">🔴</span>
                            <strong>${item.es_manual ? 'REGISTRADO MANUALMENTE' : 'NO SUPERADO EN REPORTE'}</strong>
                          </div>
                          <p class="status-box-desc">${escapeHtml(item.detalle_recuperacion)}</p>
                        </div>
                      `}
                    </td>
                    <td style="text-align: center;">
                      ${!item.corregido_en_pr ? `
                        <button class="btn btn-sm btn-mark-resolved" onclick="marcarItemSuperado('${escapeHtml(item.id)}', true)" title="Marcar como reprogramado y superado para archivarlo de la lista activa">
                          ✓ Reprogramado y Superado
                        </button>
                      ` : `
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                          <span class="badge-resolved-label">✓ Superado / Cerrado</span>
                          <button class="btn-undo-link" onclick="marcarItemSuperado('${escapeHtml(item.id)}', false)" title="Desmarcar y volver a mostrar en pendientes">
                            ↩ Desmarcar
                          </button>
                        </div>
                      `}
                      ${item.es_manual ? `
                        <div style="margin-top: 4px;">
                          <button class="btn-delete-manual" onclick="eliminarItemManual('${escapeHtml(item.id)}')" title="Eliminar este ítem manual">
                            🗑️ Borrar manual
                          </button>
                        </div>
                      ` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

// -------------------------------------------------------------
// MARCAR / DESMARCAR ÍTEMS PERSISTENTEMENTE
// -------------------------------------------------------------

async function marcarItemSuperado(itemId, marcado = true) {
  if (!itemId || !suspendidosData) return;

  // Actualización optimista inmediata en memoria local
  let itemRef = null;
  let alumnoRef = null;
  suspendidosData.alumnos.forEach(a => {
    a.items.forEach(i => {
      if (i.id === itemId) {
        i.corregido_en_pr = marcado;
        i.fecha_corregido = marcado ? new Date().toISOString() : "";
        itemRef = i;
        alumnoRef = a;
      }
    });
    // Recalcular stats alumno
    a.total_corregidos_pr = a.items.filter(i => i.corregido_en_pr).length;
    a.total_activos_pr = a.items.length - a.total_corregidos_pr;
  });

  // Recalcular stats globales
  suspendidosData.total_corregidos_pr = suspendidosData.alumnos.reduce((acc, a) => acc + a.total_corregidos_pr, 0);
  suspendidosData.total_activos_pr = suspendidosData.total_items_suspendidos - suspendidosData.total_corregidos_pr;

  // Si estamos en la vista de activos y se marcó como superado, animar y retirar
  if (currentModoVista === "activos" && marcado) {
    const row = document.getElementById(`row-item-${escapeIdForSelector(itemId)}`);
    if (row) {
      row.style.transition = "all 0.3s ease";
      row.style.opacity = "0";
      row.style.transform = "translateX(20px)";
      setTimeout(() => {
        actualizarBadgesSuspendidos();
        renderizarKPIs();
        renderizarListadoAlumnos();
      }, 250);
    } else {
      actualizarBadgesSuspendidos();
      renderizarKPIs();
      renderizarListadoAlumnos();
    }
  } else {
    actualizarBadgesSuspendidos();
    renderizarKPIs();
    renderizarListadoAlumnos();
  }

  // Notificación toast
  const msg = marcado 
    ? `Maniobra marcada como superada (persistirá al importar nuevos Excels).` 
    : `Maniobra devuelta a la lista de pendientes.`;
  mostrarToastNotificacion(msg);

  // Llamada al backend con metadata enriquecida
  try {
    const meta = (itemRef && alumnoRef) ? {
      student_key: alumnoRef.code || alumnoRef.name,
      student_code: alumnoRef.code,
      student_name: alumnoRef.name,
      curso: itemRef.curso,
      item: itemRef.item,
      fecha: itemRef.fecha,
      flight_id: itemRef.flight_id
    } : {};

    const res = await fetch("/api/items_suspendidos/marcar_corregido", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId, marcado, metadata: meta })
    });
    if (!res.ok) throw new Error("Error en servidor al guardar estado");
  } catch (err) {
    console.error("Error al guardar estado de corrección:", err);
    mostrarToastNotificacion("⚠️ Error guardando en disco: " + err.message);
  }
}

async function marcarTodosAlumnoSuperados(studentName, marcado = true) {
  if (!suspendidosData) return;
  const alumno = suspendidosData.alumnos.find(a => a.name === studentName);
  if (!alumno) return;

  const targetItems = currentCursoFilter === "all" ? alumno.items : alumno.items.filter(i => i.curso === currentCursoFilter);
  const itemsToUpdate = targetItems.filter(i => (marcado ? !i.corregido_en_pr : i.corregido_en_pr));
  
  if (itemsToUpdate.length === 0) {
    mostrarToastNotificacion(marcado ? "Todas las maniobras ya están marcadas." : "No hay maniobras para desmarcar.");
    return;
  }

  const itemIds = itemsToUpdate.map(i => i.id);

  // Actualización optimista local
  itemsToUpdate.forEach(i => {
    i.corregido_en_pr = marcado;
    i.fecha_corregido = marcado ? new Date().toISOString() : "";
  });

  alumno.total_corregidos_pr = alumno.items.filter(i => i.corregido_en_pr).length;
  alumno.total_activos_pr = alumno.items.length - alumno.total_corregidos_pr;
  suspendidosData.total_corregidos_pr = suspendidosData.alumnos.reduce((acc, a) => acc + a.total_corregidos_pr, 0);
  suspendidosData.total_activos_pr = suspendidosData.total_items_suspendidos - suspendidosData.total_corregidos_pr;

  actualizarBadgesSuspendidos();
  renderizarKPIs();
  renderizarListadoAlumnos();

  mostrarToastNotificacion(`${itemIds.length} maniobra(s) marcadas como superadas.`);

  // Backend
  try {
    await fetch("/api/items_suspendidos/marcar_lote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: itemIds, marcado })
    });
  } catch (err) {
    console.error("Error al guardar lote:", err);
  }
}

function toggleStudentCard(index) {
  const body = document.getElementById(`student-body-${index}`);
  const toggleBtn = document.getElementById(`toggle-btn-${index}`);
  if (!body) return;

  const isHidden = body.style.display === "none";
  body.style.display = isHidden ? "block" : "none";
  if (toggleBtn) {
    toggleBtn.textContent = isHidden ? "▲" : "▼";
  }
}

function toggleAllStudentCards(expand) {
  document.querySelectorAll(".student-card-body").forEach(el => {
    el.style.display = expand ? "block" : "none";
  });
  document.querySelectorAll(".btn-accordion-toggle").forEach(btn => {
    btn.textContent = expand ? "▲" : "▼";
  });
}

function copiarAlPortapapeles(texto, msgExito = "Copiado al portapapeles") {
  if (!texto) return;
  navigator.clipboard.writeText(texto).then(() => {
    mostrarToastNotificacion(msgExito);
  }).catch(() => {
    const input = document.createElement("input");
    input.value = texto;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    mostrarToastNotificacion(msgExito);
  });
}

function copiarResumenAlumno(nombre, codigo) {
  if (!suspendidosData) return;
  const alumno = suspendidosData.alumnos.find(a => a.name === nombre);
  if (!alumno) return;

  const itemsActivos = alumno.items.filter(i => !i.corregido_en_pr);
  if (itemsActivos.length === 0) {
    mostrarToastNotificacion(`Todas las maniobras de ${alumno.name.split(',')[0]} ya fueron resueltas.`);
    return;
  }

  const cursosActivos = Array.from(new Set(itemsActivos.map(it => it.curso).filter(Boolean)));
  let texto = `ALUMNO: ${alumno.name} (Código PR: ${alumno.code || 'N/A'})\n`;
  texto += `CURSOS: ${(cursosActivos.length > 0 ? cursosActivos : alumno.cursos).join(', ')}\n`;
  texto += `MANIOBRAS PENDIENTES DE REPROGRAMAR / RESOLVER (${itemsActivos.length}):\n`;
  texto += `------------------------------------------------------\n`;

  itemsActivos.forEach((it, idx) => {
    const isAbierto = it.tipo === 'ABIERTO' || it.nota === 'N/A' || it.nota === 'NA';
    const tipoLabel = isAbierto ? 'ÍTEM ABIERTO' : 'SUSPENDIDO';
    texto += `${idx + 1}. [${it.curso}] ${it.item} (${tipoLabel})\n`;
    texto += `   - Evaluación: Nota ${it.nota} el ${it.fecha_display} (Vuelo #${it.flight_id || 'N/A'}, ${it.lesson || 'S/D'})\n`;
    if (it.con_vuelo_posterior || it.recuperado) {
      texto += `   - DIAGNÓSTICO: ${it.detalle_recuperacion}\n`;
      texto += `     * IMPORTANTE: Realizado en vuelo posterior (comentario). Requiere ser reprogramado y superado para darse por cerrado.\n`;
    } else {
      texto += `   - DIAGNÓSTICO: PENDIENTE DE REPROGRAMAR Y SUPERAR\n`;
    }
    texto += `\n`;
  });

  copiarAlPortapapeles(texto, `Resumen de ${alumno.name.split(',')[0]} copiado`);
}

function copiarResumenGlobalParaPR() {
  if (!suspendidosData || !suspendidosData.alumnos) return;

  // Filtrar los que están pendientes de resolver
  const alumnosConPendientes = suspendidosData.alumnos.map(a => ({
    ...a,
    activos: a.items.filter(i => !i.corregido_en_pr)
  })).filter(a => a.activos.length > 0);

  if (alumnosConPendientes.length === 0) {
    mostrarToastNotificacion("No hay maniobras pendientes de resolver.");
    return;
  }

  let texto = `======================================================\n`;
  texto += `INFORME OPERATIVO DE ÍTEMS SUSPENDIDOS Y ABIERTOS - BLUE TEAM\n`;
  texto += `Total Alumnos con Maniobras Pendientes: ${alumnosConPendientes.length}\n`;
  texto += `Total Maniobras Pendientes de Resolver: ${suspendidosData.total_activos_pr}\n`;
  texto += `======================================================\n\n`;

  alumnosConPendientes.forEach(alumno => {
    const cursosActivos = Array.from(new Set(alumno.activos.map(it => it.curso).filter(Boolean)));
    texto += `👤 ALUMNO: ${alumno.name} | CÓDIGO PR: ${alumno.code || 'N/A'}\n`;
    texto += `   Cursos: ${(cursosActivos.length > 0 ? cursosActivos : alumno.cursos).join(', ')}\n`;
    alumno.activos.forEach(it => {
      let tag = '🔴 [SUSPENDIDO]';
      if (it.tipo === 'ABIERTO' || it.nota === 'N/A' || it.nota === 'NA') {
        tag = '🟡 [ÍTEM ABIERTO]';
      }
      if (it.con_vuelo_posterior || it.recuperado) {
        tag += ' 💬 [CON VUELO POSTERIOR]';
      }
      texto += `   ${tag} ${it.item} (Nota ${it.nota} el ${it.fecha_display} - Vuelo #${it.flight_id || 'N/A'})\n`;
      if (it.con_vuelo_posterior || it.recuperado) {
        texto += `       ↳ ${it.detalle_recuperacion}\n`;
      }
    });
    texto += `\n`;
  });

  copiarAlPortapapeles(texto, "Informe activo para Private Radar copiado");
}

function exportarExcelSuspendidos() {
  if (!suspendidosData || !suspendidosData.alumnos) {
    alert("No hay datos cargados para exportar.");
    return;
  }

  const rows = [];
  rows.push([
    "Código PR",
    "Nombre Alumno",
    "Curso",
    "Tipo",
    "Ejercicio / Maniobra",
    "Nota / Eval",
    "Fecha Suspensión",
    "Vuelo Original",
    "Misión / Lección",
    "¿Con Vuelo Posterior?",
    "¿Reprogramado y Superado?",
    "Diagnóstico / Comentarios"
  ]);

  suspendidosData.alumnos.forEach(al => {
    al.items.forEach(it => {
      rows.push([
        al.code || "",
        al.name,
        it.curso,
        it.tipo || (it.nota === "N/A" || it.nota === "NA" ? "ABIERTO" : "SUSPENDIDO"),
        it.item,
        it.nota,
        it.fecha_display,
        it.flight_id,
        it.lesson,
        it.con_vuelo_posterior || it.recuperado ? "SÍ (COMENTARIO)" : "NO",
        it.corregido_en_pr ? "SÍ (SUPERADO)" : "PENDIENTE",
        it.detalle_recuperacion
      ]);
    });
  });

  if (typeof XLSX !== "undefined") {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Items Suspendidos");
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Informe_Items_Suspendidos_${dateStr}.xlsx`);
  } else {
    let csvContent = "\uFEFF" + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Informe_Items_Suspendidos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }
}

// -------------------------------------------------------------
// GESTIÓN DE ARCHIVOS Y SUBIDA DRAG & DROP
// -------------------------------------------------------------

async function abrirModalArchivosSuspendidos() {
  const modal = document.getElementById("modal-archivos-suspendidos");
  if (!modal) return;
  modal.classList.remove("hidden");
  cargarListaArchivosModal();
}

function cerrarModalArchivosSuspendidos() {
  const modal = document.getElementById("modal-archivos-suspendidos");
  if (modal) modal.classList.add("hidden");
}

async function cargarListaArchivosModal() {
  const container = document.getElementById("modal-archivos-lista");
  if (!container) return;

  try {
    const res = await fetch("/api/items_suspendidos/archivos");
    const archivos = await res.json();

    if (!archivos || archivos.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem;">No hay archivos en la carpeta.</p>`;
      return;
    }

    container.innerHTML = archivos.map(f => `
      <div class="file-item-row">
        <div class="file-item-left">
          <span class="file-icon">📊</span>
          <div>
            <div class="file-item-name">
              <strong>${escapeHtml(f.filename)}</strong>
              <span class="badge-curso badge-curso-${(f.curso || '').toLowerCase()}">${escapeHtml(f.curso)}</span>
            </div>
            <div class="file-item-meta">${f.total_alumnos} alumnos · ${f.mtime} · ${(f.size / 1024).toFixed(1)} KB</div>
          </div>
        </div>
        <div class="file-item-actions">
          <button class="btn btn-secondary btn-sm" onclick="analizarArchivoEspecifico('${escapeHtml(f.filename)}')">Filtrar este</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarArchivoExcel('${escapeHtml(f.filename)}')">🗑️</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = `<p style="color: #ef4444; font-size: 0.85rem;">Error al listar archivos: ${e.message}</p>`;
  }
}

async function analizarArchivoEspecifico(filename) {
  cerrarModalArchivosSuspendidos();
  const container = document.getElementById("suspendidos-content-area");
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
        <div style="font-size: 2.5rem; margin-bottom: 1rem; animation: spin 1s linear infinite;">⏳</div>
        <p style="font-size: 1.1rem; font-weight: 500;">Analizando ${filename}...</p>
      </div>
    `;
  }
  try {
    const res = await fetch(`/api/items_suspendidos/analizar?archivo=${encodeURIComponent(filename)}`);
    const singleData = await res.json();
    suspendidosData = {
      cursos: [singleData.curso],
      archivos: [{ filename: singleData.filename, curso: singleData.curso }],
      total_alumnos_con_suspensos: singleData.total_alumnos_con_suspensos,
      total_items_suspendidos: singleData.total_items_suspendidos,
      total_corregidos_pr: singleData.total_corregidos_pr,
      total_activos_pr: singleData.total_activos_pr,
      total_recuperados: singleData.alumnos.reduce((acc, a) => acc + a.suspensos_recuperados, 0),
      total_pendientes: singleData.alumnos.reduce((acc, a) => acc + a.suspensos_pendientes, 0),
      alumnos: singleData.alumnos.map(a => ({ ...a, cursos: [singleData.curso] }))
    };
    currentCursoFilter = "all";
    actualizarBadgesSuspendidos();
    renderizarSuspendidosUI();
  } catch (e) {
    alert("Error al analizar archivo: " + e.message);
  }
}

async function eliminarArchivoExcel(filename) {
  if (!confirm(`¿Eliminar el archivo "${filename}" de la carpeta de ejercicios?`)) return;
  try {
    const res = await fetch("/api/items_suspendidos/eliminar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename })
    });
    if (!res.ok) throw new Error("Error al eliminar");
    cargarListaArchivosModal();
    cargarItemsSuspendidos();
  } catch (e) {
    alert("Error: " + e.message);
  }
}

async function handleFileUpload(file) {
  if (!file) return;
  if (!file.name.endsWith(".xlsx")) {
    alert("Por favor selecciona un archivo Excel (.xlsx)");
    return;
  }

  const uploadProgress = document.getElementById("upload-progress-suspendidos");
  if (uploadProgress) uploadProgress.style.display = "block";

  try {
    const res = await fetch("/api/items_suspendidos/upload", {
      method: "POST",
      headers: {
        "X-Filename": encodeURIComponent(file.name),
        "Content-Type": "application/octet-stream"
      },
      body: file
    });

    if (!res.ok) throw new Error("Error al subir archivo");
    suspendidosData = await res.json();

    if (uploadProgress) uploadProgress.style.display = "none";
    cerrarModalArchivosSuspendidos();
    mostrarToastNotificacion(`Archivo "${file.name}" cargado y analizado con éxito.`);
    actualizarBadgesSuspendidos();
    renderizarSuspendidosUI();
  } catch (e) {
    if (uploadProgress) uploadProgress.style.display = "none";
    alert("Error al subir el archivo: " + e.message);
  }
}

function setupDragAndDrop() {
  const dropZone = document.getElementById("dropzone-suspendidos");
  const fileInput = document.getElementById("file-input-suspendidos");
  if (!dropZone || !fileInput) return;

  dropZone.addEventListener("click", () => fileInput.click());

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  });
}

function mostrarToastNotificacion(mensaje) {
  let toast = document.getElementById("toast-suspendidos");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-suspendidos";
    toast.className = "toast-notification";
    document.body.appendChild(toast);
  }
  toast.textContent = mensaje;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function escapeHtml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function escapeIdForSelector(id) {
  if (!id) return "";
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}

// -------------------------------------------------------------
// CONTROL DE EXPEDIENTE REVISADO / AUDITADO
// -------------------------------------------------------------

async function toggleExpedienteRevisado(studentKey, marcado) {
  if (!studentKey || !suspendidosData) return;

  // Actualización optimista local
  const alumno = suspendidosData.alumnos.find(a => (a.code === studentKey || a.name === studentKey));
  if (alumno) {
    alumno.expediente_revisado = marcado;
    alumno.fecha_expediente_revisado = marcado ? new Date().toLocaleDateString('es-ES') : "";
  }
  suspendidosData.total_alumnos_revisados = suspendidosData.alumnos.filter(a => a.expediente_revisado).length;

  renderizarKPIs();
  renderizarListadoAlumnos();

  mostrarToastNotificacion(marcado 
    ? `Expediente de ${studentKey} marcado como auditado/revisado.` 
    : `Expediente de ${studentKey} marcado como pendiente de auditar.`);

  try {
    const res = await fetch("/api/items_suspendidos/marcar_expediente_revisado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_key: studentKey, revisado: marcado })
    });
    if (!res.ok) throw new Error("Error en servidor al guardar estado del expediente");
  } catch (err) {
    console.error("Error al guardar estado de expediente:", err);
    mostrarToastNotificacion("⚠️ Error guardando en disco: " + err.message);
  }
}

// -------------------------------------------------------------
// GESTIÓN DE ÍTEMS MANUALES
// -------------------------------------------------------------

function abrirModalAddItemManual(preStudentName = "", preStudentCode = "", preCurso = "") {
  const modal = document.getElementById("modal-add-item-manual");
  if (!modal) return;

  const select = document.getElementById("modal-manual-alumno-select");
  if (select && suspendidosData && suspendidosData.alumnos) {
    let html = `<option value="">-- Seleccionar Alumno del Listado --</option>`;
    suspendidosData.alumnos.forEach(a => {
      const isSelected = (preStudentName && a.name === preStudentName) || (preStudentCode && a.code === preStudentCode);
      html += `<option value="${escapeHtml(a.code || a.name)}" data-code="${escapeHtml(a.code || '')}" data-name="${escapeHtml(a.name)}" ${isSelected ? 'selected' : ''}>
        ${escapeHtml(a.name)} (${escapeHtml(a.code || 'SIN CÓDIGO')})
      </option>`;
    });
    html += `<option value="otro">+ Alumno no listado / manual...</option>`;
    select.innerHTML = html;
  }

  const codInput = document.getElementById("modal-manual-codigo");
  if (codInput) codInput.value = preStudentCode || "";

  const cursoSelect = document.getElementById("modal-manual-curso");
  if (cursoSelect && preCurso) cursoSelect.value = preCurso;

  const fechaInput = document.getElementById("modal-manual-fecha");
  if (fechaInput) fechaInput.value = new Date().toISOString().slice(0, 10);

  const itemInput = document.getElementById("modal-manual-item");
  if (itemInput) itemInput.value = "";

  const notaInput = document.getElementById("modal-manual-nota");
  if (notaInput) notaInput.value = "2.0";

  const flightInput = document.getElementById("modal-manual-flight");
  if (flightInput) flightInput.value = "";

  const lessonInput = document.getElementById("modal-manual-lesson");
  if (lessonInput) lessonInput.value = "";

  const obsInput = document.getElementById("modal-manual-obs");
  if (obsInput) obsInput.value = "";

  modal.classList.remove("hidden");
}

function cerrarModalAddItemManual() {
  const modal = document.getElementById("modal-add-item-manual");
  if (modal) modal.classList.add("hidden");
}

function onManualAlumnoSelectChange(val) {
  const select = document.getElementById("modal-manual-alumno-select");
  const opt = select.selectedOptions[0];
  const codInput = document.getElementById("modal-manual-codigo");
  if (val === "otro") {
    const customName = prompt("Nombre completo del nuevo alumno (ej: Apellidos, Nombre):");
    if (!customName) {
      select.value = "";
      return;
    }
    const customCode = prompt("Código en Private Radar (ej: VPADI, LUKEM):") || "";
    if (codInput) codInput.value = customCode.toUpperCase();
    select.dataset.customName = customName;
  } else if (opt) {
    if (codInput) codInput.value = opt.dataset.code || "";
    delete select.dataset.customName;
  }
}

async function guardarItemManual() {
  const select = document.getElementById("modal-manual-alumno-select");
  const opt = select ? select.selectedOptions[0] : null;
  const studentCode = document.getElementById("modal-manual-codigo") ? document.getElementById("modal-manual-codigo").value.trim().toUpperCase() : "";
  const studentName = (select && select.dataset.customName) ? select.dataset.customName : (opt ? opt.dataset.name : "");

  const curso = document.getElementById("modal-manual-curso") ? document.getElementById("modal-manual-curso").value : "General";
  const item = document.getElementById("modal-manual-item") ? document.getElementById("modal-manual-item").value.trim() : "";
  const nota = document.getElementById("modal-manual-nota") ? document.getElementById("modal-manual-nota").value : 2.0;
  const flight = document.getElementById("modal-manual-flight") ? document.getElementById("modal-manual-flight").value.trim() : "";
  const fecha = document.getElementById("modal-manual-fecha") ? document.getElementById("modal-manual-fecha").value : "";
  const lesson = document.getElementById("modal-manual-lesson") ? document.getElementById("modal-manual-lesson").value.trim() : "";
  const obs = document.getElementById("modal-manual-obs") ? document.getElementById("modal-manual-obs").value.trim() : "";

  if (!item) {
    alert("Por favor introduce el nombre del ejercicio o maniobra suspendida.");
    return;
  }
  if (!studentName && !studentCode) {
    alert("Por favor selecciona o introduce un alumno.");
    return;
  }

  try {
    const res = await fetch("/api/items_suspendidos/agregar_manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_code: studentCode,
        student_name: studentName,
        curso,
        item,
        nota: parseFloat(nota) || 2.0,
        fecha,
        flight_id: flight,
        lesson,
        observacion: obs
      })
    });
    if (!res.ok) throw new Error("Error en servidor al guardar ítem manual");
    
    cerrarModalAddItemManual();
    mostrarToastNotificacion(`Maniobra "${item}" agregada con éxito.`);
    await cargarItemsSuspendidos(true);
  } catch (err) {
    alert("Error al guardar ítem manual: " + err.message);
  }
}

async function eliminarItemManual(itemId) {
  if (!confirm("¿Deseas eliminar este ítem manual registrado?")) return;
  try {
    const res = await fetch("/api/items_suspendidos/eliminar_manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId })
    });
    if (!res.ok) throw new Error("Error al eliminar");
    mostrarToastNotificacion("Ítem manual eliminado.");
    await cargarItemsSuspendidos(true);
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// -------------------------------------------------------------
// INFORME LIMPIO PARA EL CFI (JEFATURA DE VUELOS)
// -------------------------------------------------------------

function abrirModalInformeCFI() {
  const modal = document.getElementById("modal-informe-cfi");
  if (!modal) return;

  // Poblar selector de cursos
  const cursoSel = document.getElementById("cfi-filter-curso");
  if (cursoSel && suspendidosData && suspendidosData.cursos) {
    let html = `<option value="all">🌐 Todos los Cursos</option>`;
    suspendidosData.cursos.forEach(c => {
      html += `<option value="${c}">${getCursoIcon(c)} ${c}</option>`;
    });
    cursoSel.innerHTML = html;
  }

  actualizarVistaPreviaCFI();
  modal.classList.remove("hidden");
}

function cerrarModalInformeCFI() {
  const modal = document.getElementById("modal-informe-cfi");
  if (modal) modal.classList.add("hidden");
}

function cleanTextForPdf(str) {
  if (str === undefined || str === null) return "";
  let s = String(str);
  // 1. Reemplazos semánticos prioritarios de etiquetas y símbolos ATO
  s = s.replace(/🟡/g, '[ABIERTO]');
  s = s.replace(/🔴/g, '[SUSPENDIDO]');
  s = s.replace(/💬/g, '[V. POSTERIOR]');
  s = s.replace(/✓/g, '[OK]');
  s = s.replace(/↳\s*/g, '-> ');
  s = s.replace(/•/g, '-');
  s = s.replace(/[–—]/g, '-');
  s = s.replace(/[‘’]/g, "'");
  s = s.replace(/[“”]/g, '"');
  s = s.replace(/…/g, '...');
  s = s.replace(/≤/g, '<=');
  s = s.replace(/≥/g, '>=');
  // 2. Eliminar cualquier otro emoji o símbolo no soportado por fuentes base de jsPDF (WinAnsi)
  s = s.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
  return s.trim();
}

/**
 * Guarda el archivo PDF localmente en la carpeta de Descargas del sistema operativo
 * y lo selecciona en el Explorador de Windows mediante el backend local.
 * Si se ejecuta en un navegador web convencional o falla el backend, utiliza doc.save() como fallback.
 */
async function guardarPDFItemsSuspendidos(doc, filename) {
  try {
    const pdfBytes = doc.output('arraybuffer');
    const response = await fetch('/api/items_suspendidos/guardar_pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
        'X-Filename': encodeURIComponent(filename)
      },
      body: pdfBytes
    });

    if (response.ok) {
      const result = await response.json();
      if (result.status === 'ok') {
        const dest = result.ubicacion === 'Descargas'
          ? 'Guardado en la carpeta Descargas y seleccionado en el Explorador de Windows.'
          : `Guardado en: ${result.carpeta}`;
        mostrarToastNotificacion(`📄 PDF generado con éxito. ${dest}`);
        return;
      }
    }
  } catch (err) {
    console.warn('No se pudo guardar directamente a través del backend local, usando fallback del navegador:', err);
  }

  // Fallback para navegador web tradicional o en caso de indisponibilidad del endpoint local
  doc.save(filename);
  mostrarToastNotificacion('📄 Informe PDF oficial descargado con éxito.');
}

function getItemsCFIProblematicos() {
  if (!suspendidosData || !suspendidosData.alumnos) return [];

  const cursoFiltro = document.getElementById("cfi-filter-curso") ? document.getElementById("cfi-filter-curso").value : "all";
  const expFiltro = document.getElementById("cfi-filter-expedientes") ? document.getElementById("cfi-filter-expedientes").value : "all";

  let alumnos = suspendidosData.alumnos;

  // Filtro por expediente si se requiere
  if (expFiltro === "revisados") {
    alumnos = alumnos.filter(a => a.expediente_revisado);
  } else if (expFiltro === "pendientes" || expFiltro === "pendientes_auditar") {
    alumnos = alumnos.filter(a => !a.expediente_revisado);
  }

  // Filtrar estrictamente solo alumnos con maniobras que NO han sido resueltas (!corregido_en_pr)
  const result = [];
  alumnos.forEach(a => {
    let items = a.items.filter(i => !i.corregido_en_pr);
    if (cursoFiltro !== "all") {
      items = items.filter(i => i.curso === cursoFiltro);
    }
    if (items.length > 0) {
      const cursosPendientes = Array.from(new Set(items.map(it => it.curso).filter(Boolean)));
      result.push({
        ...a,
        itemsPendientes: items,
        cursosPendientes: cursosPendientes.length > 0 ? cursosPendientes : (a.cursos || [])
      });
    }
  });

  return result;
}

function actualizarVistaPreviaCFI() {
  const container = document.getElementById("cfi-report-preview-container");
  if (!container) return;

  const alumnosProblematicos = getItemsCFIProblematicos();
  const totalItems = alumnosProblematicos.reduce((acc, a) => acc + a.itemsPendientes.length, 0);

  const kpiAl = document.getElementById("cfi-kpi-alumnos-count");
  if (kpiAl) kpiAl.textContent = `${alumnosProblematicos.length} Alumnos`;

  const kpiIt = document.getElementById("cfi-kpi-items-count");
  if (kpiIt) kpiIt.textContent = `${totalItems} Maniobras por Subsanar`;

  if (alumnosProblematicos.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎉</div>
        <h4 style="color: var(--text-main); margin-bottom: 0.25rem;">¡Sin maniobras problemáticas pendientes!</h4>
        <p style="font-size: 0.88rem;">Todos los ítems de los alumnos seleccionados han sido marcados como resueltos o no hay incidencias bajo estos filtros.</p>
      </div>
    `;
    return;
  }

  let html = ``;
  alumnosProblematicos.forEach(alumno => {
    html += `
      <div class="cfi-student-block">
        <div class="cfi-student-title">
          <span>👤 ${escapeHtml(alumno.name)}</span>
          <span style="font-size: 0.78rem; font-family: 'JetBrains Mono', monospace; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 2px 6px; border-radius: 4px;">
            CÓDIGO PR: ${escapeHtml(alumno.code || 'SIN CÓDIGO')}
          </span>
          <span style="font-size: 0.75rem; background: rgba(2, 132, 199, 0.15); color: #0284c7; padding: 2px 6px; border-radius: 4px; font-weight: 700;">
            ${escapeHtml((alumno.cursosPendientes || alumno.cursos).join(', '))}
          </span>
          <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: auto;">
            ${alumno.itemsPendientes.length} maniobra(s)
          </span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.35rem;">
          ${alumno.itemsPendientes.map(it => `
            <div class="cfi-item-row">
              <div style="flex: 1;">
                <div class="cfi-item-name">
                  <span class="badge-tag-curso" style="margin-right: 4px;">${escapeHtml(it.curso)}</span>
                  ${escapeHtml(it.item)}
                  ${it.es_manual ? '<span class="badge-item-manual">MANUAL</span>' : ''}
                </div>
                <div class="cfi-item-details">
                  Vuelo #${escapeHtml(it.flight_id || 'N/A')} (${escapeHtml(it.fecha_display)}) · ${escapeHtml(it.lesson || 'Lección N/A')}
                </div>
              </div>
              <div style="text-align: right; min-width: 150px;">
                ${it.tipo === 'ABIERTO' || it.nota === 'N/A' || it.nota === 'NA'
                  ? '<span class="badge-grade-na" style="font-size: 0.75rem; padding: 1px 6px;">N/A</span>'
                  : `<span class="badge-grade-fail" style="font-size: 0.75rem; padding: 1px 6px;">Nota ${it.nota}</span>`}
                <div style="font-size: 0.74rem; font-weight: 600; margin-top: 3px; color: ${it.con_vuelo_posterior ? '#f59e0b' : (it.tipo === 'ABIERTO' ? '#d97706' : '#ef4444')};">
                  ${it.con_vuelo_posterior ? '💬 Vuelo posterior (Comentario)' : (it.tipo === 'ABIERTO' ? '🟡 Ítem abierto' : '🔴 Sin superar')}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function generarTextoInformeCFI() {
  const alumnosProblematicos = getItemsCFIProblematicos();
  if (alumnosProblematicos.length === 0) return "";

  const totalItems = alumnosProblematicos.reduce((acc, a) => acc + a.itemsPendientes.length, 0);
  const fechaHoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  let txt = `✈️ BLUE TEAM FLIGHT ACADEMY - INFORME PARA CFI\n`;
  txt += `ASUNTO: Maniobras suspendidas y abiertas pendientes de reprogramar / subsanar\n`;
  txt += `FECHA: ${fechaHoy} | ALUMNOS AFECTADOS: ${alumnosProblematicos.length} | TOTAL MANIOBRAS: ${totalItems}\n`;
  txt += `(Nota: Este reporte excluye estrictamente todas las maniobras ya reprogramadas y superadas)\n`;
  txt += `======================================================================\n\n`;

  alumnosProblematicos.forEach((al, index) => {
    txt += `${index + 1}. 👤 ALUMNO: ${al.name}\n`;
    txt += `   CÓDIGO PR: ${al.code || 'N/A'}\n`;
    txt += `   CURSOS: ${(al.cursosPendientes || al.cursos).join(', ')}\n`;
    txt += `   MANIOBRAS PENDIENTES (${al.itemsPendientes.length}):\n`;

    al.itemsPendientes.forEach((it, itIdx) => {
      const isAbierto = it.tipo === 'ABIERTO' || it.nota === 'N/A' || it.nota === 'NA';
      let estadoTag = isAbierto ? '[🟡 ÍTEM ABIERTO]' : '[🔴 SUSPENDIDO]';
      if (it.con_vuelo_posterior || it.recuperado) {
        estadoTag += ' [💬 CON VUELO POSTERIOR - COMENTARIO]';
      }
      txt += `   ${itIdx + 1}) [${it.curso}] ${it.item} ${it.es_manual ? '(MANUAL)' : ''}\n`;
      txt += `      - Evaluación: ${it.nota} en Vuelo #${it.flight_id || 'N/A'} (${it.fecha_display}) - ${it.lesson || 'S/D'}\n`;
      txt += `      - Estado: ${estadoTag}\n`;
      if ((it.con_vuelo_posterior || it.recuperado) && it.detalle_recuperacion) {
        txt += `      - Diagnóstico: ${it.detalle_recuperacion}\n`;
        txt += `        * NOTA ATO: Realizado en vuelo posterior. Debe reprogramarse y superarse formalmente para cerrarse.\n`;
      }
    });
    txt += `\n`;
  });

  txt += `======================================================================\n`;
  txt += `Por favor, revisar y coordinar la reprogramación de los ítems pendientes para habilitar convocatorias de examen.\n`;

  return txt;
}

function copiarTextoInformeCFI() {
  const txt = generarTextoInformeCFI();
  if (!txt) {
    mostrarToastNotificacion("No hay maniobras pendientes para generar informe.");
    return;
  }
  copiarAlPortapapeles(txt, "Informe para CFI copiado al portapapeles listo para enviar");
}

async function descargarPDFInformeCFI() {
  const alumnosProblematicos = getItemsCFIProblematicos();
  if (alumnosProblematicos.length === 0) {
    alert("No hay maniobras pendientes con los filtros seleccionados para incluir en el PDF.");
    return;
  }

  if (typeof window.jspdf === "undefined" || !window.jspdf.jsPDF) {
    alert("La librería jsPDF no está disponible en este momento.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const orientacion = (document.getElementById("cfi-filter-orientacion")?.value) || "portrait";
  const isLandscape = orientacion === "landscape";
  const incluirResumen = document.getElementById("cfi-chk-resumen") ? document.getElementById("cfi-chk-resumen").checked : true;

  const doc = new jsPDF({
    orientation: orientacion,
    unit: "pt",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - (margin * 2);

  // Totales estadísticos
  const totalItems = alumnosProblematicos.reduce((acc, a) => acc + a.itemsPendientes.length, 0);
  const totalSuspNota = alumnosProblematicos.reduce((acc, a) => acc + a.itemsPendientes.filter(i => i.tipo === 'SUSPENDIDO' || (i.tipo !== 'ABIERTO' && i.nota !== 'N/A' && i.nota !== 'NA')).length, 0);
  const totalAbiertos = alumnosProblematicos.reduce((acc, a) => acc + a.itemsPendientes.filter(i => i.tipo === 'ABIERTO' || i.nota === 'N/A' || i.nota === 'NA').length, 0);
  const totalConPosterior = alumnosProblematicos.reduce((acc, a) => acc + a.itemsPendientes.filter(i => i.con_vuelo_posterior || i.recuperado).length, 0);
  const totalRevisados = alumnosProblematicos.filter(a => a.expediente_revisado).length;

  const fechaHoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // 1. Cabecera Corporativa Blue Team (Página 1)
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 68, "F");

  // Accent Line Cyan
  doc.setFillColor(2, 132, 199); // #0284c7
  doc.rect(0, 68, pageWidth, 3.5, "F");

  // Textos Cabecera
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("BLUE TEAM FLIGHT ACADEMY", margin, 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.text("ATO · Approved Training Organisation — Control y Auditoría Operativa", margin, 40);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(56, 189, 248); // #38bdf8
  doc.text("INFORME OFICIAL DE ALUMNOS CON ÍTEMS SUSPENDIDOS", margin, 54);

  // Resumen rápido en cabecera derecha
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Emisión: ${fechaHoy}`, pageWidth - margin, 24, { align: "right" });
  doc.text(`Alumnos Afectados: ${alumnosProblematicos.length}`, pageWidth - margin, 38, { align: "right" });
  doc.text(`Total Maniobras Pendientes: ${totalItems}`, pageWidth - margin, 52, { align: "right" });

  let currentY = 82;

  // 2. Cuadro Informativo de Metadatos y Filtros
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 38, 3, 3, "FD");

  // Accent vertical en el cuadro
  doc.setFillColor(2, 132, 199);
  doc.rect(margin, currentY, 3, 38, "F");

  const cursoFiltro = document.getElementById("cfi-filter-curso") ? document.getElementById("cfi-filter-curso").value : "all";
  const expFiltro = document.getElementById("cfi-filter-expedientes") ? document.getElementById("cfi-filter-expedientes").value : "all";
  const cursoLabel = cursoFiltro === "all" ? "Todos los cursos" : cursoFiltro;
  const expLabel = expFiltro === "revisados" ? "Solo auditados / revisados" : (expFiltro === "pendientes_auditar" ? "Solo por auditar" : "Todos los expedientes");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("FILTRO:", margin + 8, currentY + 12);
  doc.setFont("helvetica", "normal");
  doc.text(`Curso: ${cursoLabel}  |  Expedientes: ${expLabel}`, margin + 50, currentY + 12);

  doc.setFont("helvetica", "bold");
  doc.text("DESGLOSE:", margin + 8, currentY + 24);
  doc.setFont("helvetica", "normal");
  doc.text(`${totalSuspNota} Suspendidos (Nota 1-2)  |  ${totalAbiertos} Abiertos (N/A)  |  ${totalConPosterior} Con Vuelo Posterior  |  ${totalRevisados} Auditados`, margin + 60, currentY + 24);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text("Nota ATO: Reporte de maniobras pendientes de reprogramar/cerrar antes de habilitar convocatorias de examen oficial.", margin + 8, currentY + 34);

  currentY += 48;

  // 3. Tabla Resumen Ejecutivo (Índice de Alumnos) si está habilitada
  if (incluirResumen) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("1. RESUMEN EJECUTIVO DE ALUMNOS AFECTADOS", margin, currentY);
    currentY += 6;

    const summaryHead = [["#", "Alumno", "Cód. PR", "Cursos", "Susp. (<=2)", "Abiertos", "V. Post.", "Total Pend.", "Expediente"]];

    const summaryRows = alumnosProblematicos.map((al, idx) => {
      const suspCount = al.itemsPendientes.filter(i => i.tipo === 'SUSPENDIDO' || (i.tipo !== 'ABIERTO' && i.nota !== 'N/A' && i.nota !== 'NA')).length;
      const abCount = al.itemsPendientes.filter(i => i.tipo === 'ABIERTO' || i.nota === 'N/A' || i.nota === 'NA').length;
      const postCount = al.itemsPendientes.filter(i => i.con_vuelo_posterior || i.recuperado).length;
      const isRev = al.expediente_revisado ? "Auditado" : "Por auditar";

      return [
        String(idx + 1),
        cleanTextForPdf(al.name),
        cleanTextForPdf(al.code || "S/C"),
        cleanTextForPdf((al.cursosPendientes || al.cursos).join(", ")),
        String(suspCount),
        String(abCount),
        String(postCount),
        String(al.itemsPendientes.length),
        isRev
      ];
    });

    summaryRows.push([
      "",
      "TOTALES GENERALES",
      "",
      "",
      String(totalSuspNota),
      String(totalAbiertos),
      String(totalConPosterior),
      String(totalItems),
      `${totalRevisados} de ${alumnosProblematicos.length} Audit.`
    ]);

    doc.autoTable({
      startY: currentY,
      margin: { left: margin, right: margin },
      head: summaryHead,
      body: summaryRows,
      theme: "grid",
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: "bold",
        halign: "center"
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
        cellPadding: 3.5
      },
      columnStyles: {
        0: { cellWidth: 20, halign: "center" },
        1: { cellWidth: isLandscape ? 180 : 135, fontStyle: "bold" },
        2: { cellWidth: 50, halign: "center" },
        3: { cellWidth: isLandscape ? 90 : 65, halign: "center" },
        4: { cellWidth: 45, halign: "center", textColor: [185, 28, 28], fontStyle: "bold" },
        5: { cellWidth: 45, halign: "center", textColor: [180, 83, 9], fontStyle: "bold" },
        6: { cellWidth: 45, halign: "center" },
        7: { cellWidth: 45, halign: "center", fontStyle: "bold", fillColor: [241, 245, 249] },
        8: { cellWidth: isLandscape ? 90 : 70, halign: "center" }
      },
      didParseCell: function(data) {
        if (data.section === "body" && data.row.index === summaryRows.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [224, 242, 254];
          data.cell.styles.textColor = [15, 23, 42];
        }
      }
    });

    currentY = doc.lastAutoTable.finalY + 16;
  }

  // 4. Detalle Completo de Maniobras por Alumno
  const secTitle = incluirResumen ? "2. DETALLE DE MANIOBRAS Y EJERCICIOS PENDIENTES POR ALUMNO" : "DETALLE DE MANIOBRAS Y EJERCICIOS PENDIENTES POR ALUMNO";
  
  if (currentY > pageHeight - 90) {
    doc.addPage();
    currentY = 32;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(secTitle, margin, currentY);
  currentY += 8;

  alumnosProblematicos.forEach((al, aIdx) => {
    // Si queda poco espacio para la tarjeta del alumno y las primeras filas, saltar página
    if (currentY > pageHeight - 75) {
      doc.addPage();
      currentY = 32;
    }

    // Tarjeta/Franja del Alumno
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, currentY, contentWidth, 20, 2, 2, "FD");

    doc.setFillColor(2, 132, 199);
    doc.rect(margin, currentY, 3.5, 20, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const auditLabel = al.expediente_revisado ? "[AUDITADO]" : "[POR AUDITAR]";
    const cursosBanner = (al.cursosPendientes || al.cursos).join(', ');
    doc.text(
      `${aIdx + 1}. ALUMNO: ${cleanTextForPdf(al.name)}   |   CÓD. PR: ${cleanTextForPdf(al.code || 'S/C')}   |   CURSO(S): ${cleanTextForPdf(cursosBanner)}`,
      margin + 8,
      currentY + 13
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Pendientes: ${al.itemsPendientes.length} maniobra(s)   |   Expediente: ${auditLabel}`,
      pageWidth - margin - 6,
      currentY + 13,
      { align: "right" }
    );

    currentY += 24;

    const itemRows = al.itemsPendientes.map(it => {
      const isAbierto = it.tipo === 'ABIERTO' || it.nota === 'N/A' || it.nota === 'NA';
      const tagManual = it.es_manual ? ' [MANUAL]' : '';
      
      let diagText = "";
      if (it.con_vuelo_posterior || it.recuperado) {
        diagText = `[V. POSTERIOR] ${it.detalle_recuperacion || 'Realizado en vuelo posterior. Requiere reprogramar y superar para cierre.'}`;
      } else if (isAbierto) {
        diagText = "[ABIERTO] Maniobra pendiente de realizar o evaluar.";
      } else {
        diagText = "[SUSPENDIDO] Calificación no apta (<= 2.0). Pendiente reprogramar.";
      }

      return [
        cleanTextForPdf(it.curso),
        cleanTextForPdf(`${it.item}${tagManual}`),
        `Vuelo #${it.flight_id || 'S/D'}\n${it.fecha_display || '-'}`,
        cleanTextForPdf(it.lesson || 'General'),
        isAbierto ? "N/A" : String(it.nota),
        cleanTextForPdf(diagText)
      ];
    });

    doc.autoTable({
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [["Curso", "Maniobra / Ejercicio", "Vuelo / Fecha", "Misión / Lección", "Nota", "Situación / Diagnóstico ATO"]],
      body: itemRows,
      theme: "striped",
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: "bold",
        halign: "center"
      },
      bodyStyles: {
        fontSize: 7.2,
        textColor: [30, 41, 59],
        cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
        valign: "middle"
      },
      columnStyles: {
        0: { cellWidth: isLandscape ? 38 : 30, halign: "center", fontStyle: "bold" },
        1: { cellWidth: isLandscape ? 190 : 140 },
        2: { cellWidth: isLandscape ? 70 : 58, halign: "center", fontSize: 7 },
        3: { cellWidth: isLandscape ? 70 : 56, halign: "center", fontSize: 7 },
        4: { cellWidth: 28, halign: "center", fontStyle: "bold" },
        5: { cellWidth: isLandscape ? 370 : 211, fontSize: 6.8 }
      },
      didParseCell: function(data) {
        if (data.section === "body" && data.column.index === 4) {
          const val = String(data.cell.raw);
          if (val === "N/A" || val === "NA") {
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fillColor = [254, 243, 199];
          } else {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fillColor = [254, 226, 226];
          }
        }
      }
    });

    currentY = doc.lastAutoTable.finalY + 11;
  });

  // 5. Encabezado de repetición (pág > 1) y Pies de página (todas las páginas)
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    if (p > 1) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("BLUE TEAM FLIGHT ACADEMY · ATO — Control de Ítems Suspendidos", margin, 18);
      doc.text(`Fecha: ${fechaHoy}`, pageWidth - margin, 18, { align: "right" });
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, 22, pageWidth - margin, 22);
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 22, pageWidth - margin, pageHeight - 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${p} de ${totalPages} — Blue Team Flight Academy · ATO — Control Operativo de Ítems Suspendidos`,
      margin,
      pageHeight - 12
    );
    doc.text(
      "Sistema Integrado de Auditoría ATO",
      pageWidth - margin,
      pageHeight - 12,
      { align: "right" }
    );
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  await guardarPDFItemsSuspendidos(doc, `Informe_Items_Suspendidos_${dateStr}.pdf`);
}

async function descargarPDFInformeAlumno(studentIdentifier) {
  if (!suspendidosData || !suspendidosData.alumnos) {
    alert("No hay datos cargados de alumnos.");
    return;
  }

  const sNorm = String(studentIdentifier).toLowerCase().trim();
  const alumno = suspendidosData.alumnos.find(a => 
    (a.code && a.code.toLowerCase().trim() === sNorm) ||
    (a.name && a.name.toLowerCase().trim() === sNorm)
  );

  if (!alumno) {
    alert("No se encontró el alumno seleccionado.");
    return;
  }

  // Filtrar ítems pendientes
  const itemsPendientes = alumno.items.filter(i => !i.corregido_en_pr);
  if (itemsPendientes.length === 0) {
    alert(`El alumno ${alumno.name} no tiene maniobras pendientes de resolver.`);
    return;
  }

  if (typeof window.jspdf === "undefined" || !window.jspdf.jsPDF) {
    alert("La librería jsPDF no está disponible en este momento.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - (margin * 2);

  // Cabecera Corporativa
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 68, "F");
  doc.setFillColor(2, 132, 199);
  doc.rect(0, 68, pageWidth, 3.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("BLUE TEAM FLIGHT ACADEMY", margin, 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text("ATO · Approved Training Organisation — Expediente Individual de Alumno", margin, 40);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(56, 189, 248);
  doc.text("DOSSIER DE MANIOBRAS PENDIENTES DE SUBSANAR", margin, 54);

  const fechaHoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Fecha: ${fechaHoy}`, pageWidth - margin, 26, { align: "right" });
  doc.text(`Cód. PR: ${cleanTextForPdf(alumno.code || 'S/C')}`, pageWidth - margin, 40, { align: "right" });

  let currentY = 82;

  // Tarjeta Alumno
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, 42, 3, 3, "FD");

  doc.setFillColor(2, 132, 199);
  doc.rect(margin, currentY, 3.5, 42, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(cleanTextForPdf(alumno.name), margin + 10, currentY + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const cursosAfectadosAlumno = Array.from(new Set(itemsPendientes.map(it => it.curso).filter(Boolean)));
  const cursosAlumnoStr = (cursosAfectadosAlumno.length > 0 ? cursosAfectadosAlumno : alumno.cursos).join(', ');
  doc.text(`Cursos: ${cleanTextForPdf(cursosAlumnoStr)}`, margin + 10, currentY + 28);
  doc.text(`Total Maniobras Pendientes: ${itemsPendientes.length}`, margin + 10, currentY + 38);

  const auditStatus = alumno.expediente_revisado 
    ? `Expediente Auditado ${alumno.fecha_expediente_revisado ? '(' + alumno.fecha_expediente_revisado + ')' : ''}` 
    : "Expediente Por Auditar";
  doc.text(auditStatus, pageWidth - margin - 10, currentY + 16, { align: "right" });

  currentY += 52;

  // Tabla de Maniobras
  const itemRows = itemsPendientes.map(it => {
    const isAbierto = it.tipo === 'ABIERTO' || it.nota === 'N/A' || it.nota === 'NA';
    let diag = "";
    if (it.con_vuelo_posterior || it.recuperado) {
      diag = `[V. POSTERIOR] ${it.detalle_recuperacion || 'Realizado en vuelo posterior. Debe reprogramarse formalmente.'}`;
    } else if (isAbierto) {
      diag = "[ABIERTO] Pendiente de realizar o evaluar.";
    } else {
      diag = "[SUSPENDIDO] Calificación no apta (<= 2.0). Pendiente reprogramar.";
    }

    return [
      cleanTextForPdf(it.curso),
      cleanTextForPdf(`${it.item}${it.es_manual ? ' [MANUAL]' : ''}`),
      `Vuelo #${it.flight_id || 'S/D'}\n${it.fecha_display || '-'}`,
      cleanTextForPdf(it.lesson || 'General'),
      isAbierto ? "N/A" : String(it.nota),
      cleanTextForPdf(diag)
    ];
  });

  doc.autoTable({
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["Curso", "Maniobra / Ejercicio", "Vuelo / Fecha", "Misión", "Nota", "Situación / Diagnóstico ATO"]],
    body: itemRows,
    theme: "striped",
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold", halign: "center" },
    bodyStyles: {
      fontSize: 7.2,
      textColor: [30, 41, 59],
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
      valign: "middle"
    },
    columnStyles: {
      0: { cellWidth: 30, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 140 },
      2: { cellWidth: 58, halign: "center", fontSize: 7 },
      3: { cellWidth: 56, halign: "center", fontSize: 7 },
      4: { cellWidth: 28, halign: "center", fontStyle: "bold" },
      5: { cellWidth: 211, fontSize: 6.8 }
    },
    didParseCell: function(data) {
      if (data.section === "body" && data.column.index === 4) {
        const val = String(data.cell.raw);
        if (val === "N/A" || val === "NA") {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fillColor = [254, 243, 199];
        } else {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fillColor = [254, 226, 226];
        }
      }
    }
  });

  currentY = doc.lastAutoTable.finalY + 25;

  // Sección de Firmas de Validación
  if (currentY > pageHeight - 90) {
    doc.addPage();
    currentY = 40;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("VALIDACIÓN Y CONFORMIDAD OPERATIVA:", margin, currentY);
  currentY += 15;

  const colWidth = (contentWidth - 20) / 3;
  // Firma 1: CFI
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, currentY + 30, margin + colWidth, currentY + 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Firma CFI / Jefatura de Vuelos", margin + colWidth / 2, currentY + 42, { align: "center" });

  // Firma 2: Instructor
  doc.line(margin + colWidth + 10, currentY + 30, margin + (colWidth * 2) + 10, currentY + 30);
  doc.text("Firma Instructor Responsable", margin + colWidth + 10 + colWidth / 2, currentY + 42, { align: "center" });

  // Firma 3: Alumno
  doc.line(margin + (colWidth * 2) + 20, currentY + 30, margin + (colWidth * 3) + 20, currentY + 30);
  doc.text("Enterado Alumno", margin + (colWidth * 2) + 20 + colWidth / 2, currentY + 42, { align: "center" });

  // Número de páginas
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 22, pageWidth - margin, pageHeight - 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${p} de ${totalPages} — Blue Team Flight Academy · ATO — Expediente Individual`,
      margin,
      pageHeight - 12
    );
    doc.text(fechaHoy, pageWidth - margin, pageHeight - 12, { align: "right" });
  }

  const cleanFileCode = (alumno.code || alumno.name).replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  await guardarPDFItemsSuspendidos(doc, `Informe_Items_${cleanFileCode}_${dateStr}.pdf`);
}
