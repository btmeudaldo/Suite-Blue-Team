// =========================================================
// MÓDULO DE GESTIÓN Y RENUMERACIÓN DE SECUENCIAS ATL (WORD)
// =========================================================

let secuenciaDocs = [];
let documentoSeleccionado = null;

async function loadSecuenciaDocs() {
  const container = document.getElementById('secuencia-docs-list');
  const selectFile = document.getElementById('secuencia-select-file');
  const badgeSecuencia = document.getElementById('nav-badge-secuencia');
  const hubSecCount = document.getElementById('hub-sec-count');

  if (container) {
    container.innerHTML = `
      <div class="secuencia-loading">
        <span class="spinner-small"></span> Cargando talonarios de vuelo...
      </div>`;
  }

  try {
    const res = await fetch('/api/secuencia_atl/listar');
    const data = await res.json();

    if (data.status !== 'ok') {
      throw new Error(data.error || 'Error al obtener documentos');
    }

    secuenciaDocs = data.documentos || [];

    if (badgeSecuencia) badgeSecuencia.textContent = secuenciaDocs.length;
    if (hubSecCount) hubSecCount.textContent = secuenciaDocs.length;

    renderSecuenciaDocs();
    updateSecuenciaSelect();

  } catch (err) {
    console.error("Error cargando secuencias ATL:", err);
    if (container) {
      container.innerHTML = `
        <div class="secuencia-error-box">
          ⚠️ No se pudieron cargar los talonarios: ${err.message}
        </div>`;
    }
  }
}

function updateSecuenciaSelect() {
  const selectFile = document.getElementById('secuencia-select-file');
  if (!selectFile) return;

  const currentVal = selectFile.value;
  selectFile.innerHTML = '<option value="">-- Selecciona un talonario Word (.docx) --</option>';

  secuenciaDocs.forEach(doc => {
    const opt = document.createElement('option');
    opt.value = doc.archivo;
    opt.textContent = `✈️ ${doc.aeronave} — ${doc.archivo} (${doc.total_paginas} págs)`;
    selectFile.appendChild(opt);
  });

  if (currentVal && secuenciaDocs.some(d => d.archivo === currentVal)) {
    selectFile.value = currentVal;
  } else if (secuenciaDocs.length > 0 && !documentoSeleccionado) {
    // Seleccionar el primero por defecto (ej. OXV o NNA)
    const oxv = secuenciaDocs.find(d => d.aeronave.includes('OXV')) || secuenciaDocs[0];
    selectFile.value = oxv.archivo;
    onSecuenciaFileChange(oxv.archivo);
  }
}

function renderSecuenciaDocs() {
  const container = document.getElementById('secuencia-docs-list');
  if (!container) return;

  if (secuenciaDocs.length === 0) {
    container.innerHTML = `
      <div class="secuencia-empty">
        <p>No se encontraron archivos <code>.docx</code> en la carpeta <strong>Sequencia ATL</strong>.</p>
        <button class="btn btn-secondary" onclick="loadSecuenciaDocs()">🔄 Recargar</button>
      </div>`;
    return;
  }

  let html = '';
  secuenciaDocs.forEach((doc, idx) => {
    const isSelected = documentoSeleccionado && documentoSeleccionado.archivo === doc.archivo;
    const tamanoKb = (doc.tamano_bytes / 1024).toFixed(0);

    html += `
      <div class="sec-card ${isSelected ? 'selected' : ''}" onclick="selectSecuenciaCard('${doc.archivo}')">
        <div class="sec-card-header">
          <div class="sec-card-plane">
            <span class="sec-plane-badge">${doc.aeronave}</span>
          </div>
          <span class="sec-pages-tag">${doc.total_paginas} Páginas</span>
        </div>
        
        <div class="sec-card-body">
          <h4 class="sec-filename" title="${doc.archivo}">${doc.archivo}</h4>
          <div class="sec-meta-row">
            <span class="sec-meta-label">Prefijo detectado:</span>
            <span class="sec-pref-val">${doc.prefijo_detectado}</span>
          </div>
          <div class="sec-meta-row">
            <span class="sec-meta-label">Muestra inicial:</span>
            <span class="sec-sample-val">${doc.muestra_inicio || 'N/A'}</span>
          </div>
        </div>

        <div class="sec-card-actions">
          <button class="btn-sec-action primary" onclick="event.stopPropagation(); prepararRenumerar('${doc.archivo}')">
            ⚡ Configurar & Renumerar
          </button>
          <a class="btn-sec-action download" href="/api/secuencia_atl/descargar?archivo=${encodeURIComponent(doc.archivo)}" title="Descargar Word actual" onclick="event.stopPropagation();">
            📥 Descargar
          </a>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function selectSecuenciaCard(filename) {
  const select = document.getElementById('secuencia-select-file');
  if (select) select.value = filename;
  onSecuenciaFileChange(filename);
}

function onSecuenciaFileChange(filename) {
  documentoSeleccionado = secuenciaDocs.find(d => d.archivo === filename) || null;

  const prefijoInput = document.getElementById('secuencia-prefix');
  const inicioInput = document.getElementById('secuencia-start-num');

  if (documentoSeleccionado) {
    if (prefijoInput) {
      prefijoInput.value = documentoSeleccionado.prefijo_detectado || 'LOG H-';
    }
  }

  updateLivePreview();
  renderSecuenciaDocs();
}

function updateLivePreview() {
  const previewBox = document.getElementById('secuencia-live-preview');
  const startInput = document.getElementById('secuencia-start-num');
  const prefixInput = document.getElementById('secuencia-prefix');
  const digitsInput = document.getElementById('secuencia-digits');

  if (!previewBox) return;

  const startVal = parseInt(startInput ? startInput.value : 1, 10) || 1;
  const prefixVal = prefixInput ? prefixInput.value : 'LOG H-';
  const digitsVal = parseInt(digitsInput ? digitsInput.value : 4, 10) || 4;
  const totalPages = documentoSeleccionado ? documentoSeleccionado.total_paginas : 100;

  const endVal = startVal + totalPages - 1;

  const formatNum = (n) => String(n).padStart(digitsVal, '0');

  const p1 = `${prefixVal}${formatNum(startVal)}`;
  const p2 = `${prefixVal}${formatNum(startVal + 1)}`;
  const p3 = `${prefixVal}${formatNum(startVal + 2)}`;
  const pend = `${prefixVal}${formatNum(endVal)}`;

  previewBox.innerHTML = `
    <div class="preview-badge-row">
      <span class="preview-tag-plane">${documentoSeleccionado ? documentoSeleccionado.aeronave : 'Flota ATL'}</span>
      <span class="preview-tag-count">Total: ${totalPages} páginas consecutivas</span>
    </div>
    <div class="preview-flow">
      <div class="preview-step">
        <span class="p-num">Pág 1</span>
        <span class="p-val">${p1}</span>
      </div>
      <div class="preview-step">
        <span class="p-num">Pág 2</span>
        <span class="p-val">${p2}</span>
      </div>
      <div class="preview-step">
        <span class="p-num">Pág 3</span>
        <span class="p-val">${p3}</span>
      </div>
      <div class="preview-ellipsis">...</div>
      <div class="preview-step last">
        <span class="p-num">Pág ${totalPages}</span>
        <span class="p-val highlight">${pend}</span>
      </div>
    </div>
  `;
}

function prepararRenumerar(filename) {
  const select = document.getElementById('secuencia-select-file');
  if (select) select.value = filename;
  onSecuenciaFileChange(filename);

  // Scroll suave al formulario de configuración
  const formArea = document.getElementById('secuencia-config-panel');
  if (formArea) {
    formArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

async function ejecutarRenumeracion() {
  const select = document.getElementById('secuencia-select-file');
  const startInput = document.getElementById('secuencia-start-num');
  const prefixInput = document.getElementById('secuencia-prefix');
  const digitsInput = document.getElementById('secuencia-digits');
  const btn = document.getElementById('btn-ejecutar-renumeracion');

  const filename = select ? select.value : '';
  if (!filename) {
    alert('Por favor selecciona un talonario de la lista.');
    return;
  }

  const startVal = parseInt(startInput ? startInput.value : 1, 10);
  if (isNaN(startVal) || startVal < 0) {
    alert('El número inicial debe ser un entero positivo (por ejemplo 1 o 1101).');
    return;
  }

  const prefixVal = prefixInput ? prefixInput.value.trim() : '';
  const digitsVal = parseInt(digitsInput ? digitsInput.value : 4, 10) || 4;

  const confirmMsg = `¿Confirmas renumerar ${filename}?\n` +
                     `Inicio: ${startVal}\n` +
                     `Prefijo: ${prefixVal || '(Autodetectado)'}\n` +
                     `Se generarán las páginas desde ${prefixVal}${String(startVal).padStart(digitsVal, '0')} en adelante.`;
  if (!confirm(confirmMsg)) return;

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Procesando y guardando Word...';
  }

  try {
    const res = await fetch('/api/secuencia_atl/renumerar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        archivo: filename,
        inicio: startVal,
        prefijo: prefixVal,
        digitos: digitsVal
      })
    });

    const data = await res.json();
    if (data.status !== 'ok') {
      throw new Error(data.error || 'No se pudo renumerar');
    }

    const r = data.resultado;
    mostrarResultadoModal({
      titulo: '¡Talonario Renumerado con Éxito!',
      archivo: r.archivo,
      secuencia: r.secuencia,
      paginas: r.paginas_procesadas,
      descargaUrl: `/api/secuencia_atl/descargar?archivo=${encodeURIComponent(r.archivo)}`,
      aviso: r.aviso
    });

    // Recargar lista para ver cambios
    await loadSecuenciaDocs();

  } catch (err) {
    alert('Error al renumerar documento: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🚀 Renumerar Talonario Ahora';
    }
  }
}

async function renumerarTodosLote() {
  const startInput = document.getElementById('secuencia-start-num');
  const digitsInput = document.getElementById('secuencia-digits');

  const startVal = parseInt(startInput ? startInput.value : 1, 10) || 1;
  const digitsVal = parseInt(digitsInput ? digitsInput.value : 4, 10) || 4;

  const confirmMsg = `¿Deseas renumerar TODOS los talonarios de la flota comenzando desde el número ${startVal}?\n` +
                     `Cada avión usará su prefijo correspondiente (LOG B-, LOG H-, etc.) con ${digitsVal} dígitos.\n` +
                     `Se creará una copia de seguridad .bak automática para cada uno.`;
  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetch('/api/secuencia_atl/renumerar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        archivo: 'TODOS',
        inicio: startVal,
        digitos: digitsVal
      })
    });

    const data = await res.json();
    if (data.status !== 'ok') {
      throw new Error(data.error || 'Error en proceso en lote');
    }

    let detalleHtml = '<ul style="margin:10px 0; padding-left:20px; line-height:1.6;">';
    (data.resultados || []).forEach(r => {
      detalleHtml += `<li><strong>${r.archivo}</strong>: ${r.secuencia} (${r.paginas_procesadas} págs)</li>`;
    });
    detalleHtml += '</ul>';

    mostrarResultadoModal({
      titulo: '¡Todos los Talonarios Renumerados!',
      contenidoExtra: detalleHtml,
      paginas: (data.resultados || []).reduce((acc, curr) => acc + curr.paginas_procesadas, 0)
    });

    await loadSecuenciaDocs();

  } catch (err) {
    alert('Error al renumerar en lote: ' + err.message);
  }
}

async function abrirCarpetaSequencia(btnElem) {
  const originalText = btnElem ? btnElem.innerHTML : null;
  if (btnElem) {
    btnElem.innerHTML = '⏳ Abriendo...';
    btnElem.disabled = true;
  }

  try {
    const res = await fetch('/api/secuencia_atl/abrir_carpeta', { method: 'POST' });
    const data = await res.json();
    if (data.status === 'ok') {
      if (btnElem) {
        btnElem.innerHTML = '✅ Carpeta Abierta';
        setTimeout(() => {
          btnElem.innerHTML = originalText;
          btnElem.disabled = false;
        }, 2200);
      }
    } else {
      throw new Error(data.error || 'No se pudo abrir la carpeta');
    }
  } catch (e) {
    alert("No se pudo abrir automáticamente el Explorador: " + e.message + "\nPuedes acceder manualmente a la carpeta 'Sequencia ATL'.");
    if (btnElem && originalText) {
      btnElem.innerHTML = originalText;
      btnElem.disabled = false;
    }
  }
}

function mostrarResultadoModal({ titulo, archivo, secuencia, paginas, descargaUrl, contenidoExtra, aviso }) {
  const modalOverlay = document.getElementById('secuencia-modal');
  if (!modalOverlay) return;

  const titleElem = document.getElementById('sec-modal-title');
  const bodyElem = document.getElementById('sec-modal-body');

  if (titleElem) titleElem.textContent = titulo;

  let bodyHtml = '';
  if (aviso) {
    bodyHtml += `
      <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; border-radius: 6px; padding: 10px 12px; color: #fbbf24; font-size: 0.88rem; margin-bottom: 12px; line-height: 1.4;">
        ⚠️ <strong>Aviso:</strong> ${aviso}
      </div>`;
  }
  if (archivo) {
    bodyHtml += `
      <div class="sec-modal-info">
        <p><strong>Documento:</strong> ${archivo}</p>
        <p><strong>Nueva Secuencia:</strong> <span class="badge-seq">${secuencia}</span></p>
        <p><strong>Páginas modificadas:</strong> ${paginas} páginas</p>
      </div>`;
  }
  if (contenidoExtra) {
    bodyHtml += contenidoExtra;
  }
  if (descargaUrl) {
    bodyHtml += `
      <div style="margin-top:15px; display:flex; gap:10px; flex-wrap:wrap;">
        <a class="btn btn-primary" href="${descargaUrl}">📥 Descargar Documento Modificado</a>
        <button class="btn btn-secondary" onclick="abrirCarpetaSequencia(this)">📂 Abrir Carpeta en Windows</button>
      </div>`;
  }

  if (bodyElem) bodyElem.innerHTML = bodyHtml;
  modalOverlay.classList.remove('hidden');
}

function cerrarModalSecuencia() {
  const modalOverlay = document.getElementById('secuencia-modal');
  if (modalOverlay) modalOverlay.classList.add('hidden');
}
