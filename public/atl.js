// =========================================================
// GESTOR Y RENOMBRADOR DE ATLS (AIRCRAFT & FSTD TECHNICAL LOGS)
// 100% Local
// =========================================================

let atlItems = [];
let atlFlota = ['ES-3A-099', 'ES-1A-099', 'EC-KSM', 'EC-JZZ', 'EC-LYB', 'EC-MDO', 'EC-NAD'];
let activeAtlStatus = 'all';
let activeAtlAvion = 'all';
let atlSearchQuery = '';

// Elementos del DOM de ATL
const atlListEl = document.getElementById('atl-list');
const atlStatTotal = document.getElementById('atl-stat-total');
const atlStatPending = document.getElementById('atl-stat-pending');
const atlStatReady = document.getElementById('atl-stat-ready');
const atlStatDone = document.getElementById('atl-stat-done');

const selectAtlFilterAvion = document.getElementById('select-atl-filter-avion');
const atlSearchInput = document.getElementById('atl-search-input');

// Cargar flota de la escuela
async function loadAtlFlota() {
  try {
    const res = await fetch('/api/atl/flota');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      atlFlota = data;
    }
  } catch (err) {
    console.warn('Error cargando flota ATL:', err);
  }
  updateFlotaDatalist();
  updateFlotaFilter();
}

function updateFlotaDatalist() {
  let datalist = document.getElementById('lista-flota-atl');
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = 'lista-flota-atl';
    document.body.appendChild(datalist);
  }
  datalist.innerHTML = atlFlota.map(av => `<option value="${av}">`).join('');
}

function updateFlotaFilter() {
  if (!selectAtlFilterAvion) return;
  const currentVal = selectAtlFilterAvion.value;
  selectAtlFilterAvion.innerHTML = '<option value="all">Flota: Todas</option>';
  atlFlota.forEach(av => {
    const opt = document.createElement('option');
    opt.value = av;
    opt.textContent = av;
    selectAtlFilterAvion.appendChild(opt);
  });
  if (currentVal) selectAtlFilterAvion.value = currentVal;
}

// Cargar items de ATL desde el servidor
async function loadAtlItems() {
  try {
    atlItems = await loadStateItems('/api/atl/items', 'atl-state-notice');
    updateAtlStats();
    renderAtlCards();
    if (typeof updateNavBadges === 'function') {
      updateNavBadges();
    }
  } catch (err) {
    console.error('Error cargando items de ATL:', err);
  }
}

// Actualizar estadísticas en UI
function updateAtlStats() {
  const total = atlItems.length;
  const pending = atlItems.filter(it => it.estado === 'pendiente' || !it.fecha || !it.log_numero).length;
  const ready = atlItems.filter(it => it.estado === 'listo').length;
  const done = atlItems.filter(it => it.estado === 'renombrado').length;

  if (atlStatTotal) atlStatTotal.textContent = total;
  if (atlStatPending) atlStatPending.textContent = pending;
  if (atlStatReady) atlStatReady.textContent = ready;
  if (atlStatDone) atlStatDone.textContent = done;

  // Actualizar también en el hub
  const hubCount = document.getElementById('hub-atl-count');
  const hubPending = document.getElementById('hub-atl-pending');
  if (hubCount) hubCount.textContent = total;
  if (hubPending) hubPending.textContent = pending;
}

// Renderizar tarjetas de ATL
function renderAtlCards() {
  if (!atlListEl) return;

  const filtered = atlItems.filter(item => {
    // Filtro por estado
    if (activeAtlStatus === 'pendiente' && item.estado !== 'pendiente' && item.fecha && item.log_numero) return false;
    if (activeAtlStatus === 'listo' && item.estado !== 'listo') return false;
    if (activeAtlStatus === 'renombrado' && item.estado !== 'renombrado') return false;

    // Filtro por avión
    if (activeAtlAvion !== 'all' && item.avion !== activeAtlAvion) return false;

    // Búsqueda
    if (atlSearchQuery) {
      const q = atlSearchQuery.toLowerCase();
      const matchFecha = (item.fecha || '').toLowerCase().includes(q);
      const matchAvion = (item.avion || '').toLowerCase().includes(q);
      const matchLog = (item.log_numero || '').toLowerCase().includes(q);
      const matchName = (item.nombre_final || '').toLowerCase().includes(q);
      if (!matchFecha && !matchAvion && !matchLog && !matchName) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    atlListEl.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <div style="font-size: 3rem; margin-bottom: 1rem;">✈️</div>
        <h3 style="color: var(--text-main); margin-bottom: 0.5rem;">No hay hojas de ATL que coincidan</h3>
        <p style="font-size: 0.9rem;">Carga un PDF escaneado con partes de vuelo para comenzar a dividirlos y renombrarlos.</p>
        <button class="btn btn-success" style="margin-top: 1.5rem;" onclick="openAtlUploadModal()">
          <span>📥 Cargar PDF de ATLs</span>
        </button>
      </div>
    `;
    return;
  }

  atlListEl.innerHTML = filtered.map((item, index) => {
    const isMissingDate = !item.fecha || item.fecha.length < 6;
    const isMissingLog = !item.log_numero;
    const isListo = item.estado === 'listo';
    const isRenombrado = item.estado === 'renombrado';

    let statusClass = 'pendiente';
    let statusText = 'Pendiente';
    if (isRenombrado) {
      statusClass = 'renombrado';
      statusText = '✓ Renombrado';
    } else if (isListo || (!isMissingDate && !isMissingLog && item.avion)) {
      statusClass = 'listo';
      statusText = '● Listo';
    }

    const thumbUrl = `/api/atl/thumbnail/${encodeURIComponent(item.id)}?t=${Date.now()}`;
    const cleanFinalName = item.nombre_final || `${item.fecha || 'FECHA'} ${item.avion || 'ES-3A-099'} ${item.log_numero || 'LOG'}.pdf`;

    return `
      <div class="atl-card atl-status-${statusClass}" id="atl-card-${item.id}" data-id="${item.id}" data-index="${index}">
        <div class="atl-card-top">
          <span class="atl-card-badge-id">Pág. ${item.num_pagina || (index + 1)} &bull; ${item.id}</span>
          <span class="atl-status-badge ${statusClass}">${statusText}</span>
        </div>

        <!-- Recorte nítido de la cabecera -->
        <div class="atl-thumb-wrapper" onclick="openAtlImageZoom('${thumbUrl}', 'Cabecera ATL: ${item.id}')" title="Clic para ampliar cabecera">
          <img src="${thumbUrl}" alt="Cabecera ATL ${item.id}" loading="lazy" onerror="this.src='/public/favicon.ico'">
          <div class="atl-thumb-overlay">
            <span>🔍 Ampliar</span>
          </div>
        </div>

        <!-- Formulario interactivo con saltos de teclado -->
        <div class="atl-form">
          <!-- Fila 1: Fecha con copia rápida -->
          <div class="atl-input-row">
            <div class="atl-field-group" style="flex: 2;">
              <label for="atl-fecha-${item.id}">Fecha (YYMMDD)</label>
              <input 
                type="text" 
                id="atl-fecha-${item.id}"
                class="atl-input ${isMissingDate ? 'input-missing' : ''}" 
                placeholder="ej: 260722"
                maxlength="8"
                value="${item.fecha || ''}"
                oninput="onAtlInputChange('${item.id}', 'fecha', this.value)"
                onkeydown="handleAtlDateKeydown(event, '${item.id}')"
                autocomplete="off"
              >
            </div>
            <button 
              type="button" 
              class="btn-atl-copy-date" 
              onclick="copyAtlDateDownward('${item.id}')" 
              title="Copiar esta fecha a todas las hojas siguientes"
            >
              ⬇️ Copiar hacia abajo
            </button>
          </div>

          <!-- Fila 2: Avión/Simulador y Nº de Log -->
          <div class="atl-input-row">
            <div class="atl-field-group" style="flex: 1.2;">
              <label for="atl-avion-${item.id}">Avión / Sim</label>
              <input 
                type="text" 
                id="atl-avion-${item.id}"
                class="atl-input" 
                list="lista-flota-atl"
                placeholder="ES-3A-099"
                value="${item.avion || 'ES-3A-099'}"
                oninput="onAtlInputChange('${item.id}', 'avion', this.value)"
                onkeydown="handleAtlInputEnter(event, '${item.id}')"
                autocomplete="off"
              >
            </div>

            <div class="atl-field-group" style="flex: 1;">
              <label for="atl-log-${item.id}">Nº de Log</label>
              <input 
                type="text" 
                id="atl-log-${item.id}"
                class="atl-input ${isMissingLog ? 'input-missing' : ''}" 
                placeholder="LOG0320"
                value="${item.log_numero || ''}"
                oninput="onAtlInputChange('${item.id}', 'log_numero', this.value)"
                onkeydown="handleAtlInputEnter(event, '${item.id}')"
                autocomplete="off"
              >
            </div>
          </div>

          <!-- Fila 3: Vista previa de nombre final -->
          <div class="atl-preview-box">
            <span class="atl-filename-text" id="atl-preview-name-${item.id}">${cleanFinalName}</span>
          </div>

          <!-- Fila 4: Acciones -->
          <small role="status" id="atl-save-${item.id}">${atlAutosave.status(item.id)}</small>
          <div class="atl-actions-row">
            <button class="btn btn-outline btn-sm" onclick="viewAtlPdf('${item.id}')" title="Ver hoja completa en PDF">
              <span>👁️ Ver PDF</span>
            </button>
            <button 
              class="btn ${isRenombrado ? 'btn-outline' : 'btn-success'} btn-sm" 
              onclick="renameSingleAtl('${item.id}')"
              title="${isRenombrado ? 'Re-guardar nombre' : 'Renombrar y guardar en ATL_Renombrados'}"
            >
              <span>${isRenombrado ? '✓ Renombrado' : '💾 Renombrar'}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Edición reactiva al escribir en los inputs
function onAtlInputChange(id, field, value) {
  const item = atlItems.find(it => it.id === id);
  if (!item) return;

  if (field === 'fecha') {
    item.fecha = value.trim();
  } else if (field === 'avion') {
    item.avion = value.trim().toUpperCase();
  } else if (field === 'log_numero') {
    let val = value.trim().toUpperCase();
    item.log_numero = val;
  }

  // Actualizar preview en vivo en la tarjeta
  const f = item.fecha || 'FECHA';
  const a = item.avion || 'AVION';
  let l = item.log_numero || 'LOG';
  if (l && !l.startsWith('LOG') && /^\d+$/.test(l)) {
    l = `LOG${l.padStart(4, '0')}`;
  }
  const previewName = `${f} ${a} ${l}.pdf`;
  item.nombre_final = previewName;

  const previewEl = document.getElementById(`atl-preview-name-${id}`);
  if (previewEl) previewEl.textContent = previewName;

  // Auto-guardado con debounce en servidor
  atlAutosave.schedule(item);
}

// Guardar un item en el backend
const atlAutosave = createItemAutosave({
  async save(item) {
    const res = await fetch('/api/atl/guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item })
    });
    const data = await res.json();
    if (!res.ok || data.status !== 'ok') {
      throw new Error(data.error || 'No se pudo guardar el ATL.');
    }
    return data;
  },
  onSaved(id, data) {
    const item = atlItems.find(candidate => candidate.id === id);
    if (item && data.item) {
      Object.assign(item, data.item);
      updateAtlStats();
    }
  },
  onStatus(id, status) {
    const element = document.getElementById(`atl-save-${id}`);
    if (element) element.textContent = status;
  },
});

async function saveAtlItemToServer(item) {
  atlAutosave.schedule(item);
  try {
    await atlAutosave.flush(item.id);
  } catch (err) {
    alert('Error guardando ATL: ' + err.message);
  }
}

// Navegación rápida con Teclado: ENTER en fecha pasa a la fecha de la siguiente tarjeta
function handleAtlDateKeydown(event, currentId) {
  if (event.key === 'Enter') {
    event.preventDefault();
    const item = atlItems.find(it => it.id === currentId);
    if (item) saveAtlItemToServer(item);

    // Encontrar el siguiente card en el DOM
    const currentCard = document.getElementById(`atl-card-${currentId}`);
    if (currentCard) {
      const nextCard = currentCard.nextElementSibling;
      if (nextCard && nextCard.classList.contains('atl-card')) {
        const nextId = nextCard.dataset.id;
        const nextFechaInput = document.getElementById(`atl-fecha-${nextId}`);
        if (nextFechaInput) {
          nextFechaInput.focus();
          nextFechaInput.select();
          nextCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  }
}

function handleAtlInputEnter(event, currentId) {
  if (event.key === 'Enter') {
    event.preventDefault();
    const item = atlItems.find(it => it.id === currentId);
    if (item) saveAtlItemToServer(item);
  }
}

// Copiar la fecha de la hoja actual a todas las siguientes hojas
async function copyAtlDateDownward(sourceId) {
  const sourceItem = atlItems.find(it => it.id === sourceId);
  if (!sourceItem || !sourceItem.fecha) {
    alert('Primero introduce una fecha válida (YYMMDD) en esta hoja.');
    return;
  }

  const targetDate = sourceItem.fecha;
  const sourceIndex = atlItems.findIndex(it => it.id === sourceId);
  const idsToUpdate = [];

  for (let i = sourceIndex + 1; i < atlItems.length; i++) {
    atlItems[i].fecha = targetDate;
    idsToUpdate.push(atlItems[i].id);
  }

  if (idsToUpdate.length === 0) {
    alert('Esta ya es la última hoja.');
    return;
  }

  try {
    await fetch('/api/atl/aplicar_lote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: idsToUpdate, fecha: targetDate })
    });
    renderAtlCards();
    updateAtlStats();
  } catch (err) {
    console.error('Error copiando fecha:', err);
  }
}

// Ver PDF completo de la hoja
function viewAtlPdf(id) {
  window.open(`/api/atl/pdf/${encodeURIComponent(id)}`, '_blank');
}

// Zoom de cabecera ampliada
function openAtlImageZoom(src, title) {
  const modal = document.getElementById('image-modal');
  const img = document.getElementById('modal-img');
  const titleEl = document.getElementById('modal-title');
  if (img) img.src = src;
  if (titleEl) titleEl.textContent = title || 'Cabecera del ATL';
  if (modal) modal.classList.remove('hidden');
}

// Renombrar una hoja individual
async function renameSingleAtl(id) {
  const item = atlItems.find(it => it.id === id);
  if (!item) return;

  if (!item.fecha || !item.log_numero) {
    alert('Por favor, indica al menos la Fecha y el Nº de Log antes de renombrar.');
    return;
  }

  try {
    await atlAutosave.flush(id);
    const res = await fetch('/api/atl/renombrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] })
    });
    const data = await res.json();
    if (res.ok && data.status === 'ok' && data.renombrados?.some(entry => entry.id === id)) {
      item.estado = 'renombrado';
      renderAtlCards();
      updateAtlStats();
      if (data.errores?.length) alert(data.errores.map(entry => entry.error).join('\n'));
    } else {
      alert(data.errores?.map(entry => entry.error).join('\n') || data.error || 'No se pudo renombrar el ATL.');
    }
  } catch (err) {
    alert('Error renombrando ATL: ' + err.message);
  }
}

// Renombrar todas las hojas listas
async function renameReadyAtls() {
  const readyItems = atlItems.filter(it => it.fecha && it.avion && it.log_numero);
  if (readyItems.length === 0) {
    alert('No hay hojas de ATL con los datos completos (Fecha, Avión y Log) para renombrar.');
    return;
  }

  const confirmMsg = `¿Deseas renombrar ${readyItems.length} hoja(s) de ATL y guardarlas en la carpeta ATL_Renombrados/?`;
  if (!confirm(confirmMsg)) return;

  try {
    await Promise.all(readyItems.map(item => atlAutosave.flush(item.id)));
    const res = await fetch('/api/atl/renombrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: readyItems.map(i => i.id) })
    });
    const data = await res.json();
    if (res.ok && data.status === 'ok' && Array.isArray(data.renombrados)) {
      const details = (data.errores || []).map(entry => `${entry.id}: ${entry.error}`).join('\n');
      alert(`Se han renombrado ${data.renombrados.length} de ${readyItems.length} archivo(s).${details ? '\n' + details : ''}`);
      await loadAtlItems();
    } else {
      throw new Error(data.error || 'El servidor no confirmó el renombrado.');
    }
  } catch (err) {
    alert('Error en renombrado en bloque: ' + err.message);
  }
}

// Limpiar tanda actual de ATLs
async function clearAtlBatch() {
  if (atlItems.length === 0) {
    alert('No hay hojas de ATL cargadas actualmente.');
    return;
  }
  if (!confirm('¿Seguro que deseas limpiar la tanda actual de hojas divididas? Los archivos ya renombrados en ATL_Renombrados se conservarán.')) {
    return;
  }

  try {
    const res = await fetch('/api/atl/limpiar', { method: 'POST' });
    const data = await res.json();
    if (data.status === 'ok') {
      atlItems = [];
      renderAtlCards();
      updateAtlStats();
    }
  } catch (err) {
    console.error('Error limpiando tanda:', err);
  }
}

// =========================================================
// MODAL: SUBIDA Y DIVISIÓN DE PDF DE ATLS
// =========================================================

function openAtlUploadModal() {
  const modal = document.getElementById('modal-atl-upload-container');
  if (modal) modal.classList.remove('hidden');
}

function closeAtlUploadModal() {
  const modal = document.getElementById('modal-atl-upload-container');
  if (modal) modal.classList.add('hidden');
}

async function handleAtlFilesSelected(file) {
  if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
    alert('Por favor selecciona un archivo en formato PDF.');
    return;
  }

  const progressBox = document.getElementById('atl-upload-progress-container');
  const progressBar = document.getElementById('atl-upload-progress-bar');
  const progressText = document.getElementById('atl-upload-progress-text');

  if (progressBox) progressBox.classList.remove('hidden');
  if (progressBar) progressBar.style.width = '35%';
  if (progressText) progressText.textContent = `Dividiendo ${file.name} hoja por hoja...`;

  try {
    const buffer = await file.arrayBuffer();
    if (progressBar) progressBar.style.width = '70%';

    const res = await fetch('/api/atl/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
        'X-Filename': encodeURIComponent(file.name)
      },
      body: buffer
    });

    const data = await res.json();
    if (progressBar) progressBar.style.width = '100%';

    if (data.status === 'ok') {
      if (progressText) progressText.textContent = `¡Listo! Generadas ${data.paginas_generadas} hojas individuales.`;
      setTimeout(() => {
        if (progressBox) progressBox.classList.add('hidden');
        closeAtlUploadModal();
        loadAtlItems();
      }, 700);
    } else {
      alert(`Error al procesar el PDF: ${data.error || 'Desconocido'}`);
      if (progressBox) progressBox.classList.add('hidden');
    }
  } catch (err) {
    console.error('Error subiendo PDF de ATL:', err);
    alert('Ocurrió un error al subir el archivo.');
    if (progressBox) progressBox.classList.add('hidden');
  }
}

// =========================================================
// MODAL: AUTO-INCREMENTAR NÚMEROS DE LOGS
// =========================================================

function openAutoLogsModal() {
  if (atlItems.length === 0) {
    alert('Primero debes cargar un archivo PDF de ATLs.');
    return;
  }

  const inputStartLog = document.getElementById('input-auto-start-log');
  const selectStartSheet = document.getElementById('select-auto-start-sheet');

  if (selectStartSheet) {
    selectStartSheet.innerHTML = atlItems.map((item, idx) => `
      <option value="${item.id}">Pág. ${item.num_pagina || (idx + 1)} (${item.id})</option>
    `).join('');
  }

  // Sugerir log de la primera página si ya tiene uno
  if (inputStartLog) {
    const firstLog = atlItems[0]?.log_numero || 'LOG0319';
    inputStartLog.value = firstLog;
  }

  const modal = document.getElementById('modal-atl-auto-logs');
  if (modal) modal.classList.remove('hidden');
}

function closeAutoLogsModal() {
  const modal = document.getElementById('modal-atl-auto-logs');
  if (modal) modal.classList.add('hidden');
}

async function applyAutoLogsFromModal() {
  const inputStartLog = document.getElementById('input-auto-start-log');
  const selectStartSheet = document.getElementById('select-auto-start-sheet');

  const startLog = inputStartLog ? inputStartLog.value.trim() : '';
  const startId = selectStartSheet ? selectStartSheet.value : (atlItems[0]?.id || '');

  if (!startLog) {
    alert('Introduce un número de log inicial (ej: 0319 o LOG0319).');
    return;
  }

  try {
    const res = await fetch('/api/atl/auto_incrementar_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_id: startId, start_log: startLog })
    });
    const data = await res.json();
    if (data.status === 'ok') {
      closeAutoLogsModal();
      await loadAtlItems();
    } else {
      alert(`Error: ${data.error || 'No se pudo auto-incrementar'}`);
    }
  } catch (err) {
    console.error('Error aplicando auto-logs:', err);
  }
}

// =========================================================
// MODAL: FIJAR FECHA MASIVA
// =========================================================

function openBatchDateModal() {
  if (atlItems.length === 0) {
    alert('No hay hojas de ATL cargadas.');
    return;
  }
  const modal = document.getElementById('modal-atl-batch-date');
  if (modal) modal.classList.remove('hidden');
}

function closeBatchDateModal() {
  const modal = document.getElementById('modal-atl-batch-date');
  if (modal) modal.classList.add('hidden');
}

async function applyBatchDateFromModal() {
  const inputDate = document.getElementById('input-batch-date-val');
  const radioScope = document.querySelector('input[name="batch-date-scope"]:checked');

  const dateVal = inputDate ? inputDate.value.trim() : '';
  if (!dateVal || dateVal.length < 6) {
    alert('Por favor introduce una fecha válida de 6 dígitos en formato YYMMDD (ej: 260722).');
    return;
  }

  const scope = radioScope ? radioScope.value : 'all';
  let targetIds = [];
  if (scope === 'empty') {
    targetIds = atlItems.filter(it => !it.fecha).map(it => it.id);
  } else {
    targetIds = atlItems.map(it => it.id);
  }

  if (targetIds.length === 0) {
    alert('No hay hojas que cumplan la condición seleccionada.');
    return;
  }

  try {
    const res = await fetch('/api/atl/aplicar_lote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: targetIds, fecha: dateVal })
    });
    const data = await res.json();
    if (data.status === 'ok') {
      closeBatchDateModal();
      await loadAtlItems();
    }
  } catch (err) {
    console.error('Error fijando fecha masiva:', err);
  }
}

// =========================================================
// MODAL: FIJAR FLOTA / AVIÓN MASIVO
// =========================================================

function openBatchFlotaModal() {
  if (atlItems.length === 0) {
    alert('No hay hojas de ATL cargadas.');
    return;
  }
  const modal = document.getElementById('modal-atl-batch-flota');
  if (modal) modal.classList.remove('hidden');
}

function closeBatchFlotaModal() {
  const modal = document.getElementById('modal-atl-batch-flota');
  if (modal) modal.classList.add('hidden');
}

async function applyBatchFlotaFromModal() {
  const inputAvion = document.getElementById('input-batch-avion-val');
  const avionVal = inputAvion ? inputAvion.value.trim().toUpperCase() : '';
  if (!avionVal) {
    alert('Por favor indica una aeronave o simulador (ej: ES-3A-099).');
    return;
  }

  const targetIds = atlItems.map(it => it.id);
  try {
    const res = await fetch('/api/atl/aplicar_lote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: targetIds, avion: avionVal })
    });
    const data = await res.json();
    if (data.status === 'ok') {
      closeBatchFlotaModal();
      await loadAtlItems();
    }
  } catch (err) {
    console.error('Error fijando flota masiva:', err);
  }
}

// Inicialización de listeners de ATL
document.addEventListener('DOMContentLoaded', () => {
  // Filtros de estado ATL
  document.querySelectorAll('[data-atl-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-atl-status]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeAtlStatus = btn.dataset.atlStatus;
      renderAtlCards();
    });
  });

  // Filtro por flota
  if (selectAtlFilterAvion) {
    selectAtlFilterAvion.addEventListener('change', (e) => {
      activeAtlAvion = e.target.value;
      renderAtlCards();
    });
  }

  // Búsqueda
  if (atlSearchInput) {
    atlSearchInput.addEventListener('input', (e) => {
      atlSearchQuery = e.target.value.trim();
      renderAtlCards();
    });
  }

  // Botones header ATL
  const btnOpenUpload = document.getElementById('btn-atl-open-upload');
  if (btnOpenUpload) btnOpenUpload.addEventListener('click', openAtlUploadModal);

  const btnAutoLogs = document.getElementById('btn-atl-auto-logs');
  if (btnAutoLogs) btnAutoLogs.addEventListener('click', openAutoLogsModal);

  const btnBatchDate = document.getElementById('btn-atl-batch-date');
  if (btnBatchDate) btnBatchDate.addEventListener('click', openBatchDateModal);

  const btnBatchFlota = document.getElementById('btn-atl-batch-flota');
  if (btnBatchFlota) btnBatchFlota.addEventListener('click', openBatchFlotaModal);

  const btnBatchRename = document.getElementById('btn-atl-batch-rename');
  if (btnBatchRename) btnBatchRename.addEventListener('click', renameReadyAtls);

  const btnClear = document.getElementById('btn-atl-clear');
  if (btnClear) btnClear.addEventListener('click', clearAtlBatch);

  // Dropzone de subida de ATL
  const dropzoneAtl = document.getElementById('atl-dropzone-area');
  const inputPdfAtl = document.getElementById('atl-input-pdf-file');

  if (dropzoneAtl && inputPdfAtl) {
    dropzoneAtl.addEventListener('click', () => inputPdfAtl.click());

    dropzoneAtl.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzoneAtl.style.borderColor = 'var(--primary)';
      dropzoneAtl.style.background = 'rgba(56, 189, 248, 0.05)';
    });

    dropzoneAtl.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzoneAtl.style.borderColor = 'var(--border-color)';
      dropzoneAtl.style.background = 'transparent';
    });

    dropzoneAtl.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzoneAtl.style.borderColor = 'var(--border-color)';
      dropzoneAtl.style.background = 'transparent';
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleAtlFilesSelected(e.dataTransfer.files[0]);
      }
    });

    inputPdfAtl.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleAtlFilesSelected(e.target.files[0]);
      }
    });
  }

  // Carga inicial
  loadAtlFlota();
  loadAtlItems();
});
