// =========================================================
// AUDITOR DE NOMBRES DE DOCUMENTACIÓN (100% SOLO LECTURA)
// =========================================================

let auditorState = {
  currentFolder: 'C:\\Users\\usuario\\IONOS HiDrive\\DOC GCTS',
  data: null,
  activeFilter: 'errors', // 'errors', 'all', 'valid'
  searchQuery: '',
  isLoading: false
};

const DEFAULT_FOLDERS = {
  gcts: 'C:\\Users\\usuario\\IONOS HiDrive\\DOC GCTS',
  gcxo: 'C:\\Users\\usuario\\IONOS HiDrive\\DOC GCXO'
};

function selectPresetFolder(key) {
  const path = DEFAULT_FOLDERS[key];
  if (!path) return;
  const input = document.getElementById('auditor-folder-input');
  if (input) input.value = path;
  auditorState.currentFolder = path;
  
  // Actualizar estado activo en botones rápidos
  document.querySelectorAll('.preset-folder-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-preset-${key}`);
  if (activeBtn) activeBtn.classList.add('active');

  runAuditorScan();
}

async function runAuditorScan() {
  const input = document.getElementById('auditor-folder-input');
  const folder = (input ? input.value : auditorState.currentFolder).trim();
  
  if (!folder) {
    showAuditorToast('⚠️ Debe indicar una ruta de carpeta válida.', 'warning');
    return;
  }

  auditorState.currentFolder = folder;
  auditorState.isLoading = true;
  updateAuditorLoadingState(true);

  try {
    const res = await fetch('/api/auditor/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: folder })
    });

    const result = await res.json();

    if (!res.ok || result.error) {
      showAuditorToast('❌ ' + (result.error || 'Error al auditar carpeta'), 'error');
      renderAuditorEmptyState(result.error || 'No se pudo acceder a la carpeta.');
      return;
    }

    auditorState.data = result;
    renderAuditorDashboard();
    showAuditorToast(`✅ Auditoría completada: ${result.total_files} archivos revisados.`, 'success');
  } catch (err) {
    showAuditorToast('❌ Error de conexión con el servidor', 'error');
    renderAuditorEmptyState('Error de conexión con el servidor.');
  } finally {
    auditorState.isLoading = false;
    updateAuditorLoadingState(false);
  }
}

function updateAuditorLoadingState(loading) {
  const btnScan = document.getElementById('btn-auditor-scan');
  const spinner = document.getElementById('auditor-spinner');
  if (btnScan) {
    btnScan.disabled = loading;
    btnScan.innerHTML = loading 
      ? '<span class="spinner-small"></span> Auditando...' 
      : '<span>🔍</span> <span>Auditar Carpeta</span>';
  }
}

function renderAuditorDashboard() {
  if (!auditorState.data) return;

  const { total_files, valid_count, invalid_count, files } = auditorState.data;

  // Actualizar contadores KPI
  const elTotal = document.getElementById('auditor-kpi-total');
  const elValid = document.getElementById('auditor-kpi-valid');
  const elErrors = document.getElementById('auditor-kpi-errors');
  const navBadge = document.getElementById('nav-badge-auditor');
  const hubAuditorBadge = document.getElementById('hub-auditor-badge');

  if (elTotal) elTotal.textContent = total_files;
  if (elValid) elValid.textContent = valid_count;
  if (elErrors) elErrors.textContent = invalid_count;
  if (navBadge) navBadge.textContent = invalid_count;
  if (hubAuditorBadge) hubAuditorBadge.textContent = invalid_count;

  // Actualizar filtros de pestañas
  const tabErrorsCount = document.getElementById('tab-errors-count');
  const tabAllCount = document.getElementById('tab-all-count');
  const tabValidCount = document.getElementById('tab-valid-count');
  if (tabErrorsCount) tabErrorsCount.textContent = invalid_count;
  if (tabAllCount) tabAllCount.textContent = total_files;
  if (tabValidCount) tabValidCount.textContent = valid_count;

  renderAuditorTable();
}

function setAuditorFilter(filter) {
  auditorState.activeFilter = filter;
  document.querySelectorAll('.auditor-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderAuditorTable();
}

function filterAuditorBySearch(term) {
  auditorState.searchQuery = (term || '').trim().toLowerCase();
  renderAuditorTable();
}

function renderAuditorTable() {
  const tbody = document.getElementById('auditor-table-body');
  const emptyState = document.getElementById('auditor-empty-state');
  const tableContainer = document.getElementById('auditor-table-container');

  if (!tbody || !auditorState.data) return;

  let filtered = auditorState.data.files || [];

  // Filtrado por estado
  if (auditorState.activeFilter === 'errors') {
    filtered = filtered.filter(f => !f.valid);
  } else if (auditorState.activeFilter === 'valid') {
    filtered = filtered.filter(f => f.valid);
  }

  // Filtrado por búsqueda en tiempo real
  if (auditorState.searchQuery) {
    filtered = filtered.filter(f => {
      const name = f.filename.toLowerCase();
      const issues = (f.issues || []).join(' ').toLowerCase();
      const sugg = (f.suggested_name || '').toLowerCase();
      return name.includes(auditorState.searchQuery) || issues.includes(auditorState.searchQuery) || sugg.includes(auditorState.searchQuery);
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) {
      emptyState.classList.remove('hidden');
      if (auditorState.activeFilter === 'errors' && auditorState.data.invalid_count === 0) {
        emptyState.innerHTML = `
          <div class="empty-state-card text-center py-8">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">🎉</div>
            <h3 class="text-xl font-bold text-success mb-2">¡Todos los archivos cumplen el formato oficial!</h3>
            <p class="text-muted">No se ha encontrado ninguna incidencia en esta carpeta.</p>
          </div>
        `;
      } else {
        emptyState.innerHTML = `
          <div class="empty-state-card text-center py-8">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
            <h3 class="text-lg font-semibold text-muted mb-1">No se encontraron archivos con ese criterio</h3>
            <p class="text-xs text-muted">Prueba a cambiar el filtro o el término de búsqueda.</p>
          </div>
        `;
      }
    }
    if (tableContainer) tableContainer.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (tableContainer) tableContainer.classList.remove('hidden');

  auditorState.filteredFiles = filtered;

  tbody.innerHTML = filtered.map((file, idx) => {
    const isError = !file.valid;
    const statusBadge = isError 
      ? '<span class="status-pill status-pill-error">❌ No Conforme</span>' 
      : '<span class="status-pill status-pill-success">✅ Conforme</span>';

    // Lista de incidencias
    let issuesHtml = '';
    if (isError && file.issues && file.issues.length > 0) {
      issuesHtml = file.issues.map(iss => `<span class="issue-tag">⚠️ ${escapeHtml(iss)}</span>`).join(' ');
    } else {
      issuesHtml = '<span class="text-muted text-xs">Formato AAMMDD Matrícula Indicativo correcto</span>';
    }

    // Sugerencia con botón copiar (sin la extensión .pdf para pegar directo tras pulsar F2 en Windows)
    let suggHtml = '';
    const cleanSugg = (file.suggested_name || '').replace(/\.pdf$/i, '').trim();
    if (cleanSugg) {
      suggHtml = `
        <div class="suggestion-box">
          <span class="suggestion-text font-mono">${escapeHtml(cleanSugg)}</span>
          <button class="btn-copy-sugg" onclick="copyAuditorSuggestion('${escapeJs(cleanSugg)}', this)" title="Copiar nombre sugerido al portapapeles (sin .pdf)">
            <span>📋</span>
            <span>Copiar</span>
          </button>
        </div>
      `;
    } else if (isError) {
      suggHtml = '<span class="text-warning text-xs font-mono">Revisar manualmente</span>';
    } else {
      suggHtml = '<span class="text-muted text-xs">—</span>';
    }

    return `
      <tr class="auditor-row ${isError ? 'row-has-error' : 'row-valid'}">
        <td class="text-center font-mono text-muted text-xs">${idx + 1}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="file-name-cell">
            <span class="file-icon">📄</span>
            <span class="file-name-text font-mono font-semibold">${escapeHtml(file.filename)}</span>
          </div>
        </td>
        <td>
          <div class="issues-cell">
            ${issuesHtml}
          </div>
        </td>
        <td>${suggHtml}</td>
        <td class="text-right">
          <button class="btn btn-secondary btn-sm btn-open-explorer" onclick="openFileByIndex(${idx})" title="Abre el Explorador de Windows con este archivo exacto seleccionado para renombrarlo">
            <span class="btn-icon">📂</span>
            <span>Seleccionar en Explorador</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openFileByIndex(idx) {
  if (!auditorState.filteredFiles || !auditorState.filteredFiles[idx]) return;
  const file = auditorState.filteredFiles[idx];
  openFileInExplorer(file.full_path);
}

async function openFileInExplorer(filePath) {
  showAuditorToast('📂 Abriendo en Explorador de Windows...', 'info');
  try {
    const res = await fetch('/api/auditor/abrir_archivo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: filePath })
    });
    const result = await res.json();
    if (result.status === 'ok') {
      showAuditorToast('✨ Archivo seleccionado en el Explorador. Puedes presionar F2 para renombrarlo.', 'success');
    } else {
      showAuditorToast('❌ ' + (result.error || 'No se pudo abrir'), 'error');
    }
  } catch (err) {
    showAuditorToast('❌ Error de comunicación con el sistema', 'error');
  }
}

function copyAuditorSuggestion(text, btnElement) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    if (btnElement) {
      const origHtml = btnElement.innerHTML;
      btnElement.innerHTML = '<span>✅</span> <span>¡Copiado!</span>';
      btnElement.classList.add('copied');
      setTimeout(() => {
        btnElement.innerHTML = origHtml;
        btnElement.classList.remove('copied');
      }, 1500);
    }
    showAuditorToast(`📋 Nombre copiado: "${text}". Listo para pegar con Ctrl+V.`, 'success');
  }).catch(() => {
    showAuditorToast('⚠️ No se pudo copiar automáticamente al portapapeles', 'warning');
  });
}

function renderAuditorEmptyState(message) {
  const tbody = document.getElementById('auditor-table-body');
  const emptyState = document.getElementById('auditor-empty-state');
  const tableContainer = document.getElementById('auditor-table-container');

  if (tbody) tbody.innerHTML = '';
  if (tableContainer) tableContainer.classList.add('hidden');
  if (emptyState) {
    emptyState.classList.remove('hidden');
    emptyState.innerHTML = `
      <div class="empty-state-card text-center py-8">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📁</div>
        <h3 class="text-lg font-semibold text-danger mb-1">${escapeHtml(message)}</h3>
        <p class="text-xs text-muted">Asegúrate de que la ruta exista y que el disco esté conectado.</p>
      </div>
    `;
  }
}

function showAuditorToast(msg, type = 'info') {
  let toast = document.getElementById('auditor-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'auditor-toast';
    toast.className = 'auditor-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `auditor-toast auditor-toast-${type} show`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJs(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

// =========================================================
// GESTIÓN DEL MODAL DE CONFIGURACIÓN DEL AUDITOR
// =========================================================

async function abrirModalConfigAuditor() {
  const modal = document.getElementById('auditor-config-modal');
  if (!modal) return;

  try {
    const res = await fetch('/api/auditor/config');
    const cfg = await res.json();

    const txtMatriculas = document.getElementById('cfg-auditor-matriculas');
    const txtPrefijo = document.getElementById('cfg-auditor-prefijo');
    const selFecha = document.getElementById('cfg-auditor-fecha');
    const chkAuto = document.getElementById('cfg-auditor-autocorregir');

    if (txtMatriculas) txtMatriculas.value = (cfg.matriculas || []).join(', ');
    if (txtPrefijo) txtPrefijo.value = cfg.prefijo_indicativo || 'BTM';
    if (selFecha) selFecha.value = cfg.formato_fecha || 'AAMMDD';
    if (chkAuto) chkAuto.checked = cfg.autocorregir_errata_matricula !== false;

    renderMatriculasChips(cfg.matriculas || []);
  } catch (err) {
    showAuditorToast('⚠️ Error al cargar la configuración existente', 'warning');
  }

  modal.classList.remove('hidden');
}

function cerrarModalConfigAuditor() {
  const modal = document.getElementById('auditor-config-modal');
  if (modal) modal.classList.add('hidden');
}

function renderMatriculasChips(list) {
  const container = document.getElementById('cfg-matriculas-chips');
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = '<span class="text-xs text-muted">Sin matrículas añadidas</span>';
    return;
  }

  container.innerHTML = list.map(m => `
    <span class="badge-tech badge-local" style="font-size: 0.8rem; padding: 0.2rem 0.5rem;">
      ✈️ ${escapeHtml(m)}
    </span>
  `).join('');
}

function restaurarConfigAuditorDefault() {
  const defaults = ["ECNNA", "ECNNE", "ECNME", "ECNNX", "ECOKM", "ECOMS", "ECOKC"];
  const txtMatriculas = document.getElementById('cfg-auditor-matriculas');
  const txtPrefijo = document.getElementById('cfg-auditor-prefijo');
  const selFecha = document.getElementById('cfg-auditor-fecha');
  const chkAuto = document.getElementById('cfg-auditor-autocorregir');

  if (txtMatriculas) txtMatriculas.value = defaults.join(', ');
  if (txtPrefijo) txtPrefijo.value = 'BTM';
  if (selFecha) selFecha.value = 'AAMMDD';
  if (chkAuto) chkAuto.checked = true;

  renderMatriculasChips(defaults);
  showAuditorToast('↺ Valores por defecto restablecidos en el formulario.', 'info');
}

async function guardarConfigAuditor() {
  const txtMatriculas = document.getElementById('cfg-auditor-matriculas');
  const txtPrefijo = document.getElementById('cfg-auditor-prefijo');
  const selFecha = document.getElementById('cfg-auditor-fecha');
  const chkAuto = document.getElementById('cfg-auditor-autocorregir');

  const rawText = txtMatriculas ? txtMatriculas.value : '';
  const regs = rawText
    .split(/[,;\s]+/)
    .map(r => r.trim().toUpperCase().replace(/-/g, ''))
    .filter(r => r.length > 0);

  const payload = {
    matriculas: regs,
    prefijo_indicativo: (txtPrefijo ? txtPrefijo.value.trim().toUpperCase() : 'BTM') || 'BTM',
    formato_fecha: selFecha ? selFecha.value : 'AAMMDD',
    extension_esperada: '.pdf',
    autocorregir_errata_matricula: chkAuto ? chkAuto.checked : true
  };

  try {
    const res = await fetch('/api/auditor/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (res.ok && result.status === 'ok') {
      showAuditorToast('💾 Configuración guardada correctamente.', 'success');
      cerrarModalConfigAuditor();
      // Re-auditar de inmediato con la nueva configuración
      runAuditorScan();
    } else {
      showAuditorToast('❌ ' + (result.error || 'Error al guardar'), 'error');
    }
  } catch (err) {
    showAuditorToast('❌ Error de comunicación al guardar la configuración', 'error');
  }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('auditor-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterAuditorBySearch(e.target.value);
    });
  }

  const txtMatriculas = document.getElementById('cfg-auditor-matriculas');
  if (txtMatriculas) {
    txtMatriculas.addEventListener('input', (e) => {
      const regs = e.target.value
        .split(/[,;\s]+/)
        .map(r => r.trim().toUpperCase().replace(/-/g, ''))
        .filter(r => r.length > 0);
      renderMatriculasChips(regs);
    });
  }
});

