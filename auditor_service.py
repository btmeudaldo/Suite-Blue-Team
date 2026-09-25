"""
auditor_service.py - Servicio de auditoría y validación de nombres de archivos de documentación de vuelo.
REGLA DE SEGURIDAD CRÍTICA: ESTE MÓDULO ES 100% DE SOLO LECTURA.
Bajo ninguna circunstancia modifica, renombra o borra archivos del disco.
"""

import os
import re
import json
import datetime
import subprocess

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config_auditor.json")

DEFAULT_CONFIG = {
    "matriculas": ["ECNNA", "ECNNE", "ECNME", "ECNNX", "ECOKM", "ECOMS", "ECOKC"],
    "prefijo_indicativo": "BTM",
    "formato_fecha": "AAMMDD",
    "extension_esperada": ".pdf",
    "autocorregir_errata_matricula": True
}

def load_auditor_config():
    """Carga la configuración desde config_auditor.json o devuelve valores por defecto."""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Asegurar mayúsculas y lista limpia
                data["matriculas"] = [m.upper().strip().replace("-", "") for m in data.get("matriculas", []) if m.strip()]
                return data
        except Exception:
            pass
    return DEFAULT_CONFIG.copy()

def save_auditor_config(new_config):
    """Guarda la configuración actualizada en config_auditor.json."""
    if not isinstance(new_config, dict):
        raise ValueError("La configuración debe ser un objeto JSON")
    
    # Limpiar y normalizar matrículas
    raw_regs = new_config.get("matriculas", [])
    if isinstance(raw_regs, str):
        # Si vino como string separado por comas o saltos de línea
        regs = [r.upper().strip().replace("-", "") for r in re.split(r'[,;\s]+', raw_regs) if r.strip()]
    else:
        regs = [str(r).upper().strip().replace("-", "") for r in raw_regs if str(r).strip()]
    
    # Mantener matrículas únicas conservando orden
    seen = set()
    clean_regs = []
    for r in regs:
        if r not in seen:
            seen.add(r)
            clean_regs.append(r)

    cfg_to_save = {
        "matriculas": clean_regs or DEFAULT_CONFIG["matriculas"],
        "prefijo_indicativo": str(new_config.get("prefijo_indicativo", "BTM")).strip().upper() or "BTM",
        "formato_fecha": str(new_config.get("formato_fecha", "AAMMDD")).strip().upper() or "AAMMDD",
        "extension_esperada": str(new_config.get("extension_esperada", ".pdf")).strip().lower() or ".pdf",
        "autocorregir_errata_matricula": bool(new_config.get("autocorregir_errata_matricula", True))
    }

    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg_to_save, f, indent=2, ensure_ascii=False)
    return cfg_to_save

def find_closest_registration(candidate: str, valid_list: list):
    """Calcula la distancia de Levenshtein para encontrar la matrícula más cercana."""
    c = candidate.upper().strip().replace("-", "")
    if not valid_list:
        return candidate, 999
    if c in valid_list:
        return c, 0

    def lev(s1, s2):
        if len(s1) < len(s2):
            return lev(s2, s1)
        if len(s2) == 0:
            return len(s1)
        prev = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            curr = [i + 1]
            for j, c2 in enumerate(s2):
                ins = prev[j + 1] + 1
                dels = curr[j] + 1
                subs = prev[j] + (c1 != c2)
                curr.append(min(ins, dels, subs))
            prev = curr
        return prev[-1]

    best_match = None
    min_dist = 999
    for v in valid_list:
        d = lev(c, v)
        if d < min_dist:
            min_dist = d
            best_match = v
    return best_match, min_dist

def audit_filename(filename: str, config: dict = None):
    """
    Analiza el nombre de un archivo frente al estándar oficial:
    AAMMDD MATRICULA INDICATIVO(S).pdf
    
    Retorna: (es_valido, lista_de_incidencias, nombre_sugerido, componentes)
    """
    if config is None:
        config = load_auditor_config()

    valid_matriculas = config.get("matriculas", DEFAULT_CONFIG["matriculas"])
    prefix_indicativo = config.get("prefijo_indicativo", "BTM").upper()
    auto_fix_reg = config.get("autocorregir_errata_matricula", True)
    issues = []
    suggested = None
    components = {
        "raw_date": None,
        "clean_date": None,
        "registration": None,
        "callsigns": []
    }
    
    # 1. Extensión
    base, ext = os.path.splitext(filename)
    if ext.lower() != '.pdf':
        issues.append(f"Extensión no es PDF ({ext or 'sin extensión'})")
    
    # Espacio en blanco antes de la extensión (ej: '260428 ECNNA BTM25N .pdf')
    if base.endswith(' '):
        issues.append("Espacio en blanco sobrante antes de la extensión (.pdf)")
        base = base.rstrip()
    
    # Doble espacio dentro del nombre
    if '  ' in base:
        issues.append("Contiene espacios dobles o múltiples")
        clean_base = re.sub(r'\s+', ' ', base).strip()
    else:
        clean_base = base.strip()

    # Comprobar caso especial 1: Todo el archivo pegado sin espacios (ej: '260515ECNMEBTM15MS')
    m_all_stuck = re.match(r'^(\d{6})([A-Za-z0-9]+)$', clean_base)
    if m_all_stuck:
        issues.append("Faltan espacios separadores (nombre completamente continuo)")
        raw_d = m_all_stuck.group(1)
        rest = m_all_stuck.group(2)
        components["raw_date"] = raw_d
        components["clean_date"] = raw_d
        
        m_reg = re.match(r'^(EC[A-Z0-9]{3})(.*)$', rest, re.IGNORECASE)
        if m_reg:
            reg_found = m_reg.group(1).upper()
            calls_found = m_reg.group(2).strip().upper()
            components["registration"] = reg_found
            if calls_found:
                components["callsigns"] = [calls_found]
                suggested = f"{raw_d} {reg_found} {calls_found}"
            return len(issues) == 0, issues, suggested, components

    # Comprobar caso especial 2: Fecha pegada a la matrícula pero con espacio tras matrícula
    # Ej: '260501ECNNX BTM35FS'
    m_date_stuck_reg = re.match(r'^(\d{6})(EC[A-Z0-9]{3})\s+(.*)$', clean_base, re.IGNORECASE)
    if m_date_stuck_reg:
        issues.append("Falta espacio entre la fecha y la matrícula")
        raw_d = m_date_stuck_reg.group(1)
        reg_c = m_date_stuck_reg.group(2).upper()
        rest_c = m_date_stuck_reg.group(3).strip()
        components["raw_date"] = raw_d
        components["clean_date"] = raw_d
        components["registration"] = reg_c
        components["callsigns"] = [c.upper() for c in rest_c.split()]
        suggested = f"{raw_d} {reg_c} {rest_c}"
        return len(issues) == 0, issues, suggested, components

    parts = clean_base.split(' ')
    date_part = None
    reg_part = None
    callsigns = []

    # 2. Análisis de Fecha (Primer bloque)
    if len(parts) >= 1:
        raw_date = parts[0]
        components["raw_date"] = raw_date
        
        # Fecha de 6 dígitos continuos (AAMMDD)
        if re.match(r'^\d{6}$', raw_date):
            yy = int(raw_date[0:2])
            mm = int(raw_date[2:4])
            dd = int(raw_date[4:6])
            
            if not (1 <= mm <= 12):
                issues.append(f"Mes inválido en fecha ({mm:02d})")
            elif not (1 <= dd <= 31):
                issues.append(f"Día inválido en fecha ({dd:02d})")
            else:
                try:
                    # Validar coherencia de calendario (ej: días de cada mes, bisiestos)
                    year_full = 2000 + yy
                    datetime.date(year_full, mm, dd)
                    date_part = raw_date
                    components["clean_date"] = date_part
                except ValueError:
                    issues.append(f"Fecha no válida en el calendario ({raw_date})")
        # Fecha con guiones (AA-MM-DD)
        elif re.match(r'^\d{2}-\d{2}-\d{2}$', raw_date):
            issues.append("Fecha con guiones (debe ser formato AAMMDD sin guiones)")
            date_part = raw_date.replace('-', '')
            components["clean_date"] = date_part
        else:
            issues.append(f"Formato de fecha no reconocido ('{raw_date}')")

    # 3. Análisis de Matrícula e Indicativos
    if len(parts) >= 2:
        p1 = parts[1].upper()
        
        # Caso A: El segundo elemento es un indicativo (BTM... o BTN...) -> Orden invertido
        if p1.startswith('BTM') or p1.startswith('BTN'):
            issues.append(f"Orden invertido: el indicativo ({parts[1]}) está antes de la matrícula")
            # Buscar en las partes restantes cuál es la matrícula
            found_reg_idx = -1
            for i in range(2, len(parts)):
                cand = parts[i].upper()
                if cand.startswith('EC') or cand.startswith('EX') or len(cand) == 5:
                    found_reg_idx = i
                    reg_part = cand
                    break
            
            if found_reg_idx != -1:
                # El resto son indicativos
                callsigns = [parts[k].upper() for k in range(1, len(parts)) if k != found_reg_idx]
            else:
                callsigns = [parts[k].upper() for k in range(1, len(parts))]
        
        # Caso B: Matrícula con guion (ej: 'EC-NNX')
        elif p1.startswith('EC-'):
            reg_clean = p1.replace('-', '')
            issues.append(f"Matrícula con guion ({p1}, el estándar es sin guion: {reg_clean})")
            reg_part = reg_clean
            callsigns = [p.upper() for p in parts[2:]]
            
        # Caso C: Matrícula estándar de 5 caracteres o candidata
        elif re.match(r'^(?:EC)?[A-Z0-9]{3,5}$', p1):
            reg_part = p1
            callsigns = [p.upper() for p in parts[2:]]
            
        # Caso D: Matrícula pegada a un indicativo (ej: 'ECNMEBTM10MS')
        elif re.match(r'^(EC[A-Z0-9]{3})(' + prefix_indicativo + r'.*)$', p1):
            m_join = re.match(r'^(EC[A-Z0-9]{3})(' + prefix_indicativo + r'.*)$', p1)
            issues.append("Falta espacio entre la matrícula y el indicativo")
            reg_part = m_join.group(1)
            callsigns = [m_join.group(2)] + [p.upper() for p in parts[2:]]
            
        else:
            issues.append(f"Matrícula no reconocida o no estándar ('{parts[1]}')")
            reg_part = p1
            callsigns = [p.upper() for p in parts[2:]]

    # Comprobación de Matrícula contra la Flota Configurada
    if reg_part:
        clean_reg = reg_part.upper().replace('-', '')
        if clean_reg in valid_matriculas:
            reg_part = clean_reg
        else:
            closest, dist = find_closest_registration(clean_reg, valid_matriculas)
            if dist == 1 or (len(clean_reg) == 4 and dist <= 1):
                issues.append(f"Errata en matrícula ('{reg_part}', corregida a '{closest}')")
                if auto_fix_reg:
                    reg_part = closest
            elif dist == 2 and len(clean_reg) == 5:
                issues.append(f"Matrícula sospechosa ('{reg_part}', posible errata de '{closest}')")
                if auto_fix_reg:
                    reg_part = closest
            else:
                issues.append(f"Matrícula '{reg_part}' no coincide con la flota configurada ({', '.join(valid_matriculas)})")

    # 4. Validación y Descomposición Inteligente de Indicativos
    fixed_callsigns = []
    callsign_strict_pattern = re.compile(r'^BTM\d+[A-Z]+$')

    for c in callsigns:
        c_clean = c.strip()
        
        # Limpiar sufijo de duplicado de Windows si existe: (1), (2), etc.
        if '(1)' in c_clean or '(2)' in c_clean:
            issues.append(f"Nombre duplicado con sufijo de Windows ('{c}')")
            c_clean = re.sub(r'\(\d+\)', '', c_clean).strip()

        # Caso A: Errata tipográfica inicial (BTN en vez de BTM)
        if c_clean.startswith('BTN'):
            issues.append(f"Errata tipográfica en indicativo ('{c}', debe empezar por BTM)")
            c_clean = 'BTM' + c_clean[3:]

        # Caso B: Rango abreviado con guiones y sufijo final (ej: BTM63-64-65-66K)
        m_range = re.match(r'^BTM(\d+(?:-\d+)+)([A-Z]+)$', c_clean)
        if m_range:
            issues.append(f"Indicativo con rango abreviado de vuelos con guiones ('{c}')")
            nums = m_range.group(1).split('-')
            suffix = m_range.group(2)
            for n in nums:
                fixed_callsigns.append(f"BTM{n}{suffix}")
            continue

        # Caso C: Múltiples indicativos completos unidos por guiones (ej: BTM41C-BTM42C-BTM45C-BTM46C)
        if '-' in c_clean and 'BTM' in c_clean:
            subparts = c_clean.split('-')
            if all(re.match(r'^(BTM)?\d+[A-Z]+$', sp) for sp in subparts):
                issues.append(f"Indicativos unidos por guiones en vez de espacios ('{c}')")
                for sp in subparts:
                    if not sp.startswith('BTM'):
                        fixed_callsigns.append('BTM' + sp)
                    else:
                        fixed_callsigns.append(sp)
                continue

        # Caso D: Indicativos pegados sin espacio (ej: BTM35F36F)
        m_glued = re.findall(r'(?:BTM)?\d+[A-Z]+', c_clean)
        if len(m_glued) > 1:
            issues.append(f"Indicativos pegados sin espacio ('{c}')")
            for g in m_glued:
                if not g.startswith('BTM'):
                    fixed_callsigns.append('BTM' + g)
                else:
                    fixed_callsigns.append(g)
            continue

        # Caso E: Uso de guion bajo (ej: BTM61K_65K)
        if '_' in c_clean:
            issues.append(f"Uso de guion bajo en indicativo ('{c}')")
            subparts = c_clean.split('_')
            for sp in subparts:
                if sp and not sp.startswith('BTM'):
                    fixed_callsigns.append('BTM' + sp)
                elif sp:
                    fixed_callsigns.append(sp)
            continue

        # Caso F: Letra extra entre BTM y dígitos (ej: BTMA34F -> BTM34F)
        m_extra_letter = re.match(r'^BTM[A-Z](\d+[A-Z]+)$', c_clean)
        if m_extra_letter:
            issues.append(f"Carácter extraño o errata en indicativo ('{c}')")
            fixed_callsigns.append('BTM' + m_extra_letter.group(1))
            continue

        # Caso G: Comprobación estricta de formato individual BTM<número><letras>
        if not callsign_strict_pattern.match(c_clean):
            issues.append(f"Formato de indicativo no estándar ('{c}', debe ser BTM<número><letras>)")

        fixed_callsigns.append(c_clean)

    if not callsigns:
        issues.append("Falta el indicativo de vuelo (ej: BTM15M)")

    components["registration"] = reg_part
    components["callsigns"] = fixed_callsigns

    # 5. Generar Nombre Sugerido si tenemos los elementos básicos
    if date_part and reg_part and fixed_callsigns and not suggested:
        calls_str = ' '.join(fixed_callsigns)
        suggested = f"{date_part} {reg_part} {calls_str}"

    is_valid = len(issues) == 0
    return is_valid, issues, suggested, components


def scan_directory(folder_path: str, ignore_subdirs: bool = True):
    """
    Escanea la carpeta en MODO DE ESTRICTA SOLO LECTURA.
    Retorna el informe completo con estadísticas y detalles por archivo.
    """
    if not os.path.exists(folder_path):
        return {
            "error": f"La carpeta no existe: {folder_path}",
            "status": "error"
        }
        
    if not os.path.isdir(folder_path):
        return {
            "error": f"La ruta indicada no es un directorio: {folder_path}",
            "status": "error"
        }

    norm_folder = os.path.normpath(folder_path)
    file_records = []
    total_files = 0
    valid_count = 0
    invalid_count = 0
    config = load_auditor_config()

    try:
        entries = sorted(os.listdir(norm_folder))
    except Exception as e:
        return {
            "error": f"Error al leer la carpeta: {str(e)}",
            "status": "error"
        }

    for entry in entries:
        full_path = os.path.join(norm_folder, entry)
        
        # Ignorar directorios si ignore_subdirs es True (y siempre ignorar ATLs o PARTES)
        if os.path.isdir(full_path):
            continue
            
        # Solo auditar archivos regulares
        if not os.path.isfile(full_path):
            continue

        # Ignorar archivos temporales o de sistema
        if entry.startswith('~$') or entry.startswith('.') or entry.endswith('.tmp'):
            continue

        total_files += 1
        is_valid, issues, suggested, components = audit_filename(entry, config=config)
        
        if is_valid:
            valid_count += 1
        else:
            invalid_count += 1

        try:
            stat = os.stat(full_path)
            size_kb = round(stat.st_size / 1024, 1)
            size_str = f"{size_kb} KB"
            mtime = datetime.datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M")
        except Exception:
            size_str = "N/A"
            mtime = ""

        file_records.append({
            "filename": entry,
            "full_path": full_path,
            "valid": is_valid,
            "status": "ok" if is_valid else "error",
            "issues": issues,
            "suggested_name": suggested,
            "components": components,
            "size": size_str,
            "modified": mtime
        })

    return {
        "status": "ok",
        "folder": norm_folder,
        "total_files": total_files,
        "valid_count": valid_count,
        "invalid_count": invalid_count,
        "config": config,
        "files": file_records
    }


def open_file_in_explorer(file_path: str):
    """
    Abre el Explorador de Windows y asegura que el archivo exacto quede
    SELECCIONADO, RESALTADO Y CON FOCO (listo para pulsar F2).
    100% SEGURO: No modifica ni renombra el archivo.
    """
    norm_path = os.path.normpath(file_path)
    if not os.path.exists(norm_path):
        return {"status": "error", "error": f"El archivo no existe: {norm_path}"}

    folder = os.path.dirname(norm_path)
    filename = os.path.basename(norm_path)

    # PowerShell con Shell.Application:
    # 1. Si la ventana de la carpeta ya está abierta, localiza el archivo y llama a SelectItem(29):
    #    (29 = SVSI_SELECT | SVSI_DESELECTOTHERS | SVSI_ENSUREVISIBLE | SVSI_FOCUSED).
    # 2. Si no está abierta, lanza explorer.exe /select y luego aplica SelectItem con foco.
    ps_script = f"""
$folderPath = '{folder.replace("'", "''")}'
$fileName = '{filename.replace("'", "''")}'
$fullPath = '{norm_path.replace("'", "''")}'

$shell = New-Object -ComObject Shell.Application
$selected = $false

foreach ($w in $shell.Windows()) {{
    try {{
        if ($w.Document -and $w.Document.Folder) {{
            if ($w.Document.Folder.Self.Path -eq $folderPath) {{
                $item = $w.Document.Folder.ParseName($fileName)
                if ($item) {{
                    $w.Document.SelectItem($item, 29)
                    $selected = $true
                    break
                }}
            }}
        }}
    }} catch {{}}
}}

if (-not $selected) {{
    Start-Process explorer.exe -ArgumentList "/select,`"$fullPath`""
    Start-Sleep -Milliseconds 450
    foreach ($w in $shell.Windows()) {{
        try {{
            if ($w.Document -and $w.Document.Folder) {{
                if ($w.Document.Folder.Self.Path -eq $folderPath) {{
                    $item = $w.Document.Folder.ParseName($fileName)
                    if ($item) {{
                        $w.Document.SelectItem($item, 29)
                        break
                    }}
                }}
            }}
        }} catch {{}}
    }}
}}
"""
    try:
        creation_flags = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)
        subprocess.Popen(
            ["powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command", ps_script],
            creationflags=creation_flags
        )
        return {"status": "ok", "opened": True, "selected": True, "path": norm_path}
    except Exception as e:
        try:
            cmd = f'explorer.exe /select,"{norm_path}"'
            subprocess.Popen(cmd)
            return {"status": "ok", "opened": True, "path": norm_path}
        except Exception as e2:
            return {"status": "error", "error": str(e2)}
