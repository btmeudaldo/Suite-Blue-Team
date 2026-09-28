// Estado de la aplicación
let examenes = [];
let activeSessionFilter = 'all';
let activeDayFilter = 'all';
let activeStatusFilter = 'all';
let activeCursoFilter = 'all';
let activeAsigFilter = 'all';
let activeNumExFilter = 'all';
let searchQuery = '';
let isBatchRunning = false;
let currentUploadSession = '1';

// Elementos del DOM
const examListEl = document.getElementById('exam-list');
const statTotalEl = document.getElementById('stat-total');
const statPendingEl = document.getElementById('stat-pending');
const statAnalyzedEl = document.getElementById('stat-analyzed');
const statDoneEl = document.getElementById('stat-done');

const selectFilterSesion = document.getElementById('select-filter-sesion');
const selectFilterFecha = document.getElementById('select-filter-fecha');
const selectFilterCurso = document.getElementById('select-filter-curso');
const selectFilterAsig = document.getElementById('select-filter-asig');
const selectFilterNumEx = document.getElementById('select-filter-num-ex');

const btnBatchAnalyze = document.getElementById('btn-batch-analyze');
const btnBatchRename = document.getElementById('btn-batch-rename');
const searchInput = document.getElementById('search-input');

const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const btnCancelBatch = document.getElementById('btn-cancel-batch');

// Modal
const modalEl = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-img');
const modalTitle = document.getElementById('modal-title');
const modalCloseBtn = document.getElementById('modal-close');
const modalBackdrop = document.querySelector('.modal-backdrop');

let listaAlumnosMemoria = [];
let listaAsignaturasMemoria = [];
let listaCursosMemoria = [
  { sigla: "ATPL", nombre: "ATPL - Transporte de Línea Aérea" },
  { sigla: "CESSNA", nombre: "CESSNA - Monomotor Cessna" },
  { sigla: "MEP", nombre: "MEP - Multi-Engine Piston" },
  { sigla: "DA40", nombre: "DA40 - Diamond DA40" },
  { sigla: "FI", nombre: "FI - Flight Instructor" }
];

// Cargar catálogo de cursos disponibles
async function loadCursos() {
  try {
    const res = await fetch('/api/cursos');
    const cursos = await res.json();
    if (Array.isArray(cursos) && cursos.length > 0) {
      listaCursosMemoria = cursos;
    }
  } catch (err) {
    console.error('Error cargando lista de cursos:', err);
  }
}

function updateCursoFilterOptions() {
  if (!selectFilterCurso) return;
  const currentVal = activeCursoFilter;
  selectFilterCurso.innerHTML = `
    <option value="all">Curso: Todos</option>
    ${listaCursosMemoria.map(cu => `
      <option value="${cu.sigla}" ${currentVal === cu.sigla ? 'selected' : ''}>
        Curso: ${cu.sigla}
      </option>
    `).join('')}
  `;
  if (currentVal !== 'all') {
    selectFilterCurso.classList.add('active-filter');
  } else {
    selectFilterCurso.classList.remove('active-filter');
  }
}

// Cargar asignaturas oficiales EASA
async function loadAsignaturas() {
  try {
    const res = await fetch('/api/asignaturas');
    const asigs = await res.json();
    if (Array.isArray(asigs)) {
      listaAsignaturasMemoria = asigs;
    }
  } catch (err) {
    console.error('Error cargando lista de asignaturas:', err);
  }
}

// Cargar alumnos para autocompletado y contador
async function loadAlumnos() {
  try {
    const res = await fetch('/api/alumnos');
    const alumnos = await res.json();
    if (Array.isArray(alumnos)) {
      listaAlumnosMemoria = alumnos;
      updateAlumnosUI(alumnos);
    }
  } catch (err) {
    console.error('Error cargando lista de alumnos:', err);
  }
}

function updateAlumnosUI(alumnos) {
  const datalist = document.getElementById('lista-alumnos');
  if (datalist) {
    datalist.innerHTML = alumnos.map(a => `<option value="${a}">`).join('');
  }
  const countHeader = document.getElementById('count-alumnos');
  if (countHeader) countHeader.textContent = alumnos.length;

  const countUpload = document.getElementById('upload-alumnos-count');
  if (countUpload) countUpload.textContent = alumnos.length;
}

// Modal de gestión de alumnos
function openAlumnosModal() {
  const textarea = document.getElementById('textarea-alumnos');
  const modal = document.getElementById('modal-alumnos-container');
  const preview = document.getElementById('alumnos-count-preview');
  
  if (textarea) {
    textarea.value = listaAlumnosMemoria.join('\n');
  }
  if (preview) {
    preview.textContent = `${listaAlumnosMemoria.length} alumnos cargados`;
  }
  if (modal) modal.classList.remove('hidden');
}

function closeAlumnosModal() {
  const modal = document.getElementById('modal-alumnos-container');
  if (modal) modal.classList.add('hidden');
}

function quitarTildes(str) {
  if (!str) return '';
  return str
    .replace(/[ÁÀÄÂáàäâ]/g, 'A')
    .replace(/[ÉÈËÊéèëê]/g, 'E')
    .replace(/[ÍÌÏÎíìïî]/g, 'I')
    .replace(/[ÓÒÖÔóòöô]/g, 'O')
    .replace(/[ÚÙÜÛúùüû]/g, 'U');
}

async function saveAlumnosList() {
  const textarea = document.getElementById('textarea-alumnos');
  if (!textarea) return;
  
  // Guardar siempre en mayúsculas y sin tildes para evitar problemas de codificación
  const lines = textarea.value
    .split(/[\r\n,]+/)
    .map(s => quitarTildes(s.trim().toUpperCase()))
    .filter(s => s.length > 2);
  // Eliminar duplicados manteniendo orden
  const unicos = [...new Set(lines)];
  
  if (unicos.length === 0) {
    alert('Por favor introduce al menos un nombre de alumno.');
    return;
  }
  
  try {
    const res = await fetch('/api/alumnos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alumnos: unicos })
    });
    const data = await res.json();
    if (data.status === 'ok') {
      listaAlumnosMemoria = data.alumnos;
      updateAlumnosUI(data.alumnos);
      closeAlumnosModal();
      alert(`¡Lista actualizada con éxito! Ahora el sistema cotejará contra ${data.total} alumnos.`);
    }
  } catch (err) {
    alert('Error al guardar lista de alumnos: ' + err.message);
  }
}

// --- Control y Verificación de Alumnos Nuevos / Detección de Erratas ---
let confirmedNewStudents = new Set();
let confirmAlumnoContext = null;

// Algoritmo de distancia de Levenshtein
function levenshteinDistance(s1, s2) {
  s1 = (s1 || '').trim().toUpperCase();
  s2 = (s2 || '').trim().toUpperCase();
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;

  const d = [];
  for (let i = 0; i <= s1.length; i++) d[i] = [i];
  for (let j = 0; j <= s2.length; j++) d[0][j] = j;

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  return d[s1.length][s2.length];
}

// Buscar si existe un alumno similar en la lista oficial (por si es una errata)
function findSimilarStudent(name, list) {
  if (!name || !list || list.length === 0) return null;
  const clean = quitarTildes(name.trim().toUpperCase());
  if (clean.length < 3) return null;

  // Si ya está exactamente en la lista oficial, no es una errata
  if (list.some(a => quitarTildes(a.trim().toUpperCase()) === clean)) return null;

  const inputTokens = clean.split(/\s+/).filter(t => t.length > 1);
  let bestMatch = null;
  let minScore = 999;

  for (const item of list) {
    const itemClean = quitarTildes(item.trim().toUpperCase());
    
    // 1. Comprobación directa por Levenshtein en toda la cadena (diferencia <= 2 caracteres)
    const dist = levenshteinDistance(clean, itemClean);
    if (dist <= 2 && dist < minScore) {
      minScore = dist;
      bestMatch = itemClean;
      continue;
    }

    // 2. Comprobación token por token (nombres compuestos, apellidos)
    const itemTokens = itemClean.split(/\s+/).filter(t => t.length > 1);
    if (inputTokens.length > 0 && itemTokens.length > 0) {
      let matchedTokens = 0;
      let tokenTypos = 0;

      for (const it of inputTokens) {
        if (itemTokens.includes(it)) {
          matchedTokens++;
        } else {
          // Errata de 1 carácter en alguna palabra (ej: MORALEZ vs MORALES)
          const closeTok = itemTokens.find(t => levenshteinDistance(it, t) === 1);
          if (closeTok) {
            matchedTokens++;
            tokenTypos++;
          }
        }
      }

      const tokenMatchRatio = matchedTokens / Math.max(inputTokens.length, itemTokens.length);
      const isSubMatch = matchedTokens >= 2 && (matchedTokens === inputTokens.length || tokenMatchRatio >= 0.6);
      
      if (isSubMatch || (inputTokens.length === 1 && matchedTokens === 1 && inputTokens[0].length >= 4 && tokenTypos <= 1)) {
        const score = 10 + (itemClean.length - clean.length) + (tokenTypos * 2);
        if (score < minScore) {
          minScore = score;
          bestMatch = itemClean;
        }
      }
    }
  }

  return bestMatch;
}

// Abrir modal de confirmación
function openConfirmAlumnoModal(enteredName, examId, inputEl, onConfirmed = null) {
  const clean = quitarTildes((enteredName || '').trim().toUpperCase());
  if (!clean || clean === 'PENDIENTE' || clean.length < 3) {
    if (typeof onConfirmed === 'function') onConfirmed();
    return;
  }

  // Si ya está en la lista oficial o ya fue confirmado en esta sesión, no preguntar
  const isOfficial = listaAlumnosMemoria.some(a => quitarTildes(a.trim().toUpperCase()) === clean);
  if (isOfficial || confirmedNewStudents.has(clean)) {
    if (typeof onConfirmed === 'function') onConfirmed();
    return;
  }

  // Si el modal ya está abierto con este mismo alumno, simplemente actualizar callback si existe
  const modal = document.getElementById('modal-confirm-alumno');
  if (modal && !modal.classList.contains('hidden') && confirmAlumnoContext && confirmAlumnoContext.enteredName === clean) {
    if (onConfirmed) confirmAlumnoContext.onConfirmed = onConfirmed;
    return;
  }

  const suggested = findSimilarStudent(clean, listaAlumnosMemoria);

  confirmAlumnoContext = {
    enteredName: clean,
    suggestedName: suggested,
    examId: examId,
    inputEl: inputEl,
    onConfirmed: onConfirmed
  };

  const enteredEl = document.getElementById('confirm-alumno-entered');
  const sugBox = document.getElementById('confirm-alumno-suggestion-box');
  const sugNameEl = document.getElementById('confirm-alumno-suggested-name');
  const btnSug = document.getElementById('btn-confirm-use-suggestion');
  const msgEl = document.getElementById('confirm-alumno-msg');

  if (enteredEl) enteredEl.textContent = clean;

  if (suggested) {
    if (sugBox) sugBox.classList.remove('hidden');
    if (sugNameEl) sugNameEl.textContent = suggested;
    if (btnSug) {
      btnSug.classList.remove('hidden');
      btnSug.innerHTML = `<span>✓ Corregir y usar sugerencia: <strong>${suggested}</strong></span>`;
    }
    if (msgEl) {
      msgEl.innerHTML = `¿Te has equivocado en alguna letra o falta algún apellido? Puedes corregirlo directamente con la sugerencia, o agregarlo como un nuevo alumno oficial.`;
    }
  } else {
    if (sugBox) sugBox.classList.add('hidden');
    if (btnSug) btnSug.classList.add('hidden');
    if (msgEl) {
      msgEl.textContent = `Este alumno no figura en la lista oficial. ¿Deseas agregarlo permanentemente a la lista para futuros autocompletados?`;
    }
  }

  if (modal) modal.classList.remove('hidden');
}

// Cerrar modal de confirmación
function closeConfirmAlumnoModal(cancel = false) {
  const modal = document.getElementById('modal-confirm-alumno');
  if (modal) modal.classList.add('hidden');
  if (cancel && confirmAlumnoContext && confirmAlumnoContext.inputEl) {
    confirmAlumnoContext.inputEl.focus();
  }
  confirmAlumnoContext = null;
}

// Aplicar alumno seleccionado a la tarjeta
function applyStudentSelection(examId, inputEl, studentName) {
  const cleanName = quitarTildes(studentName.trim().toUpperCase());
  if (inputEl) {
    inputEl.value = cleanName;
  }
  const item = examenes.find(x => x.id === examId);
  if (item) {
    item.alumno = cleanName;
    const newName = buildFinalName(item);
    item.nombre_final = newName;
    const previewEl = document.getElementById(`preview-${examId}`);
    if (previewEl) previewEl.textContent = newName;
    saveItemEdit(item);
  }
}

// Agregar permanentemente un nuevo alumno a la lista oficial (backend)
async function agregarNuevoAlumnoOficial(nombre) {
  const clean = quitarTildes((nombre || '').trim().toUpperCase());
  if (!clean || clean.length < 3) return;

  try {
    const res = await fetch('/api/alumnos/agregar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: clean })
    });
    const data = await res.json();
    if (data.status === 'ok' && Array.isArray(data.alumnos)) {
      listaAlumnosMemoria = data.alumnos;
      updateAlumnosUI(data.alumnos);
    }
  } catch (err) {
    console.error('Error agregando alumno oficial:', err);
    alert('No se pudo guardar el nuevo alumno en el servidor: ' + err.message);
  }
}

// Handlers de los botones del modal de confirmación
async function handleConfirmUseSuggestion() {
  if (!confirmAlumnoContext || !confirmAlumnoContext.suggestedName) return;
  const chosen = confirmAlumnoContext.suggestedName;
  const examId = confirmAlumnoContext.examId;
  const inputEl = confirmAlumnoContext.inputEl;
  const callback = confirmAlumnoContext.onConfirmed;

  applyStudentSelection(examId, inputEl, chosen);
  closeConfirmAlumnoModal(false);

  if (typeof callback === 'function') {
    callback();
  }
}

async function handleConfirmAddNew() {
  if (!confirmAlumnoContext) return;
  const newName = confirmAlumnoContext.enteredName;
  const examId = confirmAlumnoContext.examId;
  const inputEl = confirmAlumnoContext.inputEl;
  const callback = confirmAlumnoContext.onConfirmed;

  await agregarNuevoAlumnoOficial(newName);
  confirmedNewStudents.add(newName);

  applyStudentSelection(examId, inputEl, newName);
  closeConfirmAlumnoModal(false);

  if (typeof callback === 'function') {
    callback();
  }
}

function handleConfirmKeepOnly() {
  if (!confirmAlumnoContext) return;
  const name = confirmAlumnoContext.enteredName;
  const examId = confirmAlumnoContext.examId;
  const inputEl = confirmAlumnoContext.inputEl;
  const callback = confirmAlumnoContext.onConfirmed;

  confirmedNewStudents.add(name);
  applyStudentSelection(examId, inputEl, name);
  closeConfirmAlumnoModal(false);

  if (typeof callback === 'function') {
    callback();
  }
}

// Modal y Catálogo de Cursos y Asignaturas
let catalogoContext = {
  tab: 'cursos',
  targetSelect: null,
  targetItem: null
};

function openCatalogoModal(tab = 'cursos', targetSelect = null, targetItem = null) {
  catalogoContext = { tab, targetSelect, targetItem };
  const modal = document.getElementById('modal-catalogo-container');
  if (modal) modal.classList.remove('hidden');
  switchCatalogoTab(tab);
  renderCatalogoList();
}

function closeCatalogoModal() {
  const modal = document.getElementById('modal-catalogo-container');
  if (modal) modal.classList.add('hidden');
  catalogoContext = { tab: 'cursos', targetSelect: null, targetItem: null };
}

function switchCatalogoTab(tab) {
  catalogoContext.tab = tab;
  const btnCursos = document.getElementById('tab-btn-cursos');
  const btnAsigs = document.getElementById('tab-btn-asigs');
  const panelCursos = document.getElementById('panel-catalogo-cursos');
  const panelAsigs = document.getElementById('panel-catalogo-asigs');

  if (tab === 'cursos') {
    if (btnCursos) {
      btnCursos.style.borderBottom = '2px solid var(--primary)';
      btnCursos.style.color = 'var(--primary)';
      btnCursos.style.fontWeight = '700';
    }
    if (btnAsigs) {
      btnAsigs.style.borderBottom = 'none';
      btnAsigs.style.color = 'var(--text-muted)';
      btnAsigs.style.fontWeight = '600';
    }
    if (panelCursos) panelCursos.classList.remove('hidden');
    if (panelAsigs) panelAsigs.classList.add('hidden');
    setTimeout(() => {
      const inp = document.getElementById('input-nuevo-curso-sigla');
      if (inp) inp.focus();
    }, 100);
  } else {
    if (btnAsigs) {
      btnAsigs.style.borderBottom = '2px solid var(--primary)';
      btnAsigs.style.color = 'var(--primary)';
      btnAsigs.style.fontWeight = '700';
    }
    if (btnCursos) {
      btnCursos.style.borderBottom = 'none';
      btnCursos.style.color = 'var(--text-muted)';
      btnCursos.style.fontWeight = '600';
    }
    if (panelAsigs) panelAsigs.classList.remove('hidden');
    if (panelCursos) panelCursos.classList.add('hidden');
    setTimeout(() => {
      const inp = document.getElementById('input-nueva-asig-sigla');
      if (inp) inp.focus();
    }, 100);
  }
}

function renderCatalogoList() {
  const countCursos = document.getElementById('count-catalogo-cursos');
  const countAsigs = document.getElementById('count-catalogo-asigs');
  if (countCursos) countCursos.textContent = listaCursosMemoria.length;
  if (countAsigs) countAsigs.textContent = listaAsignaturasMemoria.length;

  const listCursos = document.getElementById('lista-catalogo-cursos');
  if (listCursos) {
    listCursos.innerHTML = listaCursosMemoria.map(c => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.45rem 0.75rem; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <span style="font-weight: 700; color: var(--primary); font-size: 0.85rem; min-width: 60px;">${c.sigla}</span>
          <span style="font-size: 0.82rem; color: var(--text-main);">${c.nombre || ''}</span>
        </div>
      </div>
    `).join('');
  }

  const listAsigs = document.getElementById('lista-catalogo-asigs');
  if (listAsigs) {
    listAsigs.innerHTML = listaAsignaturasMemoria.map(a => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.45rem 0.75rem; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <span style="font-weight: 700; color: var(--primary); font-size: 0.85rem; min-width: 60px;">${a.sigla}</span>
          ${a.codigo ? `<span style="font-size: 0.75rem; background: rgba(14,165,233,0.15); color: #38bdf8; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 600;">${a.codigo}</span>` : ''}
          <span style="font-size: 0.82rem; color: var(--text-main);">${a.nombre || ''}</span>
        </div>
      </div>
    `).join('');
  }
}

async function guardarNuevoCurso() {
  const inputSigla = document.getElementById('input-nuevo-curso-sigla');
  const inputNombre = document.getElementById('input-nuevo-curso-nombre');
  if (!inputSigla) return;

  const sigla = quitarTildes(inputSigla.value.trim().toUpperCase());
  const nombre = inputNombre ? inputNombre.value.trim() : '';

  if (!sigla) {
    alert('Por favor introduce la sigla del curso (ej: MCC, IFR, PPL)');
    return;
  }

  try {
    const res = await fetch('/api/cursos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sigla, nombre })
    });
    const data = await res.json();
    if (data.status === 'ok') {
      await loadCursos();
      updateCursoFilterOptions();
      renderCatalogoList();
      inputSigla.value = '';
      if (inputNombre) inputNombre.value = '';

      // Si se abrió desde un escaneo en el modal de subida:
      if (catalogoContext.targetItem && String(catalogoContext.targetItem.id).startsWith('scan_')) {
        catalogoContext.targetItem.curso = sigla;
      } else if (catalogoContext.targetItem) {
        // Se abrió desde una tarjeta individual de examen
        catalogoContext.targetItem.curso = sigla;
        catalogoContext.targetItem.nombre_final = buildFinalName(catalogoContext.targetItem);
        saveItemEdit(catalogoContext.targetItem);
      }

      // SIEMPRE re-renderizar todas las tarjetas de examen de la pantalla principal
      renderExams();
      if (selectedScanFiles.length > 0) {
        renderSelectedUploadFiles();
      }

      closeCatalogoModal();
    } else {
      alert('Error guardando curso: ' + (data.error || 'Desconocido'));
    }
  } catch (err) {
    alert('Error de conexión: ' + err.message);
  }
}

async function guardarNuevaAsignatura() {
  const inputSigla = document.getElementById('input-nueva-asig-sigla');
  const inputCod = document.getElementById('input-nueva-asig-cod');
  const inputNombre = document.getElementById('input-nueva-asig-nombre');
  if (!inputSigla) return;

  const sigla = quitarTildes(inputSigla.value.trim().toUpperCase());
  const codigo = inputCod ? inputCod.value.trim() : '';
  const nombre = inputNombre ? inputNombre.value.trim() : '';

  if (!sigla) {
    alert('Por favor introduce la sigla de la asignatura (ej: DA42, CRM, RVSM)');
    return;
  }

  try {
    const res = await fetch('/api/asignaturas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sigla, codigo, nombre })
    });
    const data = await res.json();
    if (data.status === 'ok') {
      await loadAsignaturas();
      updateAsignaturaFilterOptions();
      renderCatalogoList();
      inputSigla.value = '';
      if (inputCod) inputCod.value = '';
      if (inputNombre) inputNombre.value = '';

      // Si se abrió desde un escaneo en el modal de subida:
      if (catalogoContext.targetItem && String(catalogoContext.targetItem.id).startsWith('scan_')) {
        catalogoContext.targetItem.asignatura = sigla;
        catalogoContext.targetItem.codigo_easa = codigo || '';
      } else if (catalogoContext.targetItem) {
        // Se abrió desde una tarjeta individual de examen
        catalogoContext.targetItem.asignatura = sigla;
        catalogoContext.targetItem.codigo_easa = codigo || '';
        catalogoContext.targetItem.nombre_final = buildFinalName(catalogoContext.targetItem);
        saveItemEdit(catalogoContext.targetItem);
      }

      // SIEMPRE re-renderizar todas las tarjetas de examen de la pantalla principal
      renderExams();
      if (selectedScanFiles.length > 0) {
        renderSelectedUploadFiles();
      }

      closeCatalogoModal();
    } else {
      alert('Error guardando asignatura: ' + (data.error || 'Desconocido'));
    }
  } catch (err) {
    alert('Error de conexión: ' + err.message);
  }
}

// Cargar exámenes desde el servidor
async function loadExamenes() {
  try {
    await loadAlumnos();
    await loadAsignaturas();
    await loadCursos();
    updateAsignaturaFilterOptions();
    updateCursoFilterOptions();
    examenes = await loadStateItems('/api/examenes', 'exam-state-notice');
    updateStats();
    updateSesionFilterOptions();
    updateFechaFilterOptions();
    renderExams();
  } catch (err) {
    console.error('Error cargando exámenes:', err);
  }
}

// Opciones dinámicas para el filtro de sesiones
function updateSesionFilterOptions() {
  if (!selectFilterSesion) return;
  const currentVal = activeSessionFilter;
  const sesiones = [...new Set(examenes.map(e => String(e.sesion || '1')).filter(Boolean))]
    .sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));

  selectFilterSesion.innerHTML = `
    <option value="all">Sesión: Todas</option>
    ${sesiones.map(s => `<option value="${s}" ${currentVal === s ? 'selected' : ''}>Sesión ${s}</option>`).join('')}
  `;

  if (currentVal !== 'all' && sesiones.includes(currentVal)) {
    selectFilterSesion.value = currentVal;
    selectFilterSesion.classList.add('active-filter');
  } else {
    selectFilterSesion.classList.remove('active-filter');
  }

  const btnDelSesion = document.getElementById('btn-delete-sesion');
  if (btnDelSesion) {
    if (activeSessionFilter !== 'all') {
      btnDelSesion.style.display = 'inline-flex';
      btnDelSesion.textContent = `🗑️ Borrar Sesión ${activeSessionFilter}`;
    } else {
      btnDelSesion.style.display = 'none';
    }
  }
}

// Opciones dinámicas para el filtro de fechas disponibles
function updateFechaFilterOptions() {
  if (!selectFilterFecha) return;
  const currentVal = activeDayFilter;
  // Obtener fechas únicas disponibles en los exámenes cargados
  const fechas = [...new Set(examenes.map(e => e.fecha || (e.id ? e.id.split('_')[0] : '')).filter(Boolean))].sort();

  selectFilterFecha.innerHTML = `
    <option value="all">Fecha: Todas</option>
    ${fechas.map(f => `<option value="${f}" ${currentVal === f ? 'selected' : ''}>Fecha: ${f}</option>`).join('')}
  `;

  if (currentVal !== 'all' && fechas.includes(currentVal)) {
    selectFilterFecha.value = currentVal;
    selectFilterFecha.classList.add('active-filter');
  } else {
    selectFilterFecha.classList.remove('active-filter');
  }
}

// Opciones dinámicas para el filtro de asignaturas
function updateAsignaturaFilterOptions() {
  if (!selectFilterAsig) return;
  const currentVal = activeAsigFilter;
  selectFilterAsig.innerHTML = `
    <option value="all">Asignatura: Todas</option>
    ${listaAsignaturasMemoria.map(as => `
      <option value="${as.sigla}" ${currentVal === as.sigla ? 'selected' : ''}>
        ${as.sigla}${as.codigo ? ' - ' + as.codigo : (as.nombre ? ' (' + as.nombre + ')' : '')}
      </option>
    `).join('')}
  `;

  if (currentVal !== 'all') {
    selectFilterAsig.classList.add('active-filter');
  } else {
    selectFilterAsig.classList.remove('active-filter');
  }
}

// Calcular nombre de archivo en tiempo real (siempre en mayúsculas y sin tildes)
function buildFinalName(item) {
  const fecha = item.fecha || '260907';
  const alumno = quitarTildes((item.alumno || 'PENDIENTE').trim().toUpperCase());
  const tipo = item.tipo || 'Examen interno';
  const curso = (item.curso || 'ATPL').trim().toUpperCase();
  const asig = (item.asignatura || 'ASIG').trim().toUpperCase();
  const cod = (item.codigo_easa || '').trim();
  const rawNum = String(item.numero_examen !== undefined && item.numero_examen !== null ? item.numero_examen : '').trim().replace(/^EX/i, '');
  const numEx = rawNum ? `EX${rawNum}` : 'EX_PENDIENTE';
  
  if (curso === asig) {
    if (cod && cod !== '000') {
      return quitarTildes(`${fecha}.${alumno}.${tipo}.${curso}.${cod}.${numEx}.pdf`);
    } else {
      return quitarTildes(`${fecha}.${alumno}.${tipo}.${curso}.${numEx}.pdf`);
    }
  } else {
    if (cod && cod !== '000' && asig !== 'MEP' && asig !== 'CESSNA' && asig !== 'DA40' && asig !== 'DA42' && asig !== 'FI') {
      return quitarTildes(`${fecha}.${alumno}.${tipo}.${curso}.${asig}.${cod}.${numEx}.pdf`);
    } else {
      return quitarTildes(`${fecha}.${alumno}.${tipo}.${curso}.${asig}.${numEx}.pdf`);
    }
  }
}

// Actualizar contadores
function updateStats() {
  const total = examenes.length;
  const done = examenes.filter(e => e.estado === 'renombrado').length;
  const pending = total - done;

  statTotalEl.textContent = total;
  statPendingEl.textContent = pending;
  statDoneEl.textContent = done;
}

// Renderizado de la lista
function renderExams() {
  const filtered = examenes.filter(item => {
    // Filtro por Sesión consecutiva
    if (activeSessionFilter !== 'all') {
      const itemSesion = String(item.sesion || '1');
      if (itemSesion !== String(activeSessionFilter)) {
        return false;
      }
    }
    // Filtro dinámico de fecha
    if (activeDayFilter !== 'all') {
      const itemFecha = item.fecha || (item.id ? item.id.split('_')[0] : '');
      if (itemFecha !== activeDayFilter) {
        return false;
      }
    }
    // Filtro de estado inteligente
    if (activeStatusFilter === 'pendiente' || activeStatusFilter === 'pending') {
      if (item.estado === 'renombrado') return false;
    } else if (activeStatusFilter === 'renombrado') {
      if (item.estado !== 'renombrado') return false;
    } else if (activeStatusFilter !== 'all' && item.estado !== activeStatusFilter) {
      return false;
    }
    // Filtro de curso
    if (activeCursoFilter !== 'all') {
      const itemCurso = (item.curso || 'ATPL').toUpperCase();
      if (itemCurso !== activeCursoFilter.toUpperCase()) {
        return false;
      }
    }
    // Filtro de asignatura
    if (activeAsigFilter !== 'all' && item.asignatura !== activeAsigFilter) {
      return false;
    }
    // Filtro de número de examen
    if (activeNumExFilter !== 'all') {
      const rawNum = String(item.numero_examen || '').trim().replace(/^EX/i, '');
      const target = activeNumExFilter.replace(/^EX/i, '');
      const matchFinal = item.nombre_final && item.nombre_final.includes(`.EX${target}.`);
      if (rawNum !== target && !matchFinal) return false;
    }
    // Búsqueda
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const qNum = q.replace(/^ex/i, '');
      const rawNum = String(item.numero_examen || '').toLowerCase().replace(/^ex/i, '');
      const matchId = item.id.toLowerCase().includes(q);
      const matchAlumno = (item.alumno || '').toLowerCase().includes(q);
      const matchAsig = (item.asignatura || '').toLowerCase().includes(q);
      const matchCurso = (item.curso || '').toLowerCase().includes(q);
      const matchNum = qNum.length > 0 && rawNum === qNum;
      const matchFinal = (item.nombre_final || '').toLowerCase().includes(q);
      if (!matchId && !matchAlumno && !matchAsig && !matchCurso && !matchNum && !matchFinal) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    examListEl.innerHTML = `
      <div style="text-align:center; padding: 3rem; color: var(--text-dim);">
        <p style="font-size: 1.1rem;">No hay exámenes que coincidan con los filtros seleccionados.</p>
      </div>
    `;
    return;
  }

  examListEl.innerHTML = filtered.map(item => {
    const finalName = item.nombre_final || buildFinalName(item);
    const thumbUrl = `/api/thumbnail/${encodeURIComponent(item.id)}`;
    const pdfUrl = `/api/pdf/${encodeURIComponent(item.id)}`;

    let badgeClass = 'badge-pendiente';
    let badgeText = 'Pendiente';
    if (item.estado === 'analizado') {
      badgeClass = 'badge-analizado';
      badgeText = 'Analizado (Listo)';
    } else if (item.estado === 'renombrado') {
      badgeClass = 'badge-renombrado';
      badgeText = 'Renombrado ✓';
    }

    return `
      <article class="exam-card status-${item.estado}" data-id="${item.id}">
        <!-- Lado izquierdo: Visualización cabecera y enlaces -->
        <div class="card-left">
          <div class="thumbnail-wrapper" onclick="openZoomModal('${thumbUrl}', '${item.id}')" title="Clic para ampliar">
            <img src="${thumbUrl}" alt="Cabecera ${item.id}" loading="lazy">
            <span class="zoom-hint">🔍 Ampliar</span>
          </div>
          <div class="card-left-actions">
            <span class="badge-status badge-sesion">
              📁 Sesión ${item.sesion || '1'}
            </span>
            <span class="badge-status badge-curso">
              🎓 ${item.curso || 'ATPL'}
            </span>
            ${item.total_paginas && item.total_paginas > 1 ? `
              <span class="badge-status" style="background: rgba(14, 165, 233, 0.15); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.3); font-weight: 600;">
                📑 ${item.total_paginas} págs
              </span>
            ` : ''}
            <span class="badge-status ${badgeClass}">${badgeText}</span>
            <a href="${pdfUrl}" target="_blank" class="btn btn-outline btn-sm" title="Abrir examen completo en nueva pestaña">
              📄 Ver PDF
            </a>
          </div>
        </div>

        <!-- Lado derecho: Campos editables por separado -->
        <div class="card-right">
          <div class="fields-grid">
            <div class="field-item">
              <label>Fecha</label>
              <input type="text" class="input-field" data-field="fecha" value="${item.fecha || ''}" placeholder="260907">
            </div>

            <div class="field-item">
              <label>Alumno</label>
              <input type="text" class="input-field field-alumno" data-field="alumno" value="${item.alumno || ''}" placeholder="Nombre y Apellidos" list="lista-alumnos" autocomplete="off">
            </div>

            <div class="field-item">
              <label>Curso</label>
              <select class="input-field select-curso" data-field="curso" data-id="${item.id}" style="font-weight: 600;">
                ${listaCursosMemoria.map(cu => `
                  <option value="${cu.sigla}" ${(item.curso || 'ATPL') === cu.sigla ? 'selected' : ''}>
                    ${cu.sigla}
                  </option>
                `).join('')}
                ${item.curso && !listaCursosMemoria.some(c => c.sigla === item.curso) ? `<option value="${item.curso}" selected>${item.curso}</option>` : ''}
                <option value="__add_new_curso__">➕ Añadir nuevo curso...</option>
              </select>
            </div>

            <div class="field-item" style="grid-column: span 1;">
              <label>Asignatura</label>
              <select class="input-field select-asig" data-field="asignatura" data-id="${item.id}" style="font-weight: 600;">
                <option value="">-- Seleccionar --</option>
                ${listaAsignaturasMemoria.map(as => `
                  <option value="${as.sigla}" data-cod="${as.codigo}" ${item.asignatura === as.sigla ? 'selected' : ''}>
                    ${as.sigla}${as.codigo ? ' - ' + as.codigo : (as.nombre ? ' (' + as.nombre + ')' : '')}
                  </option>
                `).join('')}
                ${item.asignatura && !listaAsignaturasMemoria.some(a => a.sigla === item.asignatura) ? `<option value="${item.asignatura}" selected>${item.asignatura}</option>` : ''}
                <option value="__add_new_asig__">➕ Añadir nueva asignatura...</option>
              </select>
            </div>

            <div class="field-item">
              <label>Nº Examen</label>
              <input type="text" class="input-field" data-field="numero_examen" value="${item.numero_examen || ''}" placeholder="Ej: 7, 9, 11">
            </div>
          </div>

          <!-- Previsualización en vivo del nombre -->
          <div class="preview-row">
            <div>
              <span style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase; font-weight: 600; display: block;">Nombre resultante:</span>
              <span class="preview-name" id="preview-${item.id}">${finalName}</span>
              <small role="status" id="exam-save-${item.id}" style="display: block;">${examAutosave.status(item.id)}</small>
            </div>
            <div class="card-actions-row">
              <button class="btn btn-outline btn-sm btn-analyze" onclick="analyzeSingle('${item.id}', this)" ${item.estado === 'renombrado' ? 'disabled' : ''}>
                ✨ Analizar IA
              </button>
              <button class="btn btn-success btn-sm btn-rename" onclick="renameSingle('${item.id}', this)">
                💾 Renombrar
              </button>
              <button class="btn btn-outline btn-sm" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.35); padding: 0.35rem 0.6rem;" onclick="deleteSingleExam('${item.id}', this)" title="Eliminar este examen y sus archivos">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Vincular eventos input, change y keydown (Enter para renombrar y avanzar)
  document.querySelectorAll('.input-field').forEach(inp => {
    inp.addEventListener('input', handleFieldChange);
    if (inp.tagName === 'SELECT') {
      inp.addEventListener('change', handleFieldChange);
    }
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const card = e.target.closest('.exam-card');
        const renameBtn = card ? card.querySelector('.btn-rename') : null;
        if (renameBtn) renameBtn.click();
      }
    });
  });

  // Validar y detectar erratas/nuevos alumnos al cambiar el campo Alumno
  document.querySelectorAll('.field-alumno').forEach(inp => {
    inp.addEventListener('change', (e) => {
      const card = e.target.closest('.exam-card');
      const id = card ? card.dataset.id : null;
      const val = (e.target.value || '').trim();
      if (val && val.toUpperCase() !== 'PENDIENTE' && val.length >= 3) {
        const clean = quitarTildes(val.toUpperCase());
        const isOfficial = listaAlumnosMemoria.some(a => quitarTildes(a.trim().toUpperCase()) === clean);
        if (!isOfficial && !confirmedNewStudents.has(clean)) {
          openConfirmAlumnoModal(clean, id, e.target);
        }
      }
    });
  });
}

// Manejar cambios en cualquier input/select en tiempo real
function handleFieldChange(e) {
  const card = e.target.closest('.exam-card');
  const id = card.dataset.id;
  const field = e.target.dataset.field;
  const value = e.target.value;

  const item = examenes.find(x => x.id === id);
  if (!item) return;

  if (field === 'curso' && value === '__add_new_curso__') {
    e.target.value = item.curso || 'ATPL';
    openCatalogoModal('cursos', e.target, item);
    return;
  }

  if (field === 'asignatura' && value === '__add_new_asig__') {
    e.target.value = item.asignatura || '';
    openCatalogoModal('asigs', e.target, item);
    return;
  }

  if (field === 'alumno') {
    const cleanVal = quitarTildes(value.toUpperCase());
    item.alumno = cleanVal;
    if (e.target.value !== cleanVal) {
      e.target.value = cleanVal;
    }
  } else if (field === 'asignatura') {
    item.asignatura = value;
    const selectedOpt = e.target.selectedOptions ? e.target.selectedOptions[0] : null;
    const cod = selectedOpt ? selectedOpt.dataset.cod : '';
    item.codigo_easa = cod || '';
    const codInput = document.getElementById(`cod-${id}`);
    if (codInput) codInput.value = item.codigo_easa;
  } else {
    item[field] = value;
  }

  const newName = buildFinalName(item);
  item.nombre_final = newName;

  const previewEl = document.getElementById(`preview-${id}`);
  if (previewEl) {
    previewEl.textContent = newName;
  }

  // Guardar en backend (debounced)
  saveItemEdit(item);
}

// Guardar edición en backend
const examAutosave = createItemAutosave({
  async save(item) {
    const response = await fetch('/api/guardar_edicion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item }),
    });
    const result = await response.json();
    if (!response.ok || result.status !== 'ok') {
      throw new Error(result.error || 'No se pudo guardar el examen.');
    }
    return result;
  },
  onStatus(id, status) {
    const element = document.getElementById(`exam-save-${id}`);
    if (element) element.textContent = status;
  },
});

function saveItemEdit(item) {
  examAutosave.schedule(item);
}

// Analizar un examen individual con Gemini
async function analyzeSingle(id, btn) {
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Analizando...';
  }

  try {
    const res = await fetch('/api/analizar_uno', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const updated = await res.json();
    if (updated && !updated.error) {
      const idx = examenes.findIndex(x => x.id === id);
      if (idx !== -1) {
        examenes[idx] = updated;
      }
      updateStats();
      renderExams();
    } else {
      alert('Error al analizar: ' + (updated.error || 'Desconocido'));
    }
  } catch (err) {
    alert('Fallo de conexión al analizar: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '✨ Analizar IA';
    }
  }
}

// Renombrar un examen individual en disco con validación obligatoria
async function renameSingle(id, btn) {
  const item = examenes.find(x => x.id === id);
  if (!item) return;

  // 1. Validar campos obligatorios
  const faltan = [];
  const alumnoVal = (item.alumno || '').trim();
  if (!alumnoVal || alumnoVal.toUpperCase() === 'PENDIENTE' || alumnoVal.length < 3) {
    faltan.push('Nombre del Alumno');
  }

  const asigVal = (item.asignatura || '').trim();
  if (!asigVal) {
    faltan.push('Asignatura');
  }

  const numVal = String(item.numero_examen || '').trim();
  if (!numVal) {
    faltan.push('Número de Examen');
  }

  if (faltan.length > 0) {
    alert(`⚠️ ATENCIÓN - Faltan campos obligatorios para renombrar:\n\n• ${faltan.join('\n• ')}\n\nPor favor, completa estos datos antes de continuar.`);
    
    // Enfocar automáticamente el primer campo faltante
    const card = document.querySelector(`.exam-card[data-id="${id}"]`);
    if (card) {
      if (faltan.includes('Nombre del Alumno')) {
        const el = card.querySelector('.field-alumno');
        if (el) el.focus();
      } else if (faltan.includes('Asignatura')) {
        const el = card.querySelector('.select-asig');
        if (el) el.focus();
      } else if (faltan.includes('Número de Examen')) {
        const el = card.querySelector('[data-field="numero_examen"]');
        if (el) el.focus();
      }
    }
    return;
  }

  // 2. Verificar si el alumno es oficial o si requiere confirmación (errata / nuevo alumno)
  const cleanAlumno = quitarTildes((item.alumno || '').trim().toUpperCase());
  const isOfficial = listaAlumnosMemoria.some(a => quitarTildes(a.trim().toUpperCase()) === cleanAlumno);
  if (!isOfficial && !confirmedNewStudents.has(cleanAlumno)) {
    const card = document.querySelector(`.exam-card[data-id="${id}"]`);
    const inputEl = card ? card.querySelector('.field-alumno') : null;
    openConfirmAlumnoModal(cleanAlumno, id, inputEl, () => {
      // Continuar renombrando automáticamente tras la confirmación
      renameSingle(id, btn);
    });
    return;
  }

  // Generar nombre final verificado (siempre en mayúsculas y sin tildes)
  item.alumno = cleanAlumno;
  item.nombre_final = buildFinalName(item);

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Guardando...';
  }

  try {
    await examAutosave.flush(id);
    const res = await fetch('/api/renombrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [item] })
    });
    const result = await res.json();
    if (res.ok && result.status === 'ok' && result.renombrados?.some(entry => entry.id === id)) {
      item.estado = 'renombrado';
      updateStats();
      renderExams();
      if (result.errores?.length) alert(result.errores.map(entry => entry.error).join('\n'));

      // Avanzar automáticamente al siguiente examen pendiente
      const nextCard = document.querySelector(`.exam-card.status-pendiente, .exam-card.status-analizado`);
      if (nextCard) {
        nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const nextAlumno = nextCard.querySelector('.field-alumno');
        if (nextAlumno) {
          setTimeout(() => nextAlumno.focus(), 150);
        }
      }
    } else {
      alert(result.errores?.map(entry => entry.error).join('\n') || result.error || 'No se pudo renombrar el archivo.');
    }
  } catch (err) {
    alert('Error al renombrar: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '💾 Renombrar';
    }
  }
}

// Procesar lote de 5 exámenes siguientes
async function batchAnalyzeNext(count = 5) {
  const pending = examenes.filter(e => e.estado === 'pendiente').slice(0, count);
  if (pending.length === 0) {
    alert('No hay más exámenes pendientes por analizar.');
    return;
  }

  isBatchRunning = true;
  progressContainer.classList.remove('hidden');
  progressBar.style.width = '0%';

  for (let i = 0; i < pending.length; i++) {
    if (!isBatchRunning) break;
    const item = pending[i];
    progressText.textContent = `Analizando (${i + 1}/${pending.length}): ${item.id}`;
    progressBar.style.width = `${((i + 1) / pending.length) * 100}%`;

    try {
      const res = await fetch('/api/analizar_uno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id })
      });
      const updated = await res.json();
      if (updated && !updated.error) {
        const idx = examenes.findIndex(x => x.id === item.id);
        if (idx !== -1) examenes[idx] = updated;
        updateStats();
        renderExams();
      }
    } catch (e) {
      console.error('Error en lote para ' + item.id, e);
    }
  }

  isBatchRunning = false;
  progressContainer.classList.add('hidden');
}

function isExamReadyToRename(item) {
  const alumno = (item.alumno || '').trim();
  return item.estado !== 'renombrado'
    && alumno.length >= 3
    && alumno.toUpperCase() !== 'PENDIENTE'
    && Boolean((item.fecha || '').trim())
    && Boolean((item.asignatura || '').trim())
    && Boolean(String(item.numero_examen ?? '').trim());
}

let isBatchRenaming = false;

// El flujo manual no requiere haber ejecutado el análisis por IA.
async function batchRenameAnalyzed() {
  if (isBatchRenaming) return;
  const ready = examenes.filter(isExamReadyToRename);
  if (ready.length === 0) {
    alert('No hay exámenes listos para renombrar. Completa fecha, alumno, asignatura y número de examen.');
    return;
  }

  const unconfirmed = typeof openConfirmAlumnoModal === 'function' && ready.find(item => {
    const alumno = quitarTildes(item.alumno.trim().toUpperCase());
    return !listaAlumnosMemoria.some(name => quitarTildes(name.trim().toUpperCase()) === alumno)
      && (typeof confirmedNewStudents === 'undefined' || !confirmedNewStudents.has(alumno));
  });
  if (unconfirmed) {
    openConfirmAlumnoModal(
      quitarTildes(unconfirmed.alumno.trim().toUpperCase()),
      unconfirmed.id,
      null,
      () => batchRenameAnalyzed()
    );
    return;
  }

  if (!confirm(`¿Deseas aplicar el renombrado a los ${ready.length} exámenes verificados?`)) {
    return;
  }

  isBatchRenaming = true;
  if (btnBatchRename) btnBatchRename.disabled = true;
  ready.forEach(item => {
    item.alumno = quitarTildes(item.alumno.trim().toUpperCase());
    item.nombre_final = buildFinalName(item);
  });

  try {
    await Promise.all(ready.map(item => examAutosave.flush(item.id)));
    const res = await fetch('/api/renombrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: ready })
    });
    const data = await res.json();
    if (!res.ok || data.status !== 'ok' || !Array.isArray(data.renombrados)) {
      throw new Error(data.error || 'El servidor no confirmó el renombrado.');
    }
    const renamedIds = new Set(data.renombrados.map(item => item.id));
    const renamed = ready.filter(item => renamedIds.has(item.id));
    renamed.forEach(item => {
      item.estado = 'renombrado';
      const serverRenamed = data.renombrados.find(r => r.id === item.id);
      if (serverRenamed && serverRenamed.archivo_en_disco) {
        item.archivo_en_disco = serverRenamed.archivo_en_disco;
      }
    });
    updateStats();
    renderExams();
    const details = (data.errores || []).map(entry => `${entry.id}: ${entry.error}`).join('\n');
    alert(`Se han clasificado y renombrado ${renamed.length} de ${ready.length} exámenes en sus carpetas por alumno 'Examenes_Renombrados/[ALUMNO].EXAMENES INTERNOS/'.${details ? '\n' + details : ''}${renamed.length < ready.length ? '\nLos restantes no se han renombrado. Corrige los datos y vuelve a intentarlo.' : ''}`);
  } catch (err) {
    alert('Error al renombrar lote: ' + err.message);
  } finally {
    isBatchRenaming = false;
    if (btnBatchRename) btnBatchRename.disabled = false;
  }
}

// Eliminar completamente la sesión actualmente filtrada
async function deleteCurrentFilteredSession() {
  if (activeSessionFilter === 'all') {
    alert('Por favor selecciona una sesión específica en el desplegable para eliminarla.');
    return;
  }

  const sessionExams = examenes.filter(e => String(e.sesion || '1') === String(activeSessionFilter));
  const count = sessionExams.length;

  const conf = confirm(
    `⚠️ ATENCIÓN: ¿Estás seguro de que deseas eliminar completamente la Sesión ${activeSessionFilter}?\n\n` +
    `• Se borrarán ${count} exámenes de la lista.\n` +
    `• Se eliminarán sus archivos PDF divididos y miniaturas de disco.\n` +
    `• Si estaban renombrados, se eliminarán sus archivos de sus carpetas de alumno en Examenes_Renombrados/.\n\n` +
    `¿Deseas continuar?`
  );
  if (!conf) return;

  try {
    const res = await fetch('/api/eliminar_sesion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sesion: activeSessionFilter })
    });
    const data = await res.json();
    if (data.status === 'ok') {
      alert(`✓ Sesión ${activeSessionFilter} eliminada correctamente (${data.deleted_count} exámenes eliminados).`);
      activeSessionFilter = 'all';
      const btnDelSesion = document.getElementById('btn-delete-sesion');
      if (btnDelSesion) btnDelSesion.style.display = 'none';
      await loadExamenes();
    } else {
      alert('Error al eliminar sesión: ' + (data.error || 'Desconocido'));
    }
  } catch (err) {
    alert('Error de conexión al eliminar sesión: ' + err.message);
  }
}

// Eliminar un examen individual
async function deleteSingleExam(id, btn) {
  const conf = confirm(`¿Deseas eliminar el examen "${id}" y su archivo PDF?`);
  if (!conf) return;

  if (btn) {
    btn.disabled = true;
    btn.textContent = '...';
  }

  try {
    const res = await fetch('/api/eliminar_examen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.status === 'ok') {
      examenes = examenes.filter(e => e.id !== id);
      updateStats();
      updateSesionFilterOptions();
      updateFechaFilterOptions();
      renderExams();
    } else {
      alert('Error al eliminar examen: ' + (data.error || 'Desconocido'));
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🗑️';
      }
    }
  } catch (err) {
    alert('Error de conexión al eliminar examen: ' + err.message);
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🗑️';
    }
  }
}

// Modal de Zoom
function openZoomModal(imgUrl, title) {
  modalImg.src = imgUrl;
  modalTitle.textContent = `Cabecera: ${title}`;
  modalEl.classList.remove('hidden');
}

function closeModal() {
  modalEl.classList.add('hidden');
  modalImg.src = '';
}

// ==========================================
// ASISTENTE: CARGA Y DIVISIÓN DE ESCANEOS
// ==========================================
let selectedScanFiles = [];

// Extracción inteligente de fecha del nombre de archivo
function detectDateFromFilename(name) {
  if (!name) return '';
  const clean = name.replace(/\.pdf$/i, '');

  // 1. Caso 6 dígitos directos YYMMDD: ej. 260907
  const m6 = clean.match(/(?:^|\D)(2\d(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01]))(?:\D|$)/);
  if (m6) return m6[1];

  // 2. Caso 8 dígitos YYYYMMDD: ej. 20260907 -> 260907
  const m8 = clean.match(/(?:^|\D)20(\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:\D|$)/);
  if (m8) return `${m8[1]}${m8[2]}${m8[3]}`;

  // 3. Formato YYYY-MM-DD: ej. 2026-09-10
  const mY4 = clean.match(/20(\d{2})[-_./](0[1-9]|1[0-2])[-_./](0[1-9]|[12]\d|3[01])/);
  if (mY4) return `${mY4[1]}${mY4[2]}${mY4[3]}`;

  // 4. Formato DD-MM-YYYY: ej. 11-09-2026
  const mD4 = clean.match(/(0[1-9]|[12]\d|3[01])[-_./](0[1-9]|1[0-2])[-_./]20(\d{2})/);
  if (mD4) return `${mD4[3]}${mD4[2]}${mD4[1]}`;

  // 5. Con guiones cortos YY-MM-DD: ej. 26-09-10
  const mSep1 = clean.match(/(?:^|\D)(2\d)[-_./](0[1-9]|1[0-2])[-_./](0[1-9]|[12]\d|3[01])(?:\D|$)/);
  if (mSep1) return `${mSep1[1]}${mSep1[2]}${mSep1[3]}`;

  // 6. Con guiones cortos DD-MM-YY: ej. 10-09-26
  const mSep2 = clean.match(/(?:^|\D)(0[1-9]|[12]\d|3[01])[-_./](0[1-9]|1[0-2])[-_./](2\d)(?:\D|$)/);
  if (mSep2) return `${mSep2[3]}${mSep2[2]}${mSep2[1]}`;

  return '';
}

async function openUploadModal() {
  const modal = document.getElementById('modal-upload-container');
  const countEl = document.getElementById('upload-alumnos-count');
  if (countEl) countEl.textContent = listaAlumnosMemoria.length;

  // Obtener el número consecutivo para esta nueva sesión
  try {
    const res = await fetch('/api/proxima_sesion');
    const data = await res.json();
    currentUploadSession = String(data.proxima_sesion || '1');
  } catch (e) {
    currentUploadSession = '1';
  }

  const sessionBadge = document.getElementById('upload-session-badge');
  if (sessionBadge) sessionBadge.textContent = `Sesión #${currentUploadSession}`;
  const sessionFolder = document.getElementById('upload-session-folder');
  if (sessionFolder) sessionFolder.textContent = `Examenes_Renombrados/[ALUMNO].EXAMENES INTERNOS/`;

  if (modal) modal.classList.remove('hidden');
}

function closeUploadModal() {
  const modal = document.getElementById('modal-upload-container');
  if (modal) modal.classList.add('hidden');
  selectedScanFiles = [];
  const listEl = document.getElementById('upload-files-list');
  if (listEl) listEl.innerHTML = '';
  const sec = document.getElementById('upload-files-section');
  if (sec) sec.classList.add('hidden');
  const prog = document.getElementById('upload-progress-container');
  if (prog) prog.classList.add('hidden');
  const fileInput = document.getElementById('input-pdf-files');
  if (fileInput) fileInput.value = '';
  if (catalogoContext.targetItem && String(catalogoContext.targetItem.id).startsWith('scan_')) {
    catalogoContext = { tab: 'cursos', targetSelect: null, targetItem: null };
  }
  const btnProcess = document.getElementById('btn-start-process-upload');
  if (btnProcess) {
    btnProcess.disabled = true;
    btnProcess.innerHTML = '<span class="btn-icon">🚀</span><span>Procesar y Dividir Exámenes</span>';
  }
}

// Reglas exhaustivas de detección de materias EASA a partir del nombre del archivo escaneado
const MATERIAS_DETECTION_RULES = [
  { pattern: /(?:^|[^A-Za-z])(?:AIR\s*LAW|ALW|LEGISLACI[OÓ]N|DERECHO)(?=[^A-Za-z]|$)/i, sigla: 'ALW', codigo: '010' },
  { pattern: /(?:^|[^A-Za-z])(?:AGK|AIRCRAFT\s*GENERAL|CONOCIMIENTO\s*GENERAL)(?=[^A-Za-z]|$)/i, sigla: 'AGK', codigo: '021' },
  { pattern: /(?:^|[^A-Za-z])(?:INS(?:TRUMENTOS|TRUMENTATION)?)(?=[^A-Za-z]|$)/i, sigla: 'INS', codigo: '022' },
  { pattern: /(?:^|[^A-Za-z])(?:M\s*&\s*B|M\s*AND\s*B|MB|MASS\s*(?:&|AND)\s*BALANCE|PESO\s*Y\s*(?:BALANCE|CENTRADO))(?=[^A-Za-z]|$)/i, sigla: 'M&B', codigo: '031' },
  { pattern: /(?:^|[^A-Za-z])(?:PERF(?:ORMANCE|ORMANCES|ACTUACIONES)?)(?=[^A-Za-z]|$)/i, sigla: 'PERF', codigo: '032' },
  { pattern: /(?:^|[^A-Za-z])(?:FPM|FLIGHT\s*PLANNING|PLANIFICACI[OÓ]N)(?=[^A-Za-z]|$)/i, sigla: 'FPM', codigo: '033' },
  { pattern: /(?:^|[^A-Za-z])(?:HPL|HUMAN\s*PERFORMANCE|FACTORES\s*HUMANOS)(?=[^A-Za-z]|$)/i, sigla: 'HPL', codigo: '040' },
  { pattern: /(?:^|[^A-Za-z])(?:MET(?:EOROLOGY|EOROLOGIA|EOROLOG[IÍ]A)?)(?=[^A-Za-z]|$)/i, sigla: 'MET', codigo: '050' },
  { pattern: /(?:^|[^A-Za-z])(?:GNAV|GENERAL\s*NAVIGATION|NAVEGACI[OÓ]N\s*GENERAL)(?=[^A-Za-z]|$)/i, sigla: 'GNAV', codigo: '061' },
  { pattern: /(?:^|[^A-Za-z])(?:RNAV|RADIO\s*NAVIGATION|RADIO\s*NAVEGACI[OÓ]N|RADIONAVEGACI[OÓ]N)(?=[^A-Za-z]|$)/i, sigla: 'RNAV', codigo: '062' },
  { pattern: /(?:^|[^A-Za-z])(?:OPS|OPERATIONAL\s*PROCEDURES|PROCEDIMIENTOS)(?=[^A-Za-z]|$)/i, sigla: 'OPS', codigo: '070' },
  { pattern: /(?:^|[^A-Za-z])(?:POF|PRINCIPLES\s*OF\s*FLIGHT|PRINCIPIOS\s*DE\s*VUELO)(?=[^A-Za-z]|$)/i, sigla: 'POF', codigo: '081' },
  { pattern: /(?:^|[^A-Za-z])(?:COMM(?:UNICATIONS|UNICACIONES)?|COMUNICACI[OÓ]N)(?=[^A-Za-z]|$)/i, sigla: 'COMM', codigo: '090' },
  { pattern: /(?:^|[^A-Za-z])(?:PPL)(?=[^A-Za-z]|$)/i, sigla: 'PPL', codigo: '100' },
  { pattern: /(?:^|[^A-Za-z])(?:MEP|MULTI\s*ENGINE|MULTIMOTOR|DA[-_ ]?42)(?=[^A-Za-z]|$)/i, sigla: 'DA42', codigo: '' },
  { pattern: /(?:^|[^A-Za-z])(?:DA[-_ ]?40)(?=[^A-Za-z]|$)/i, sigla: 'DA40', codigo: '' },
  { pattern: /(?:^|[^A-Za-z])(?:CESSNA|C[-_ ]?172|C[-_ ]?152|C[-_ ]?150)(?=[^A-Za-z]|$)/i, sigla: 'CESSNA', codigo: '' }
];

// Extracción inteligente de asignatura y número de examen del nombre de archivo si existen
function detectSubjectAndExamFromFilename(name) {
  if (!name) return { asig: '', cod: '', numEx: '', isAsigAuto: false, isExamAuto: false };
  const clean = name.replace(/\.pdf$/i, '');

  // 1. Detectar número de examen: EX7, EX07, EX-7, EX_7, etc.
  let numEx = '';
  const matchEx = clean.match(/(?:^|[^A-Z0-9])EX[-_ ]?0*(\d{1,2})(?:[^A-Z0-9]|$)/i);
  if (matchEx) {
    numEx = matchEx[1];
  }

  // 2. Detectar asignatura a partir de patrones completos de aviación
  let asig = '';
  let cod = '';
  for (const rule of MATERIAS_DETECTION_RULES) {
    if (rule.pattern.test(clean)) {
      asig = rule.sigla;
      cod = rule.codigo;
      break;
    }
  }

  return {
    asig,
    cod,
    numEx,
    isAsigAuto: !!asig,
    isExamAuto: !!numEx
  };
}

function handleAddUploadFiles(files) {
  const newItems = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.name.toLowerCase().endsWith('.pdf')) continue;
    // Evitar duplicados por nombre
    if (selectedScanFiles.some(f => f.file.name === file.name)) continue;

    const detected = detectDateFromFilename(file.name);
    const extra = detectSubjectAndExamFromFilename(file.name);
    let defaultCurso = 'ATPL';
    if (extra.asig === 'DA42' || extra.asig === 'MEP') defaultCurso = 'MEP';
    else if (extra.asig === 'CESSNA') defaultCurso = 'CESSNA';
    else if (extra.asig === 'DA40') defaultCurso = 'DA40';
    else if (extra.asig === 'FI' || extra.asig === 'PPT') defaultCurso = 'FI';

    let defaultPages = 1;
    if (extra.asig === 'DA42' || extra.asig === 'MEP' || defaultCurso === 'MEP') defaultPages = 6;
    else if (extra.asig === 'CESSNA' || defaultCurso === 'CESSNA') defaultPages = 9;
    else if (defaultCurso === 'FI' || extra.asig === 'FI' || extra.asig === 'PPT') defaultPages = 7;

    const item = {
      id: 'scan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      file: file,
      fecha: detected,
      isAuto: !!detected,
      curso: defaultCurso,
      asignatura: extra.asig || '',
      codigo_easa: extra.cod || '',
      numero_examen: extra.numEx || '',
      isAsigAuto: extra.isAsigAuto,
      isExamAuto: extra.isExamAuto,
      thumbUrl: null,
      loadingThumb: false,
      paginas_por_examen: defaultPages,
      total_paginas: 0,
      total_examenes_estimados: 0,
      isPagesAuto: false
    };
    selectedScanFiles.push(item);
    newItems.push(item);
  }
  renderSelectedUploadFiles();

  // Iniciar extracción de la cabecera de la 1ª página para cada archivo
  newItems.forEach(item => loadHeaderPreviewForFile(item));
}

// Extracción asíncrona de la cabecera de la 1ª página del PDF y autodetección de páginas
async function loadHeaderPreviewForFile(item) {
  if (item.thumbUrl || item.loadingThumb) return;
  item.loadingThumb = true;
  try {
    const res = await fetch('/api/extraer_cabecera_preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
        'X-Filename': encodeURIComponent(item.file.name)
      },
      body: item.file
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.thumb) {
        item.thumbUrl = data.thumb;
        item.loadingThumb = false;
        
        if (data.total_paginas) item.total_paginas = data.total_paginas;
        if (data.paginas_en_blanco !== undefined) item.paginas_en_blanco = data.paginas_en_blanco;
        if (data.paginas_utiles !== undefined) item.paginas_utiles = data.paginas_utiles;
        if (data.paginas_por_examen) {
          item.paginas_por_examen = data.paginas_por_examen;
          item.isPagesAuto = (data.deteccion_metodo !== 'defecto');
        }
        if (data.total_examenes_estimados) item.total_examenes_estimados = data.total_examenes_estimados;
        
        if (data.curso) {
          item.curso = data.curso;
        }
        if (!item.asignatura && data.asignatura) {
          item.asignatura = data.asignatura;
          item.codigo_easa = data.codigo_easa || '';
          item.isAsigAuto = true;
        }
        if (!item.numero_examen && data.numero_examen) {
          item.numero_examen = data.numero_examen;
          item.isExamAuto = true;
        }

        renderSelectedUploadFiles();
      }
    }
  } catch (err) {
    console.error('Error cargando preview de cabecera:', err);
    item.loadingThumb = false;
  }
}

function renderSelectedUploadFiles() {
  const section = document.getElementById('upload-files-section');
  const listEl = document.getElementById('upload-files-list');
  const countEl = document.getElementById('upload-summary-count');
  const btnProcess = document.getElementById('btn-start-process-upload');

  if (!section || !listEl) return;

  if (selectedScanFiles.length === 0) {
    section.classList.add('hidden');
    if (btnProcess) btnProcess.disabled = true;
    return;
  }

  section.classList.remove('hidden');
  if (countEl) countEl.textContent = `${selectedScanFiles.length} archivo(s)`;

  listEl.innerHTML = selectedScanFiles.map(item => {
    const sizeKB = Math.round(item.file.size / 1024);
    const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
    const hasValidDate = item.fecha && item.fecha.length === 6 && /^\d+$/.test(item.fecha);

    const tagHtml = hasValidDate
      ? `<span class="date-status-tag ok">${item.isAuto ? '✓ Fecha detectada del nombre' : '✓ Fecha asignada'}</span>`
      : `<span class="date-status-tag warn">⚠️ Falta fecha (Asignar YYMMDD)</span>`;

    const escapedName = item.file.name.replace(/'/g, "\\'");
    const isCustomPages = ![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(item.paginas_por_examen);
    const utiles = (item.paginas_en_blanco && item.paginas_en_blanco > 0) 
      ? (item.paginas_utiles || (item.total_paginas - item.paginas_en_blanco)) 
      : item.total_paginas;
    const numExamenesCalc = utiles > 0 ? Math.ceil(utiles / (item.paginas_por_examen || 1)) : 0;

    return `
      <div class="upload-file-row" data-id="${item.id}">
        <!-- Fila superior: Icono, Nombre Completo del Archivo, Tamaño y Botón Eliminar -->
        <div class="upload-file-info">
          <div class="upload-file-name-wrap">
            <span class="upload-file-icon">📄</span>
            <span class="upload-file-name" title="${item.file.name}">${item.file.name}</span>
            <span class="upload-file-size">${sizeStr}</span>
          </div>
          <button class="btn-remove-file" title="Eliminar este archivo de la lista">&times;</button>
        </div>

        <!-- Vista previa recortada de la cabecera de la 1ª página -->
        <div class="upload-file-thumb-slot">
          ${item.thumbUrl 
            ? `<div class="upload-thumb-container" onclick="openZoomModal('${item.thumbUrl}', '${escapedName}')" title="🔍 Clic para ampliar cabecera de la 1ª página">
                 <img src="${item.thumbUrl}" alt="Cabecera pág 1" class="upload-thumb-img">
                 <span class="upload-thumb-zoom-hint">🔍 Clic para ampliar cabecera (Pág 1)</span>
               </div>`
            : `<div class="upload-thumb-loading">
                 <span class="spinner" style="border-top-color: var(--primary);"></span> 
                 <span>Extrayendo cabecera y detectando estructura de páginas...</span>
               </div>`
          }
        </div>

        <!-- Fila inferior: Controles organizados y claros -->
        <div class="upload-file-fields-group">
          <!-- Fecha (Obligatoria) -->
          <div class="upload-control-item">
            <label class="upload-control-label">📅 Fecha:</label>
            <div class="upload-file-date-group">
              <input type="text" class="input-date-scan ${hasValidDate ? '' : 'date-missing'}" 
                     value="${item.fecha || ''}" 
                     placeholder="YYMMDD" 
                     maxlength="6" 
                     title="Fecha en formato YYMMDD (ej: 260907)">
              ${tagHtml}
            </div>
          </div>

          <!-- Curso fijo para todo este archivo -->
          <div class="upload-control-item">
            <label class="upload-control-label">🎓 Curso:</label>
            <select class="input-field select-curso-scan" 
                    title="Curso al que pertenecen los exámenes de este archivo">
              ${listaCursosMemoria.map(cu => `
                <option value="${cu.sigla}" ${(item.curso || 'ATPL') === cu.sigla ? 'selected' : ''}>
                  ${cu.sigla}
                </option>
              `).join('')}
              ${item.curso && !listaCursosMemoria.some(c => c.sigla === item.curso) ? `<option value="${item.curso}" selected>${item.curso}</option>` : ''}
              <option value="__add_new_curso__">➕ Añadir nuevo curso...</option>
            </select>
          </div>

          <!-- Asignatura fija para todo este archivo (Opcional o detectada) -->
          <div class="upload-control-item">
            <label class="upload-control-label">📚 Asignatura:</label>
            <select class="input-field select-asig-scan ${item.asignatura ? 'asig-detected' : ''}" 
                    title="${item.isAsigAuto ? '✓ Materia detectada: ' + item.asignatura : 'Asignatura fija para todas las hojas de este archivo (Opcional)'}">
              <option value="">-- Materia (Opcional) --</option>
              ${listaAsignaturasMemoria.map(as => `
                <option value="${as.sigla}" data-cod="${as.codigo}" ${item.asignatura === as.sigla ? 'selected' : ''}>
                  ${as.sigla}${as.codigo ? ' (' + as.codigo + ')' : (as.nombre ? ' (' + as.nombre + ')' : '')}
                </option>
              `).join('')}
              ${item.asignatura && !listaAsignaturasMemoria.some(a => a.sigla === item.asignatura) ? `<option value="${item.asignatura}" selected>${item.asignatura}</option>` : ''}
              <option value="__add_new_asig__">➕ Añadir nueva asignatura...</option>
            </select>
          </div>

          <!-- Nº Examen fijo para todo este archivo (Opcional o detectado) -->
          <div class="upload-control-item">
            <label class="upload-control-label">📝 Nº Examen:</label>
            <input type="text" class="input-field input-num-scan ${item.numero_examen ? 'exam-detected' : ''}" 
                   value="${item.numero_examen || ''}" 
                   placeholder="Ej: 7" 
                   title="${item.isExamAuto ? '✓ Nº Examen detectado: EX' + item.numero_examen : 'Número de examen fijo para todas las hojas (Opcional, ej: 7, 9, 11)'}" 
                   maxlength="4">
          </div>

          <!-- Hojas por examen (Multipágina) -->
          <div class="upload-control-item upload-control-pages">
            <label class="upload-control-label">📑 Hojas por examen:</label>
            <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
              <select class="input-field select-pages-scan ${item.paginas_por_examen > 1 ? 'pages-multi' : ''}" 
                      title="Define cuántas hojas forman cada examen en este PDF">
                <option value="1" ${item.paginas_por_examen === 1 ? 'selected' : ''}>1 hoja (Estándar)</option>
                <option value="2" ${item.paginas_por_examen === 2 ? 'selected' : ''}>2 hojas</option>
                <option value="3" ${item.paginas_por_examen === 3 ? 'selected' : ''}>3 hojas</option>
                <option value="4" ${item.paginas_por_examen === 4 ? 'selected' : ''}>4 hojas</option>
                <option value="5" ${item.paginas_por_examen === 5 ? 'selected' : ''}>5 hojas</option>
                <option value="6" ${item.paginas_por_examen === 6 ? 'selected' : ''}>6 hojas (ej. MEP)</option>
                <option value="7" ${item.paginas_por_examen === 7 ? 'selected' : ''}>7 hojas (ej. FI)</option>
                <option value="8" ${item.paginas_por_examen === 8 ? 'selected' : ''}>8 hojas</option>
                <option value="9" ${item.paginas_por_examen === 9 ? 'selected' : ''}>9 hojas (ej. CESSNA)</option>
                <option value="custom" ${isCustomPages ? 'selected' : ''}>Personalizado...</option>
              </select>
              <input type="number" min="1" max="100" class="input-field input-pages-custom ${isCustomPages ? '' : 'hidden'}" 
                     value="${item.paginas_por_examen}" style="width: 70px;" placeholder="Págs">
              ${item.total_paginas > 0 ? `
                <span class="pages-detected-badge ${item.paginas_por_examen > 1 ? 'badge-multi' : ''}">
                  ${item.paginas_en_blanco && item.paginas_en_blanco > 0 
                    ? `✨ ${numExamenesCalc} exámenes (${utiles} págs útiles · ${item.paginas_en_blanco} en blanco descartadas)` 
                    : (item.paginas_por_examen > 1 
                        ? `✨ ${numExamenesCalc} exámenes (${item.total_paginas} págs)` 
                        : `${item.total_paginas} exámenes (1 pág/ex)`)}
                </span>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Event listeners en los inputs, selects y botones de eliminación
  listEl.querySelectorAll('.upload-file-row').forEach(row => {
    const rowId = row.dataset.id;
    const item = selectedScanFiles.find(x => x.id === rowId);

    const inputDate = row.querySelector('.input-date-scan');
    if (inputDate && item) {
      inputDate.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        item.fecha = val;
        item.isAuto = false;
        
        const hasValid = val.length === 6 && /^\d+$/.test(val);
        const tag = row.querySelector('.date-status-tag');
        if (hasValid) {
          inputDate.classList.remove('date-missing');
          if (tag) {
            tag.className = 'date-status-tag ok';
            tag.textContent = '✓ Fecha asignada';
          }
        } else {
          inputDate.classList.add('date-missing');
          if (tag) {
            tag.className = 'date-status-tag warn';
            tag.textContent = '⚠️ Falta fecha (Asignar YYMMDD)';
          }
        }
        checkCanProcessUpload();
      });
    }

    const selectCurso = row.querySelector('.select-curso-scan');
    if (selectCurso && item) {
      selectCurso.addEventListener('change', (e) => {
        if (e.target.value === '__add_new_curso__') {
          e.target.value = item.curso || 'ATPL';
          openCatalogoModal('cursos', selectCurso, item);
          return;
        }
        item.curso = e.target.value;
        if (item.curso === 'MEP' && item.paginas_por_examen === 1) {
          item.paginas_por_examen = 6;
        } else if (item.curso === 'CESSNA' && item.paginas_por_examen === 1) {
          item.paginas_por_examen = 9;
        } else if (item.curso === 'FI' && item.paginas_por_examen === 1) {
          item.paginas_por_examen = 7;
        }
        renderSelectedUploadFiles();
      });
    }

    const selectAsig = row.querySelector('.select-asig-scan');
    if (selectAsig && item) {
      selectAsig.addEventListener('change', (e) => {
        if (e.target.value === '__add_new_asig__') {
          e.target.value = item.asignatura || '';
          openCatalogoModal('asigs', selectAsig, item);
          return;
        }
        item.asignatura = e.target.value;
        const opt = e.target.selectedOptions ? e.target.selectedOptions[0] : null;
        item.codigo_easa = opt ? (opt.dataset.cod || '') : '';
        item.isAsigAuto = false;
        if (item.asignatura === 'DA42' || item.asignatura === 'MEP') {
          item.curso = 'MEP';
          if (item.paginas_por_examen === 1) item.paginas_por_examen = 6;
        } else if (item.asignatura === 'PPT' || item.asignatura === 'FI') {
          item.curso = 'FI';
          if (item.paginas_por_examen === 1) item.paginas_por_examen = 7;
        }
        if (item.asignatura) {
          selectAsig.classList.add('asig-detected');
        } else {
          selectAsig.classList.remove('asig-detected');
        }
        renderSelectedUploadFiles();
      });
    }

    const inputNum = row.querySelector('.input-num-scan');
    if (inputNum && item) {
      inputNum.addEventListener('input', (e) => {
        const raw = e.target.value.replace(/^EX/i, '').trim();
        item.numero_examen = raw;
        item.isExamAuto = false;
        if (item.numero_examen) {
          inputNum.classList.add('exam-detected');
        } else {
          inputNum.classList.remove('exam-detected');
        }
      });
    }

    const selectPages = row.querySelector('.select-pages-scan');
    const inputPagesCustom = row.querySelector('.input-pages-custom');
    if (selectPages && item) {
      selectPages.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'custom') {
          if (inputPagesCustom) inputPagesCustom.classList.remove('hidden');
        } else {
          if (inputPagesCustom) inputPagesCustom.classList.add('hidden');
          item.paginas_por_examen = parseInt(val, 10) || 1;
          item.isPagesAuto = false;
          renderSelectedUploadFiles();
        }
      });
    }

    if (inputPagesCustom && item) {
      inputPagesCustom.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (val && val > 0) {
          item.paginas_por_examen = val;
          item.isPagesAuto = false;
          const badge = row.querySelector('.pages-detected-badge');
          if (badge && item.total_paginas > 0) {
            const totEx = Math.ceil(item.total_paginas / val);
            badge.textContent = `✨ ${totEx} exámenes (${item.total_paginas} págs)`;
          }
        }
      });
    }

    const btnRemove = row.querySelector('.btn-remove-file');
    if (btnRemove) {
      btnRemove.addEventListener('click', () => {
        selectedScanFiles = selectedScanFiles.filter(x => x.id !== rowId);
        renderSelectedUploadFiles();
      });
    }
  });

  checkCanProcessUpload();
}

function checkCanProcessUpload() {
  const btnProcess = document.getElementById('btn-start-process-upload');
  if (!btnProcess) return;

  if (selectedScanFiles.length === 0) {
    btnProcess.disabled = true;
    return;
  }

  // Comprobar si todos tienen fecha válida de 6 dígitos
  const allValid = selectedScanFiles.every(x => x.fecha && x.fecha.length === 6 && /^\d+$/.test(x.fecha));
  btnProcess.disabled = !allValid;
}

async function processUploadScans() {
  if (selectedScanFiles.length === 0) return;

  // 1. Validar que ninguno carezca de fecha
  const faltantes = selectedScanFiles.filter(x => !x.fecha || x.fecha.length !== 6 || !/^\d+$/.test(x.fecha));
  if (faltantes.length > 0) {
    alert(`⚠️ ATENCIÓN: Hay ${faltantes.length} archivo(s) sin fecha válida asignada.\n\nPor favor, introduce la fecha (formato YYMMDD, ej: 260907) en cada archivo con aviso amarillo.`);
    const firstMissing = document.querySelector('.input-date-scan.date-missing');
    if (firstMissing) firstMissing.focus();
    return;
  }

  // 2. Verificar modo de convocatoria
  const modeRadio = document.querySelector('input[name="upload-mode"]:checked');
  const mode = modeRadio ? modeRadio.value : 'acumular';

  if (mode === 'nueva_convocatoria') {
    const confirmClean = confirm(
      '⚠️ ATENCIÓN: Has elegido "Nueva convocatoria limpia".\n\n' +
      'Esto creará una copia de respaldo segura de todos los exámenes actuales en "Historico_Convocatorias/" ' +
      'y comenzará desde cero con los nuevos escaneos.\n\n¿Deseas continuar?'
    );
    if (!confirmClean) return;

    try {
      const resArchivar = await fetch('/api/archivar_convocatoria', { method: 'POST' });
      const archData = await resArchivar.json();
      if (archData.status !== 'ok') {
        alert('Error al respaldar convocatoria previa: ' + (archData.error || 'Desconocido'));
        return;
      }
    } catch (e) {
      alert('Error de conexión al respaldar: ' + e.message);
      return;
    }
  }

  // 3. Iniciar subida y división con barra de progreso
  const progressContainer = document.getElementById('upload-progress-container');
  const progressBar = document.getElementById('upload-progress-bar');
  const progressText = document.getElementById('upload-progress-text');
  const btnProcess = document.getElementById('btn-start-process-upload');

  if (progressContainer) progressContainer.classList.remove('hidden');
  if (btnProcess) {
    btnProcess.disabled = true;
    btnProcess.innerHTML = '<span class="spinner"></span> Procesando...';
  }

  let totalPaginas = 0;
  const okArchivos = [];

  for (let i = 0; i < selectedScanFiles.length; i++) {
    const item = selectedScanFiles[i];
    if (progressText) {
      progressText.textContent = `Dividiendo archivo (${i + 1}/${selectedScanFiles.length}): ${item.file.name} (Fecha: ${item.fecha})...`;
    }
    if (progressBar) {
      progressBar.style.width = `${Math.round(((i) / selectedScanFiles.length) * 100)}%`;
    }

    try {
      const chkBlancas = document.getElementById('chk-descartar-blancas');
      const descartarBlancasVal = (!chkBlancas || chkBlancas.checked) ? '1' : '0';

      const res = await fetch('/api/upload_scan', {
        method: 'POST',
        headers: {
          'X-Filename': encodeURIComponent(item.file.name),
          'X-Fecha': item.fecha,
          'X-Sesion': currentUploadSession,
          'X-Curso': encodeURIComponent(item.curso || 'ATPL'),
          'X-Asignatura': encodeURIComponent(item.asignatura || ''),
          'X-Codigo-Easa': encodeURIComponent(item.codigo_easa || ''),
          'X-Numero-Examen': encodeURIComponent(item.numero_examen || ''),
          'X-Paginas-Por-Examen': String(item.paginas_por_examen || 1),
          'X-Descartar-Blancas': descartarBlancasVal
        },
        body: item.file
      });
      const data = await res.json();
      if (data.status === 'ok') {
        totalPaginas += (data.examenes_generados || data.paginas_generadas || 0);
        if (data.archivo_inicial_ok) {
          okArchivos.push(data.archivo_inicial_ok);
        }
      } else {
        alert(`Error al procesar ${item.file.name}: ${data.error || 'Error desconocido'}`);
      }
    } catch (e) {
      alert(`Error de red al subir ${item.file.name}: ${e.message}`);
    }
  }

  if (progressBar) progressBar.style.width = '100%';
  if (progressText) {
    progressText.textContent = `¡Finalizado! Se han generado ${totalPaginas} exámenes con éxito en la Sesión #${currentUploadSession}.`;
  }

  setTimeout(async () => {
    let msg = `🎉 ¡Convocatoria cargada con éxito!\n\n` +
      `Se han procesado ${selectedScanFiles.length} archivo(s) escaneado(s) y se han generado ${totalPaginas} exámenes individuales.\n\n` +
      `📁 Asignados a: Sesión #${currentUploadSession} (se clasificarán en 'Examenes_Renombrados/[ALUMNO].EXAMENES INTERNOS/')`;
    
    if (okArchivos.length > 0) {
      msg += `\n\n✅ Archivo(s) inicial(es) guardado(s) con 'OK' en Escaneos_Originales/:\n• ${okArchivos.join('\n• ')}`;
    }

    alert(msg);
    closeUploadModal();
    await loadExamenes();
  }, 600);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  loadExamenes();

  // Filtro desplegable de Sesión consecutiva
  if (selectFilterSesion) {
    selectFilterSesion.addEventListener('change', (e) => {
      activeSessionFilter = e.target.value;
      const btnDelSesion = document.getElementById('btn-delete-sesion');
      if (activeSessionFilter !== 'all') {
        selectFilterSesion.classList.add('active-filter');
        if (btnDelSesion) {
          btnDelSesion.style.display = 'inline-flex';
          btnDelSesion.textContent = `🗑️ Borrar Sesión ${activeSessionFilter}`;
        }
      } else {
        selectFilterSesion.classList.remove('active-filter');
        if (btnDelSesion) {
          btnDelSesion.style.display = 'none';
        }
      }
      renderExams();
    });
  }

  // Filtro desplegable de Fecha dinámica
  if (selectFilterFecha) {
    selectFilterFecha.addEventListener('change', (e) => {
      activeDayFilter = e.target.value;
      if (activeDayFilter !== 'all') {
        selectFilterFecha.classList.add('active-filter');
      } else {
        selectFilterFecha.classList.remove('active-filter');
      }
      renderExams();
    });
  }

  // Filtros por estado
  document.querySelectorAll('.filter-btn[data-status]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn[data-status]').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeStatusFilter = e.target.dataset.status;
      renderExams();
    });
  });

  // Filtro desplegable de Curso
  if (selectFilterCurso) {
    selectFilterCurso.addEventListener('change', (e) => {
      activeCursoFilter = e.target.value;
      if (activeCursoFilter !== 'all') {
        selectFilterCurso.classList.add('active-filter');
      } else {
        selectFilterCurso.classList.remove('active-filter');
      }
      renderExams();
    });
  }

  // Filtro desplegable de Asignatura
  if (selectFilterAsig) {
    selectFilterAsig.addEventListener('change', (e) => {
      activeAsigFilter = e.target.value;
      if (activeAsigFilter !== 'all') {
        selectFilterAsig.classList.add('active-filter');
      } else {
        selectFilterAsig.classList.remove('active-filter');
      }
      renderExams();
    });
  }

  // Filtro desplegable de Número de Examen
  if (selectFilterNumEx) {
    selectFilterNumEx.addEventListener('change', (e) => {
      activeNumExFilter = e.target.value;
      if (activeNumExFilter !== 'all') {
        selectFilterNumEx.classList.add('active-filter');
      } else {
        selectFilterNumEx.classList.remove('active-filter');
      }
      renderExams();
    });
  }

  // Búsqueda
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderExams();
    });
  }

  // Acciones en bloque
  if (btnBatchAnalyze) btnBatchAnalyze.addEventListener('click', () => batchAnalyzeNext(5));
  if (btnBatchRename) btnBatchRename.addEventListener('click', batchRenameAnalyzed);
  if (btnCancelBatch) btnCancelBatch.addEventListener('click', () => { isBatchRunning = false; });

  // Modal Alumnos
  const btnManageAlumnos = document.getElementById('btn-manage-alumnos');
  if (btnManageAlumnos) btnManageAlumnos.addEventListener('click', openAlumnosModal);
  
  const modalAlumnosClose = document.getElementById('modal-alumnos-close');
  if (modalAlumnosClose) modalAlumnosClose.addEventListener('click', closeAlumnosModal);
  
  const btnCancelAlumnos = document.getElementById('btn-cancel-alumnos');
  if (btnCancelAlumnos) btnCancelAlumnos.addEventListener('click', closeAlumnosModal);
  
  const backdropAlumnos = document.getElementById('backdrop-alumnos');
  if (backdropAlumnos) backdropAlumnos.addEventListener('click', closeAlumnosModal);
  
  const btnSaveAlumnos = document.getElementById('btn-save-alumnos');
  if (btnSaveAlumnos) btnSaveAlumnos.addEventListener('click', saveAlumnosList);
  
  const textareaAlumnos = document.getElementById('textarea-alumnos');
  if (textareaAlumnos) {
    textareaAlumnos.addEventListener('input', (e) => {
      const count = e.target.value.split(/[\r\n,]+/).filter(s => s.trim().length > 2).length;
      const preview = document.getElementById('alumnos-count-preview');
      if (preview) preview.textContent = `${count} alumnos detectados`;
    });
  }

  // Modal Zoom
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // 0. Si el modal de confirmación de alumno está abierto, cerrarlo
      const modalConfirmAl = document.getElementById('modal-confirm-alumno');
      if (modalConfirmAl && !modalConfirmAl.classList.contains('hidden')) {
        closeConfirmAlumnoModal(true);
        return;
      }
      // 1. Si el modal de zoom de cabeceras está abierto, cerrar únicamente el zoom
      if (!modalEl.classList.contains('hidden')) {
        closeModal();
        return;
      }
      // 2. Si el modal de alumnos está abierto, cerrar únicamente alumnos
      const modalAlumnos = document.getElementById('modal-alumnos-container');
      if (modalAlumnos && !modalAlumnos.classList.contains('hidden')) {
        closeAlumnosModal();
        return;
      }
      // 3. Si el modal de catálogo está abierto, cerrar catálogo
      const modalCat = document.getElementById('modal-catalogo-container');
      if (modalCat && !modalCat.classList.contains('hidden')) {
        closeCatalogoModal();
        return;
      }
      // 4. Si solo está el modal de carga de escaneos, cerrarlo
      const modalUpload = document.getElementById('modal-upload-container');
      if (modalUpload && !modalUpload.classList.contains('hidden')) {
        closeUploadModal();
      }
    } else if (e.key === 'Enter') {
      const modalConfirmAl = document.getElementById('modal-confirm-alumno');
      if (modalConfirmAl && !modalConfirmAl.classList.contains('hidden')) {
        e.preventDefault();
        const btnSug = document.getElementById('btn-confirm-use-suggestion');
        const btnNew = document.getElementById('btn-confirm-add-new');
        if (btnSug && !btnSug.classList.contains('hidden')) {
          btnSug.click();
        } else if (btnNew) {
          btnNew.click();
        }
      }
    }
  });

  // Modal Confirmación Alumno (Errata / Nuevo Alumno)
  const btnConfirmSug = document.getElementById('btn-confirm-use-suggestion');
  if (btnConfirmSug) btnConfirmSug.addEventListener('click', handleConfirmUseSuggestion);

  const btnConfirmNew = document.getElementById('btn-confirm-add-new');
  if (btnConfirmNew) btnConfirmNew.addEventListener('click', handleConfirmAddNew);

  const btnConfirmKeep = document.getElementById('btn-confirm-keep-only');
  if (btnConfirmKeep) btnConfirmKeep.addEventListener('click', handleConfirmKeepOnly);

  // Modal Catálogo Cursos & Materias
  const btnManageCatalogo = document.getElementById('btn-manage-catalogo');
  if (btnManageCatalogo) btnManageCatalogo.addEventListener('click', () => openCatalogoModal('cursos'));

  // Modal Carga de Escaneos
  const btnOpenUpload = document.getElementById('btn-open-upload');
  if (btnOpenUpload) btnOpenUpload.addEventListener('click', openUploadModal);

  const modalUploadClose = document.getElementById('modal-upload-close');
  if (modalUploadClose) modalUploadClose.addEventListener('click', closeUploadModal);

  const btnCancelUpload = document.getElementById('btn-cancel-upload');
  if (btnCancelUpload) btnCancelUpload.addEventListener('click', closeUploadModal);

  const backdropUpload = document.getElementById('backdrop-upload');
  if (backdropUpload) backdropUpload.addEventListener('click', closeUploadModal);

  const btnUploadEditAlumnos = document.getElementById('btn-upload-edit-alumnos');
  if (btnUploadEditAlumnos) btnUploadEditAlumnos.addEventListener('click', () => {
    openAlumnosModal();
  });

  // Drag and Drop & Input File
  const dropzone = document.getElementById('dropzone-area');
  const inputPdfFiles = document.getElementById('input-pdf-files');

  if (dropzone && inputPdfFiles) {
    dropzone.addEventListener('click', () => inputPdfFiles.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files) {
        handleAddUploadFiles(e.dataTransfer.files);
      }
    });

    inputPdfFiles.addEventListener('change', (e) => {
      if (e.target.files) {
        handleAddUploadFiles(e.target.files);
      }
    });
  }

  // Botón procesar división
  const btnStartProcess = document.getElementById('btn-start-process-upload');
  if (btnStartProcess) {
    btnStartProcess.addEventListener('click', processUploadScans);
  }
});
