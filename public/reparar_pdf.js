// =========================================================
// MÓDULO: REPARADOR DE PDFS (AESA / TEXTOS DOBLES)
// =========================================================

let reparaState = {
  archivosLocales: [],
  archivoSeleccionado: null, // { tipo: 'local'|'upload', nombre: '', ruta: '', buffer: null }
  analisis: null,
  procesando: false,
  ultimoResultado: null
};

// Inicialización de la vista
function initRepararPdfView() {
  setupReparaDragAndDrop();
  cargarArchivosCarpetaRepara();
}

// Cargar archivos disponibles en la carpeta "Repara PDF"
async function cargarArchivosCarpetaRepara() {
  const listaEl = document.getElementById('repara-lista-archivos');
  const badgeEl = document.getElementById('nav-badge-repara');
  const hubBadgeEl = document.getElementById('hub-repara-count');

  if (listaEl) {
    listaEl.innerHTML = '<div class="repara-loading-item">🔍 Buscando PDFs en la carpeta local...</div>';
  }

  try {
    const res = await fetch('/api/reparar_pdf/archivos');
    const data = await res.json();

    if (data.status === 'ok') {
      reparaState.archivosLocales = data.archivos || [];
      const total = reparaState.archivosLocales.length;

      if (badgeEl) {
        badgeEl.textContent = total;
        badgeEl.style.display = total > 0 ? 'inline-block' : 'none';
      }
      if (hubBadgeEl) hubBadgeEl.textContent = total;

      renderizarListaArchivosLocales();

      // Si no hay archivo seleccionado y hay disponibles, seleccionar el primero automáticamente
      if (!reparaState.archivoSeleccionado && total > 0) {
        seleccionarArchivoLocal(reparaState.archivosLocales[0].nombre, reparaState.archivosLocales[0].ruta);
      }
    }
  } catch (err) {
    console.error('Error cargando archivos de Repara PDF:', err);
    if (listaEl) {
      listaEl.innerHTML = '<div class="text-danger" style="padding: 0.75rem;">Error al conectar con la carpeta local.</div>';
    }
  }
}

// Renderizar la lista de archivos encontrados en la carpeta local
function renderizarListaArchivosLocales() {
  const listaEl = document.getElementById('repara-lista-archivos');
  if (!listaEl) return;

  if (reparaState.archivosLocales.length === 0) {
    listaEl.innerHTML = `
      <div class="repara-empty-local">
        <span style="font-size: 20px;">📂</span>
        <span>No hay PDFs en la carpeta <code>Repara PDF</code>. Arrastra uno a la zona de carga o copia archivos en esa carpeta.</span>
      </div>
    `;
    return;
  }

  let html = '';
  reparaState.archivosLocales.forEach((arch) => {
    const isSelected = reparaState.archivoSeleccionado && reparaState.archivoSeleccionado.nombre === arch.nombre;
    html += `
      <div class="repara-file-item ${isSelected ? 'active' : ''}" onclick="seleccionarArchivoLocal('${escapeHtml(arch.nombre)}', '${escapeHtml(arch.ruta)}')">
        <div class="repara-file-icon">📄</div>
        <div class="repara-file-info">
          <div class="repara-file-name" title="${escapeHtml(arch.nombre)}">${escapeHtml(arch.nombre)}</div>
          <div class="repara-file-meta">${arch.tamano_mb} MB • Listo para analizar</div>
        </div>
        <div class="repara-file-badge">${isSelected ? 'Seleccionado' : 'Elegir'}</div>
      </div>
    `;
  });
  listaEl.innerHTML = html;
}

// Seleccionar un archivo existente de la carpeta local
async function seleccionarArchivoLocal(nombre, ruta) {
  reparaState.archivoSeleccionado = {
    tipo: 'local',
    nombre: nombre,
    ruta: ruta,
    buffer: null
  };
  reparaState.ultimoResultado = null;
  renderizarListaArchivosLocales();
  await analizarDocumentoActual();
}

// Configurar Drag & Drop y File Input
function setupReparaDragAndDrop() {
  const dropZone = document.getElementById('repara-dropzone');
  const fileInput = document.getElementById('repara-file-input');

  if (!dropZone) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-active');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-active');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      manejarArchivoSubido(files[0]);
    }
  });

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (fileInput.files && fileInput.files.length > 0) {
        manejarArchivoSubido(fileInput.files[0]);
      }
    });
  }
}

// Manejar archivo subido por Drag & Drop o input
async function manejarArchivoSubido(file) {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    alert('Por favor, selecciona un archivo en formato PDF.');
    return;
  }

  const reader = new FileReader();
  reader.onload = async function (e) {
    const buffer = e.target.result;
    reparaState.archivoSeleccionado = {
      tipo: 'upload',
      nombre: file.name,
      ruta: null,
      buffer: buffer
    };
    reparaState.ultimoResultado = null;
    renderizarListaArchivosLocales();
    await analizarDocumentoActual();
  };
  reader.readAsArrayBuffer(file);
}

// Analizar el documento seleccionado
async function analizarDocumentoActual() {
  const panelEl = document.getElementById('repara-panel-diagnostico');
  const btnReparar = document.getElementById('btn-ejecutar-reparacion');

  if (!panelEl) return;

  panelEl.innerHTML = `
    <div class="repara-analizando">
      <div class="spinner-sm"></div>
      <span>Analizando estructura interna del PDF (AcroForms, widgets y flujos de texto)...</span>
    </div>
  `;
  if (btnReparar) btnReparar.disabled = true;

  try {
    let res;
    if (reparaState.archivoSeleccionado.tipo === 'local') {
      res = await fetch('/api/reparar_pdf/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruta: reparaState.archivoSeleccionado.ruta })
      });
    } else {
      res = await fetch('/api/reparar_pdf/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/pdf' },
        body: reparaState.archivoSeleccionado.buffer
      });
    }

    const data = await res.json();
    if (data.status === 'ok') {
      reparaState.analisis = data.stats;
      renderizarDiagnostico();
      if (btnReparar) btnReparar.disabled = false;
    } else {
      panelEl.innerHTML = `<div class="text-danger" style="padding: 1rem;">Error en el análisis: ${data.error || 'Desconocido'}</div>`;
    }
  } catch (err) {
    console.error('Error analizando PDF:', err);
    panelEl.innerHTML = `<div class="text-danger" style="padding: 1rem;">No se pudo conectar con el servidor para analizar el documento.</div>`;
  }
}

// Renderizar tarjeta de diagnóstico detallado
function renderizarDiagnostico() {
  const panelEl = document.getElementById('repara-panel-diagnostico');
  const s = reparaState.analisis;
  const arch = reparaState.archivoSeleccionado;
  if (!panelEl || !s) return;

  const tieneBugMac = s.streams_con_bug_macos > 0;
  const esEditable = s.es_formulario || s.total_widgets > 0;

  let badgeEstado = '';
  if (tieneBugMac) {
    badgeEstado = `<span class="badge-status-danger">🔴 Textos Dobles Detectados (${s.streams_con_bug_macos} campos afectados)</span>`;
  } else if (esEditable) {
    badgeEstado = `<span class="badge-status-warning">🟡 Formulario Editable (Pendiente Aplanar AESA)</span>`;
  } else {
    badgeEstado = `<span class="badge-status-success">🟢 Sin conflictos detectados</span>`;
  }

  // Generar URL para la vista previa
  let previewSrc = '';
  if (arch.tipo === 'local') {
    previewSrc = `/api/reparar_pdf/preview?nombre=${encodeURIComponent(arch.nombre)}&t=${Date.now()}`;
  }

  panelEl.innerHTML = `
    <div class="repara-diag-card">
      <div class="repara-diag-header">
        <div class="repara-diag-title">
          <strong>${escapeHtml(arch.nombre)}</strong>
          ${badgeEstado}
        </div>
        <div class="repara-diag-actions">
          <button class="btn btn-secondary btn-sm" onclick="abrirCarpetaRepara()">📁 Ver en Carpeta</button>
        </div>
      </div>

      <div class="repara-metrics-grid">
        <div class="repara-metric-box">
          <div class="repara-metric-num">${s.total_paginas}</div>
          <div class="repara-metric-label">Páginas Totales</div>
        </div>
        <div class="repara-metric-box ${tieneBugMac ? 'metric-danger' : ''}">
          <div class="repara-metric-num">${s.streams_con_bug_macos}</div>
          <div class="repara-metric-label">Textos Dobles (Bug macOS)</div>
        </div>
        <div class="repara-metric-box">
          <div class="repara-metric-num">${s.total_widgets}</div>
          <div class="repara-metric-label">Campos de Formulario</div>
        </div>
        <div class="repara-metric-box ${esEditable ? 'metric-warning' : 'metric-success'}">
          <div class="repara-metric-num">${esEditable ? 'Editable' : 'No Editable'}</div>
          <div class="repara-metric-label">Estado Normativo AESA</div>
        </div>
      </div>

      <div class="repara-diag-explain">
        ${tieneBugMac ? `
          <div class="alert-box alert-danger">
            <strong>⚠️ Diagnóstico Crítico:</strong> El formulario contiene anotaciones modificadas en macOS (Apple Preview / Quartz) que duplican el texto de los campos al imprimirse o aplanarse. Nuestro algoritmo eliminará la capa duplicada manteniendo la tipografía oficial nítida.
          </div>
        ` : `
          <div class="alert-box alert-info">
            <strong>ℹ️ Información:</strong> No se detectó duplicación por Quartz, pero el documento puede ser aplanado para cumplir con la normativa de AESA de expediente cerrado no editable.
          </div>
        `}
      </div>

      ${previewSrc ? `
        <div class="repara-preview-box">
          <div class="repara-preview-title">Vista Previa Original (Página 1):</div>
          <div class="repara-preview-img-container">
            <img src="${previewSrc}" alt="Vista previa" class="repara-preview-img" onclick="abrirModalZoom('${previewSrc}')" title="Clic para ampliar">
          </div>
          <div class="repara-preview-hint">🔍 Haz clic en la imagen para ver el detalle de los textos</div>
        </div>
      ` : ''}
    </div>
  `;
}

// Ejecutar la reparación del PDF
async function ejecutarReparacionPDF() {
  if (!reparaState.archivoSeleccionado) {
    alert('Por favor selecciona o sube un archivo PDF primero.');
    return;
  }

  const checkAplanar = document.getElementById('cfg-repara-aplanar');
  const checkDuplicados = document.getElementById('cfg-repara-duplicados');
  const checkDescargas = document.getElementById('cfg-repara-descargas');

  const aplanarAesa = checkAplanar ? checkAplanar.checked : true;
  const eliminarDuplicados = checkDuplicados ? checkDuplicados.checked : true;
  const guardarDescargas = checkDescargas ? checkDescargas.checked : true;

  const btnReparar = document.getElementById('btn-ejecutar-reparacion');
  const resultadoEl = document.getElementById('repara-resultado-box');

  if (btnReparar) {
    btnReparar.disabled = true;
    btnReparar.innerHTML = '<span>⚙️ Reparando y aplanando...</span>';
  }

  if (resultadoEl) {
    resultadoEl.style.display = 'block';
    resultadoEl.innerHTML = `
      <div class="repara-processing-banner">
        <div class="spinner-sm"></div>
        <span>Reparando textos duplicados, optimizando vectores y aplanando documento para AESA...</span>
      </div>
    `;
  }

  try {
    let res;
    if (reparaState.archivoSeleccionado.tipo === 'local') {
      res = await fetch('/api/reparar_pdf/procesar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruta: reparaState.archivoSeleccionado.ruta,
          nombre: reparaState.archivoSeleccionado.nombre,
          aplanar_aesa: aplanarAesa,
          eliminar_duplicados: eliminarDuplicados,
          guardar_en_descargas: guardarDescargas
        })
      });
    } else {
      res = await fetch('/api/reparar_pdf/procesar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          'X-Filename': encodeURIComponent(reparaState.archivoSeleccionado.nombre),
          'X-Aplanar-AESA': aplanarAesa ? 'true' : 'false',
          'X-Eliminar-Duplicados': eliminarDuplicados ? 'true' : 'false',
          'X-Guardar-Descargas': guardarDescargas ? 'true' : 'false'
        },
        body: reparaState.archivoSeleccionado.buffer
      });
    }

    const data = await res.json();
    if (data.status === 'ok') {
      reparaState.ultimoResultado = data;
      renderizarResultadoExito(data);
      // Refrescar lista de archivos locales por si se generó uno nuevo
      cargarArchivosCarpetaRepara();
    } else {
      if (resultadoEl) {
        resultadoEl.innerHTML = `
          <div class="alert-box alert-danger">
            <strong>❌ Error al procesar el archivo:</strong> ${data.error || 'Ocurrió un error inesperado'}
          </div>
        `;
      }
    }
  } catch (err) {
    console.error('Error ejecutando reparación:', err);
    if (resultadoEl) {
      resultadoEl.innerHTML = `
        <div class="alert-box alert-danger">
          <strong>❌ Error de conexión:</strong> No se pudo completar la operación en el servidor.
        </div>
      `;
    }
  } finally {
    if (btnReparar) {
      btnReparar.disabled = false;
      btnReparar.innerHTML = '<span>🛠️ Reparar PDF y Guardar (Listo para AESA)</span><span>➔</span>';
    }
  }
}

// Renderizar tarjeta de éxito tras reparar
function renderizarResultadoExito(res) {
  const resultadoEl = document.getElementById('repara-resultado-box');
  if (!resultadoEl) return;

  resultadoEl.innerHTML = `
    <div class="repara-success-card">
      <div class="repara-success-header">
        <span class="success-icon">✅</span>
        <div>
          <h4 style="margin: 0; color: #10b981; font-size: 1.15rem;">¡PDF Reparado y Aplanado Exitosamente!</h4>
          <p style="margin: 0.25rem 0 0 0; color: var(--text-muted); font-size: 0.85rem;">
            El documento ya no contiene textos dobles y cumple con el estándar de entrega oficial a AESA.
          </p>
        </div>
      </div>

      <div class="repara-success-stats">
        <div class="stat-pill">✨ <strong>${res.streams_reparados}</strong> campos con textos dobles corregidos</div>
        <div class="stat-pill">🔒 <strong>100%</strong> No editable (Aplanado vectorial AESA)</div>
        <div class="stat-pill">📄 <strong>${res.total_paginas}</strong> páginas procesadas (${res.tamano_mb} MB)</div>
      </div>

      <div class="repara-save-path">
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">Archivo generado y seleccionado en Windows:</div>
        <code style="word-break: break-all; font-family: monospace; background: rgba(0,0,0,0.3); padding: 0.4rem 0.6rem; border-radius: 6px; display: block; color: #38bdf8;">
          ${escapeHtml(res.ruta_guardada)}
        </code>
      </div>

      <div class="repara-success-buttons">
        <button class="btn btn-primary" onclick="abrirCarpetaDescargas()">
          📂 Abrir en Carpeta Descargas
        </button>
        <button class="btn btn-secondary" onclick="abrirCarpetaRepara()">
          📁 Abrir Carpeta "Repara PDF"
        </button>
      </div>
    </div>
  `;
}

// Abrir carpeta Repara PDF en Windows Explorer
async function abrirCarpetaRepara() {
  try {
    await fetch('/api/reparar_pdf/abrir_carpeta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'repara' })
    });
  } catch (e) {
    console.error(e);
  }
}

// Abrir carpeta Descargas en Windows Explorer
async function abrirCarpetaDescargas() {
  try {
    await fetch('/api/reparar_pdf/abrir_carpeta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'descargas' })
    });
  } catch (e) {
    console.error(e);
  }
}

// Modal de Zoom para vista previa
function abrirModalZoom(imgSrc) {
  let modal = document.getElementById('modal-zoom-pdf');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-zoom-pdf';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 90vw; max-height: 90vh; background: var(--bg-card); display: flex; flex-direction: column;">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1.25rem;">
          <h3 style="margin: 0;">Detalle Vista Previa</h3>
          <button class="btn-close" onclick="cerrarModalZoom()">✕</button>
        </div>
        <div class="modal-body" style="overflow: auto; padding: 1rem; text-align: center;">
          <img id="zoom-img-target" src="" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  document.getElementById('zoom-img-target').src = imgSrc;
  modal.classList.remove('hidden');
}

function cerrarModalZoom() {
  const modal = document.getElementById('modal-zoom-pdf');
  if (modal) modal.classList.add('hidden');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

