import os
import sys
import json
import urllib.parse
import base64
from http.server import HTTPServer, BaseHTTPRequestHandler
import pymupdf
from PIL import Image, ImageDraw
from dotenv import load_dotenv

# Cargar API key de Gemini
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
api_key = os.getenv("GEMINI_API_KEY", "").strip()

from google import genai
from google.genai import types

client = genai.Client(api_key=api_key) if api_key else None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIVIDIDOS_DIR = os.path.join(BASE_DIR, "Examenes_Divididos")
THUMB_DIR = os.path.join(BASE_DIR, "thumbnails")
RENOMBRADOS_DIR = os.path.join(BASE_DIR, "Examenes_Renombrados")
ORIGINALES_DIR = os.path.join(BASE_DIR, "Escaneos_Originales")
HISTORICO_DIR = os.path.join(BASE_DIR, "Historico_Convocatorias")
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
STATE_FILE = os.path.join(BASE_DIR, "estado_examenes.json")

# Directorios específicos para partes de vuelo (ATL / FSTD Logs)
ATL_DIVIDIDOS_DIR = os.path.join(BASE_DIR, "ATL_Divididos")
ATL_THUMB_DIR = os.path.join(BASE_DIR, "thumbnails_atl")
ATL_RENOMBRADOS_DIR = os.path.join(BASE_DIR, "ATL_Renombrados")
ATL_ORIGINALES_DIR = os.path.join(BASE_DIR, "ATL_Originales")
ATL_STATE_FILE = os.path.join(BASE_DIR, "estado_atl.json")
ATL_FLOTA_FILE = os.path.join(BASE_DIR, "flota_atl.json")

os.makedirs(DIVIDIDOS_DIR, exist_ok=True)
os.makedirs(THUMB_DIR, exist_ok=True)
os.makedirs(RENOMBRADOS_DIR, exist_ok=True)
os.makedirs(ORIGINALES_DIR, exist_ok=True)
os.makedirs(HISTORICO_DIR, exist_ok=True)
os.makedirs(PUBLIC_DIR, exist_ok=True)

os.makedirs(ATL_DIVIDIDOS_DIR, exist_ok=True)
os.makedirs(ATL_THUMB_DIR, exist_ok=True)
os.makedirs(ATL_RENOMBRADOS_DIR, exist_ok=True)
os.makedirs(ATL_ORIGINALES_DIR, exist_ok=True)

# Mapeo oficial de materias EASA para aviación
EASA_MAP = {
    "FPM": ("FPM", "033"),
    "FLIGHT PLANNING": ("FPM", "033"),
    "FLIGHT PLANNING AND MONITORING": ("FPM", "033"),
    "MET": ("MET", "050"),
    "METEOROLOGY": ("MET", "050"),
    "METEOROLOGIA": ("MET", "050"),
    "GNAV": ("GNAV", "061"),
    "GENERAL NAVIGATION": ("GNAV", "061"),
    "NAVEGACION GENERAL": ("GNAV", "061"),
    "ALW": ("ALW", "010"),
    "AIR LAW": ("ALW", "010"),
    "AGK": ("AGK", "021"),
    "INS": ("INS", "022"),
    "M&B": ("M&B", "031"),
    "PERF": ("PERF", "032"),
    "HPL": ("HPL", "040"),
    "RNAV": ("RNAV", "062"),
    "OPS": ("OPS", "070"),
    "POF": ("POF", "081"),
    "COMM": ("COMM", "090"),
    "PPL": ("PPL", "100")
}

MATERIAS_RULES = [
    (r'AIR\s*LAW|ALW|LEGISLACI[OÓ]N|DERECHO', 'ALW', '010'),
    (r'AGK|AIRCRAFT\s*GENERAL|CONOCIMIENTO\s*GENERAL', 'AGK', '021'),
    (r'INS(?:TRUMENTOS|TRUMENTATION)?', 'INS', '022'),
    (r'M\s*&\s*B|M\s*AND\s*B|MB|MASS\s*(?:&|AND)\s*BALANCE|PESO\s*Y\s*(?:BALANCE|CENTRADO)', 'M&B', '031'),
    (r'PERF(?:ORMANCE|ORMANCES|ACTUACIONES)?', 'PERF', '032'),
    (r'FPM|FLIGHT\s*PLANNING|PLANIFICACI[OÓ]N', 'FPM', '033'),
    (r'HPL|HUMAN\s*PERFORMANCE|FACTORES\s*HUMANOS', 'HPL', '040'),
    (r'MET(?:EOROLOGY|EOROLOGIA|EOROLOG[IÍ]A)?', 'MET', '050'),
    (r'GNAV|GENERAL\s*NAVIGATION|NAVEGACI[OÓ]N\s*GENERAL', 'GNAV', '061'),
    (r'RNAV|RADIO\s*NAVIGATION|RADIO\s*NAVEGACI[OÓ]N|RADIONAVEGACI[OÓ]N', 'RNAV', '062'),
    (r'OPS|OPERATIONAL\s*PROCEDURES|PROCEDIMIENTOS', 'OPS', '070'),
    (r'POF|PRINCIPLES\s*OF\s*FLIGHT|PRINCIPIOS\s*DE\s*VUELO', 'POF', '081'),
    (r'COMM(?:UNICATIONS|UNICACIONES)?|COMUNICACI[OÓ]N', 'COMM', '090'),
    (r'PPL', 'PPL', '100')
]

import re

def extraer_materia_y_examen(filename):
    """Extrae automáticamente la asignatura y el número de examen del nombre del archivo si existen."""
    clean = os.path.basename(filename).replace(".pdf", "")
    asig, cod = "", ""
    for pattern, s, c in MATERIAS_RULES:
        regex = r'(?:^|[^A-Za-z])(?:' + pattern + r')(?=[^A-Za-z]|$)'
        if re.search(regex, clean, re.IGNORECASE):
            asig, cod = s, c
            break
            
    num_ex = ""
    m_ex = re.search(r'(?:^|[^A-Z0-9])EX[-_ ]?0*(\d{1,2})(?:[^A-Z0-9]|$)', clean, re.IGNORECASE)
    if m_ex:
        num_ex = m_ex.group(1)
        
    return asig, cod, num_ex


def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_state(state):
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)

def get_next_session():
    """Calcula el número de la siguiente sesión consecutiva buscando subcarpetas numéricas en Examenes_Renombrados y estado_examenes."""
    nums = []
    if os.path.exists(RENOMBRADOS_DIR):
        nums.extend([int(d) for d in os.listdir(RENOMBRADOS_DIR) if os.path.isdir(os.path.join(RENOMBRADOS_DIR, d)) and d.isdigit()])
    state = load_state()
    for item in state.values():
        ses = str(item.get("sesion", "")).strip()
        if ses.isdigit():
            nums.append(int(ses))
    return str(max(nums) + 1) if nums else "1"

def get_or_create_thumbnail(pdf_filename):
    """Genera la imagen de la cabecera recortada y saneada (sin nota ni firmas)."""
    thumb_name = pdf_filename.replace(".pdf", ".png")
    thumb_path = os.path.join(THUMB_DIR, thumb_name)
    if os.path.exists(thumb_path):
        return thumb_path
        
    pdf_path = os.path.join(DIVIDIDOS_DIR, pdf_filename)
    if not os.path.exists(pdf_path):
        return None
        
    try:
        doc = pymupdf.open(pdf_path)
        page = doc[0]
        rect = page.rect
        # Tomar unicamente la cabecera exacta cortando antes de las preguntas del test
        header_rect = pymupdf.Rect(0, 0, rect.width, rect.height * 0.185)
        pix = page.get_pixmap(clip=header_rect, dpi=200)
        
        # Guardar directamente la cabecera completa y nítida
        pix.save(thumb_path)
        doc.close()
        return thumb_path
    except Exception as e:
        print(f"Error generando thumbnail para {pdf_filename}: {e}")
        return None

# ==========================================
# UTILIDADES PARA ATL (AIRCRAFT / FSTD LOGS)
# ==========================================

DEFAULT_ATL_FLOTA = [
    "ES-3A-099",
    "ES-1A-099",
    "EC-KSM",
    "EC-JZZ",
    "EC-LYB",
    "EC-MDO",
    "EC-NAD"
]

def load_atl_flota():
    if os.path.exists(ATL_FLOTA_FILE):
        try:
            with open(ATL_FLOTA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and data:
                    return data
        except Exception:
            pass
    return list(DEFAULT_ATL_FLOTA)

def save_atl_flota(flota):
    with open(ATL_FLOTA_FILE, "w", encoding="utf-8") as f:
        json.dump(flota, f, indent=2, ensure_ascii=False)

def load_atl_state():
    if os.path.exists(ATL_STATE_FILE):
        try:
            with open(ATL_STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_atl_state(state):
    with open(ATL_STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)

def formatear_nombre_atl(fecha, avion, log_numero):
    """
    Formato: [FECHA] [SIMULADOR/AVION] [LOGXXXX].pdf
    Ejemplo: 260722 ES-3A-099 LOG0320.pdf
    """
    f = (fecha or "").strip()
    a = (avion or "").strip().upper()
    l = (log_numero or "").strip().upper()

    if l and not l.startswith("LOG") and l.isdigit():
        l = f"LOG{l.zfill(4)}"
    elif l.startswith("LOG") and len(l) > 3:
        num_part = l[3:].strip()
        if num_part.isdigit():
            l = f"LOG{num_part.zfill(4)}"

    f_disp = f if f else "FECHA"
    a_disp = a if a else "AVION"
    l_disp = l if l else "LOG"

    # Sanitizar caracteres no permitidos en nombres de archivo
    safe_name = f"{f_disp} {a_disp} {l_disp}.pdf"
    for ch in ['<', '>', ':', '"', '/', '\\', '|', '?', '*']:
        safe_name = safe_name.replace(ch, '_')
    return safe_name

def get_or_create_atl_thumbnail(pdf_filename):
    """Genera una imagen en alta definición de la cabecera del ATL (donde está el LOG, Fecha y Avión)."""
    thumb_name = pdf_filename.replace(".pdf", ".png")
    thumb_path = os.path.join(ATL_THUMB_DIR, thumb_name)
    if os.path.exists(thumb_path):
        return thumb_path

    pdf_path = os.path.join(ATL_DIVIDIDOS_DIR, pdf_filename)
    if not os.path.exists(pdf_path):
        return None

    try:
        doc = pymupdf.open(pdf_path)
        page = doc[0]
        rect = page.rect
        # Tomar la cabecera superior (30% superior) con buena resolución para lectura clara
        header_rect = pymupdf.Rect(0, 0, rect.width, rect.height * 0.30)
        pix = page.get_pixmap(clip=header_rect, dpi=180)
        pix.save(thumb_path)
        doc.close()
        return thumb_path
    except Exception as e:
        print(f"Error generando thumbnail ATL para {pdf_filename}: {e}")
        return None

def extraer_datos_locales_atl(pdf_path):
    """
    Extracción local directa 100% sin IA mediante PyMuPDF y expresiones regulares.
    Lee texto si el PDF viene con texto digital; si es imagen escaneada devuelve campos vacíos para entrada manual asistida.
    """
    resultado = {
        "fecha": "",
        "avion": "",
        "log_numero": ""
    }
    try:
        doc = pymupdf.open(pdf_path)
        if len(doc) > 0:
            text = doc[0].get_text()
            if text and len(text.strip()) > 5:
                # 1. Buscar número de log (ej: LOG 0320, LOG0320, LOG: 0320)
                m_log = re.search(r'LOG\s*(?:N[º°.]?)?\s*([0-9]{3,5})', text, re.IGNORECASE)
                if m_log:
                    num = m_log.group(1).zfill(4)
                    resultado["log_numero"] = f"LOG{num}"

                # 2. Buscar aeronave o simulador (ej: ES-3A-099, ES-1A-099, EC-KSM)
                m_avion = re.search(r'\b(ES-[0-9A-Z]{1,2}-[0-9A-Z]{2,4}|EC-[0-9A-Z]{3,4})\b', text, re.IGNORECASE)
                if m_avion:
                    resultado["avion"] = m_avion.group(1).upper()
                elif "ENTROL" in text.upper():
                    resultado["avion"] = "ES-3A-099"

                # 3. Buscar fecha si viene mecanografiada en texto
                m_fecha = re.search(r'DATE:?\s*(\d{2})[./\-](\d{2})[./\-](\d{2,4})', text, re.IGNORECASE)
                if m_fecha:
                    d, m, y = m_fecha.group(1), m_fecha.group(2), m_fecha.group(3)
                    y = y[-2:]
                    resultado["fecha"] = f"{y}{m}{d}"
        doc.close()
    except Exception as e:
        print(f"Error extrayendo datos locales ATL de {pdf_path}: {e}")
    return resultado

ASIGNATURAS_FILE = os.path.join(BASE_DIR, "asignaturas_atpl.json")
def load_asignaturas():
    if os.path.exists(ASIGNATURAS_FILE):
        try:
            with open(ASIGNATURAS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []

ASIGNATURAS_OFICIALES = load_asignaturas()

def quitar_tildes(texto):
    if not texto:
        return ""
    trans = str.maketrans(
        "ÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛáàäâéèëêíìïîóòöôúùüû",
        "AAAAEEEEIIIIOOOOUUUUAAAAEEEEIIIIOOOOUUUU"
    )
    return texto.translate(trans)

ALUMNOS_FILE = os.path.join(BASE_DIR, "alumnos_activos.json")
def load_alumnos():
    if os.path.exists(ALUMNOS_FILE):
        try:
            with open(ALUMNOS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [quitar_tildes(a.strip().upper()) for a in data if isinstance(a, str) and a.strip()]
        except Exception:
            pass
    return []

ALUMNOS_ACTIVOS = load_alumnos()

import difflib
import unicodedata

def normalize_str(s):
    if not s: return ""
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").lower().strip()

def match_alumno(nombre_detectado):
    if not nombre_detectado or not ALUMNOS_ACTIVOS:
        return quitar_tildes((nombre_detectado or "ALUMNO_DESCONOCIDO").upper())
        
    norm_detect = normalize_str(nombre_detectado)
    
    # 1. Búsqueda exacta normalizada
    for a in ALUMNOS_ACTIVOS:
        if normalize_str(a) == norm_detect:
            return quitar_tildes(a.upper())
            
    # 2. Contención de palabras clave (ej: "oliver betancor" o "daniel ramos")
    words_detect = set(norm_detect.split())
    best_candidate = None
    max_shared = 0
    for a in ALUMNOS_ACTIVOS:
        a_words = set(normalize_str(a).split())
        shared = len(words_detect.intersection(a_words))
        if shared > max_shared and shared >= 2:
            max_shared = shared
            best_candidate = a
            
    if best_candidate:
        return quitar_tildes(best_candidate.upper())
        
    # 3. Fuzzy matching difflib
    norm_map = {normalize_str(a): a for a in ALUMNOS_ACTIVOS}
    matches = difflib.get_close_matches(norm_detect, norm_map.keys(), n=1, cutoff=0.5)
    if matches:
        return quitar_tildes(norm_map[matches[0]].upper())
        
    return quitar_tildes(nombre_detectado.upper())

def analyze_with_gemini(thumb_path, fecha_fija):
    if not client:
        return None
    try:
        prompt = """
Analiza esta imagen que contiene unicamente la cabecera de un examen de aviacion.
Extrae los siguientes campos en formato JSON estricto:
- alumno: Nombre y apellidos del alumno tal como estan escritos (sin tildes, sin firmas).
- asignatura: Una de las siguientes siglas oficiales de aviacion ATPL (asigna obligatoriamente la que coincida o mas se parezca al texto escrito):
  * FPM (Flight Planning, Flight Planning & Monitoring, 033)
  * MET (Meteorologia, Meteorology, 050)
  * GNAV (General Navigation, Navegacion General, 061)
  * RNAV (Radio Navigation, Radionavegacion, 062)
  * ALW (Air Law, Derecho Aereo, Leyes, 010)
  * AGK (Aircraft General Knowledge, Celula y Sistemas, Motores, 021)
  * INS (Instrumentation, Instrumentos, 022)
  * M&B (Mass and Balance, Carga y Centrado, 031)
  * PERF (Performance, Rendimiento, 032)
  * HPL (Human Performance, Factores Humanos, 040)
  * OPS (Operational Procedures, Procedimientos Operacionales, 070)
  * POF (Principles of Flight, Principios de Vuelo, 081)
  * COMM (Communications, Comunicaciones, 090)
  * PPL (Private Pilot, PPL General, 100)
- numero_examen: El numero escrito en 'Num. examen' (ej: 07, 02, 10).

Responde UNICAMENTE con un objeto JSON valido con esas 3 claves.
"""
        img = Image.open(thumb_path)
        resp = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[prompt, img],
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        data = json.loads(resp.text)
        
        # Emparejar con alumno oficial
        alumno_raw = data.get("alumno", "").strip()
        alumno_oficial = match_alumno(alumno_raw)
        
        asig_raw = data.get("asignatura", "").upper().strip()
        # Normalizar si viene con codigo
        parts = asig_raw.split()
        first_word = parts[0] if parts else ""
        if first_word in EASA_MAP:
            sigla, cod = EASA_MAP[first_word]
        elif asig_raw in EASA_MAP:
            sigla, cod = EASA_MAP[asig_raw]
        else:
            sigla, cod = (first_word or "ASIG", "000")
            
        num_ex = str(data.get("numero_examen", "")).strip().lstrip("0")
        if not num_ex:
            num_ex = "1"
            
        return {
            "alumno": alumno_oficial,
            "asignatura": sigla,
            "codigo_easa": cod,
            "numero_examen": num_ex
        }
    except Exception as e:
        print(f"Error en Gemini API: {e}")
        return None

class ExamHandler(BaseHTTPRequestHandler):
    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/" or path == "/index.html":
            self.serve_file(os.path.join(PUBLIC_DIR, "index.html"), "text/html; charset=utf-8")
        elif path.startswith("/public/"):
            rel_path = path[len("/public/"):]
            file_path = os.path.join(PUBLIC_DIR, rel_path)
            content_type = "text/css" if rel_path.endswith(".css") else "application/javascript"
            self.serve_file(file_path, content_type)
        elif path == "/api/proxima_sesion":
            self.send_json({"proxima_sesion": get_next_session()})
        elif path == "/api/alumnos":
            self.send_json(ALUMNOS_ACTIVOS)
        elif path == "/api/asignaturas":
            self.send_json(ASIGNATURAS_OFICIALES)
        elif path == "/api/examenes":
            state = load_state()
            files = sorted([f for f in os.listdir(DIVIDIDOS_DIR) if f.endswith(".pdf")])
            result = []
            
            for f in files:
                fecha_fija = f.split("_")[0] if "_" in f else "260907"
                info = state.get(f, {
                    "id": f,
                    "fecha": fecha_fija,
                    "alumno": "",
                    "tipo": "Examen interno",
                    "asignatura": "",
                    "codigo_easa": "",
                    "numero_examen": "",
                    "estado": "pendiente",
                    "nombre_final": "",
                    "sesion": "1"
                })
                if "sesion" not in info or not info["sesion"]:
                    info["sesion"] = "1"
                # Generar thumbnail en background si no existe
                get_or_create_thumbnail(f)
                result.append(info)
                
            self.send_json(result)
            
        elif path.startswith("/api/thumbnail/"):
            fname = urllib.parse.unquote(path[len("/api/thumbnail/"):])
            thumb_path = get_or_create_thumbnail(fname)
            if thumb_path and os.path.exists(thumb_path):
                self.serve_file(thumb_path, "image/png")
            else:
                self.send_error(404, "Thumbnail no encontrado")
                
        elif path.startswith("/api/pdf/"):
            raw_fname = urllib.parse.unquote(path[len("/api/pdf/"):])
            fname = raw_fname.replace("\\", "/")
            base_fname = os.path.basename(fname)
            
            # 1. Probar ruta directa en Renombrados
            pdf_path = os.path.join(RENOMBRADOS_DIR, fname)
            
            # 2. Si no existe directo, buscar en subcarpetas de sesiones (ej: 1/, 2/)
            if not os.path.exists(pdf_path) or os.path.isdir(pdf_path):
                found = False
                if os.path.exists(RENOMBRADOS_DIR):
                    for sub in os.listdir(RENOMBRADOS_DIR):
                        sub_dir = os.path.join(RENOMBRADOS_DIR, sub)
                        if os.path.isdir(sub_dir):
                            candidate = os.path.join(sub_dir, base_fname)
                            if os.path.exists(candidate) and os.path.isfile(candidate):
                                pdf_path = candidate
                                found = True
                                break
                if not found:
                    # 3. Buscar en Examenes_Divididos
                    pdf_path = os.path.join(DIVIDIDOS_DIR, base_fname)

            if os.path.exists(pdf_path) and os.path.isfile(pdf_path):
                self.serve_file(pdf_path, "application/pdf")
            else:
                self.send_error(404, "PDF no encontrado")

        # --- Rutas GET para ATL ---
        elif path == "/api/atl/items":
            state = load_atl_state()
            files = sorted([f for f in os.listdir(ATL_DIVIDIDOS_DIR) if f.endswith(".pdf")])
            result = []
            for f in files:
                info = state.get(f, {
                    "id": f,
                    "origen": "",
                    "fecha": "",
                    "avion": "ES-3A-099",
                    "log_numero": "",
                    "estado": "pendiente",
                    "nombre_final": "FECHA ES-3A-099 LOG.pdf"
                })
                # Asegurar miniatura
                get_or_create_atl_thumbnail(f)
                result.append(info)
            self.send_json(result)

        elif path == "/api/atl/flota":
            self.send_json(load_atl_flota())

        elif path.startswith("/api/atl/thumbnail/"):
            fname = urllib.parse.unquote(path[len("/api/atl/thumbnail/"):])
            thumb_path = get_or_create_atl_thumbnail(fname)
            if thumb_path and os.path.exists(thumb_path):
                self.serve_file(thumb_path, "image/png")
            else:
                self.send_error(404, "Thumbnail ATL no encontrado")

        elif path.startswith("/api/atl/pdf/"):
            raw_fname = urllib.parse.unquote(path[len("/api/atl/pdf/"):])
            base_fname = os.path.basename(raw_fname.replace("\\", "/"))
            candidate = os.path.join(ATL_RENOMBRADOS_DIR, base_fname)
            if not os.path.exists(candidate):
                candidate = os.path.join(ATL_DIVIDIDOS_DIR, base_fname)
            if os.path.exists(candidate) and os.path.isfile(candidate):
                self.serve_file(candidate, "application/pdf")
            else:
                self.send_error(404, "PDF ATL no encontrado")

        elif path == "/api/secuencia_atl/listar":
            try:
                import renumerar_atl
                folder = os.path.join(BASE_DIR, "Sequencia ATL")
                docs = renumerar_atl.listar_documentos_carpeta(folder)
                self.send_json({"status": "ok", "documentos": docs})
            except Exception as e:
                self.send_json({"status": "error", "error": str(e)}, status=500)
            return

        elif path.startswith("/api/secuencia_atl/descargar"):
            query = urllib.parse.parse_qs(parsed.query)
            archivo = query.get("archivo", [""])[0]
            if not archivo:
                self.send_error(400, "Falta el nombre de archivo")
                return
            base_fname = os.path.basename(archivo)
            file_path = os.path.join(BASE_DIR, "Sequencia ATL", base_fname)
            if not os.path.exists(file_path):
                self.send_error(404, "Archivo no encontrado")
                return
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
            self.send_header("Content-Disposition", f'attachment; filename="{base_fname}"')
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return
        else:
            self.send_error(404, "Ruta no encontrada")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length > 0 else b"{}"

        # 0. Previsualización ultrarrápida de la cabecera de la 1ª página del PDF recibido
        if path == "/api/extraer_cabecera_preview":
            if len(body) == 0:
                self.send_json({"error": "No se recibieron datos del PDF"}, status=400)
                return
            try:
                doc = pymupdf.open(stream=body, filetype="pdf")
                if len(doc) == 0:
                    self.send_json({"error": "El PDF no contiene páginas"}, status=400)
                    return
                page = doc[0]
                rect = page.rect
                # Cortar la cabecera donde aparece Asignatura, Alumno y Núm Examen
                clip = pymupdf.Rect(0, 0, rect.width, rect.height * 0.22)
                pix = page.get_pixmap(clip=clip, dpi=160)
                img_bytes = pix.tobytes("png")
                doc.close()
                img_b64 = "data:image/png;base64," + base64.b64encode(img_bytes).decode("ascii")
                self.send_json({"ok": True, "thumb": img_b64})
                return
            except Exception as e:
                self.send_json({"error": f"Error al generar previsualización: {str(e)}"}, status=500)
                return

        # 1. Subida directa de PDF escaneado con división automática
        if path == "/api/upload_scan":
            raw_filename = self.headers.get("X-Filename", "escaneo.pdf")
            filename = urllib.parse.unquote(raw_filename)
            fecha = self.headers.get("X-Fecha", "").strip()
            sesion = self.headers.get("X-Sesion", "").strip()
            asig_previa = urllib.parse.unquote(self.headers.get("X-Asignatura", "")).strip().upper()
            cod_previo = urllib.parse.unquote(self.headers.get("X-Codigo-Easa", "")).strip()
            num_previo = urllib.parse.unquote(self.headers.get("X-Numero-Examen", "")).strip().lstrip("0")

            if not sesion or not sesion.isdigit():
                sesion = get_next_session()

            # Asegurar que exista la carpeta correspondiente a esta sesión
            sesion_dir = os.path.join(RENOMBRADOS_DIR, sesion)
            os.makedirs(sesion_dir, exist_ok=True)

            if not fecha or len(fecha) != 6 or not fecha.isdigit():
                self.send_json({"error": "La fecha debe tener 6 dígitos (YYMMDD), por ejemplo: 260907"}, status=400)
                return

            if len(body) == 0:
                self.send_json({"error": "El archivo PDF recibido está vacío"}, status=400)
                return

            # Guardar copia del escaneo maestro en Escaneos_Originales
            safe_basename = os.path.basename(filename)
            dest_orig = os.path.join(ORIGINALES_DIR, safe_basename)
            with open(dest_orig, "wb") as f:
                f.write(body)

            # Extraer automáticamente materia y número de examen del nombre del archivo si no vinieron fijados
            if not asig_previa:
                auto_asig, auto_cod, auto_num = extraer_materia_y_examen(safe_basename)
                if auto_asig:
                    asig_previa = auto_asig
                    cod_previo = auto_cod
                if not num_previo and auto_num:
                    num_previo = auto_num

            # Abrir con PyMuPDF y dividir página por página
            try:
                doc = pymupdf.open(stream=body, filetype="pdf")
            except Exception as e:
                self.send_json({"error": f"No se pudo leer el archivo PDF: {e}"}, status=400)
                return

            num_pages = len(doc)
            state = load_state()

            # Determinar el siguiente número de página disponible para esta fecha
            existing_for_date = [f for f in os.listdir(DIVIDIDOS_DIR) if f.startswith(f"{fecha}_pag_") and f.endswith(".pdf")]
            start_idx = 1
            if existing_for_date:
                indices = []
                for ef in existing_for_date:
                    try:
                        num_part = ef.split("_pag_")[1].replace(".pdf", "")
                        indices.append(int(num_part))
                    except Exception:
                        pass
                if indices:
                    start_idx = max(indices) + 1

            generados = []
            ex_num_str = f"EX{num_previo}" if num_previo else "EX_PENDIENTE"
            asig_str = asig_previa if asig_previa else "ASIG"
            cod_str = cod_previo if cod_previo else "000"
            nombre_prop = f"{fecha}.PENDIENTE.Examen interno.{asig_str}.{cod_str}.{ex_num_str}.pdf"

            for i in range(num_pages):
                curr_idx = start_idx + i
                out_name = f"{fecha}_pag_{curr_idx:03d}.pdf"
                out_path = os.path.join(DIVIDIDOS_DIR, out_name)

                single_doc = pymupdf.open()
                single_doc.insert_pdf(doc, from_page=i, to_page=i)
                single_doc.save(out_path)
                single_doc.close()

                # Generar miniatura inmediatamente
                get_or_create_thumbnail(out_name)

                # Registrar en el estado con su sesión consecutiva y datos preasignados
                state[out_name] = {
                    "id": out_name,
                    "fecha": fecha,
                    "alumno": "",
                    "tipo": "Examen interno",
                    "asignatura": asig_previa,
                    "codigo_easa": cod_previo,
                    "numero_examen": num_previo,
                    "estado": "pendiente",
                    "archivo_en_disco": None,
                    "nombre_final": nombre_prop,
                    "sesion": sesion
                }
                generados.append(out_name)

            doc.close()
            save_state(state)

            self.send_json({
                "status": "ok",
                "filename": filename,
                "fecha": fecha,
                "sesion": sesion,
                "paginas_generadas": num_pages,
                "total_examenes": len(state),
                "primer_examen": generados[0] if generados else None,
                "ultimo_examen": generados[-1] if generados else None
            })
            return

        # 2. Archivar convocatoria actual para iniciar una limpia
        elif path == "/api/archivar_convocatoria":
            import datetime, shutil
            ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"Convocatoria_{ts}"
            backup_dir = os.path.join(HISTORICO_DIR, backup_name)
            os.makedirs(backup_dir, exist_ok=True)

            if os.path.exists(STATE_FILE):
                shutil.copy2(STATE_FILE, os.path.join(backup_dir, "estado_examenes.json"))

            for folder, name in [
                (DIVIDIDOS_DIR, "Examenes_Divididos"),
                (RENOMBRADOS_DIR, "Examenes_Renombrados"),
                (THUMB_DIR, "thumbnails")
            ]:
                dest = os.path.join(backup_dir, name)
                if os.path.exists(folder):
                    shutil.copytree(folder, dest, dirs_exist_ok=True)
                    for f in os.listdir(folder):
                        fpath = os.path.join(folder, f)
                        try:
                            if os.path.isfile(fpath):
                                os.remove(fpath)
                        except Exception:
                            pass

            save_state({})
            self.send_json({"status": "ok", "backup": backup_name})
            return

        try:
            req_data = json.loads(body.decode("utf-8"))
        except Exception:
            req_data = {}

        if path == "/api/analizar_uno":
            pdf_name = req_data.get("id")
            if not pdf_name:
                self.send_json({"error": "Falta parametro id"}, status=400)
                return
                
            fecha_fija = pdf_name.split("_")[0] if "_" in pdf_name else "260907"
            thumb_path = get_or_create_thumbnail(pdf_name)
            
            ai_data = analyze_with_gemini(thumb_path, fecha_fija)
            if not ai_data:
                self.send_json({"error": "Fallo al analizar con Gemini"}, status=500)
                return
                
            state = load_state()
            info = state.get(pdf_name, {
                "id": pdf_name,
                "fecha": fecha_fija,
                "tipo": "Examen interno",
                "estado": "analizado"
            })
            
            # Conservar asignatura y número de examen si ya fueron preasignados por el usuario
            pre_asig = info.get("asignatura")
            pre_cod = info.get("codigo_easa")
            pre_num = info.get("numero_examen")

            info.update(ai_data)

            if pre_asig:
                info["asignatura"] = pre_asig
            if pre_cod:
                info["codigo_easa"] = pre_cod
            if pre_num:
                info["numero_examen"] = pre_num

            info["estado"] = "analizado"
            info["alumno"] = quitar_tildes(info.get("alumno", "").strip().upper())
            
            # Nombre propuesto (siempre en mayúsculas y sin tildes)
            ex_num = f"EX{info['numero_examen']}" if info['numero_examen'] else "EX1"
            raw_final = f"{info['fecha']}.{info['alumno']}.{info['tipo']}.{info['asignatura']}.{info['codigo_easa']}.{ex_num}.pdf"
            info["nombre_final"] = quitar_tildes(raw_final)
            state[pdf_name] = info
            save_state(state)
            
            self.send_json(info)

        elif path == "/api/alumnos":
            # Actualizar lista de alumnos dinamicamente desde la interfaz (siempre en mayúsculas y sin tildes)
            nuevos = req_data.get("alumnos", [])
            global ALUMNOS_ACTIVOS
            cleaned = []
            for n in nuevos:
                if isinstance(n, str) and len(n.strip()) > 2:
                    cleaned.append(quitar_tildes(n.strip().upper()))
            if cleaned:
                ALUMNOS_ACTIVOS = cleaned
                with open(ALUMNOS_FILE, "w", encoding="utf-8") as f:
                    json.dump(ALUMNOS_ACTIVOS, f, indent=2, ensure_ascii=False)
            self.send_json({"status": "ok", "total": len(ALUMNOS_ACTIVOS), "alumnos": ALUMNOS_ACTIVOS})

        elif path == "/api/guardar_edicion":
            # Guarda los campos editados por el usuario
            item = req_data.get("item")
            if not item or "id" not in item:
                self.send_json({"error": "Datos invalidos"}, status=400)
                return
            if item.get("alumno"):
                item["alumno"] = quitar_tildes(item["alumno"].strip().upper())
            if item.get("nombre_final"):
                item["nombre_final"] = quitar_tildes(item["nombre_final"])
            state = load_state()
            existing = state.get(item["id"], {})
            # Conservar la referencia al archivo real que existe en disco y su sesion
            if "archivo_en_disco" in existing:
                item["archivo_en_disco"] = existing["archivo_en_disco"]
            if "sesion" in existing and "sesion" not in item:
                item["sesion"] = existing["sesion"]
            state[item["id"]] = item
            save_state(state)
            self.send_json({"status": "ok"})

        elif path == "/api/renombrar":
            # Renombrar físicamente dentro de la carpeta consecutiva de la sesión
            items = req_data.get("items", [])
            state = load_state()
            renombrados = []
            
            for it in items:
                f_id = it.get("id")
                if it.get("alumno"):
                    it["alumno"] = quitar_tildes(it["alumno"].strip().upper())
                final_name = quitar_tildes(it.get("nombre_final", ""))
                it["nombre_final"] = final_name
                if not f_id or not final_name:
                    continue

                old_info = state.get(f_id, {})
                sesion = str(it.get("sesion") or old_info.get("sesion") or "1").strip()
                if not sesion:
                    sesion = "1"
                
                sesion_dir = os.path.join(RENOMBRADOS_DIR, sesion)
                os.makedirs(sesion_dir, exist_ok=True)
                    
                src_path = os.path.join(DIVIDIDOS_DIR, f_id)
                dst_path = os.path.join(sesion_dir, final_name)
                
                # Buscar cualquier archivo anterior que pertenecía a este examen
                old_file = old_info.get("archivo_en_disco") or old_info.get("nombre_final")
                
                # Si había un archivo anterior con nombre diferente, eliminarlo para no dejar duplicados
                if old_file:
                    old_basename = os.path.basename(old_file.replace("\\", "/"))
                    if old_basename != final_name:
                        # 1. Probar en sesion_dir
                        old_in_sesion = os.path.join(sesion_dir, old_basename)
                        if os.path.exists(old_in_sesion):
                            try:
                                os.remove(old_in_sesion)
                                print(f"[REEMPLAZO] Eliminado archivo anterior obsoleto: {old_in_sesion}")
                            except Exception as e:
                                print(f"Error eliminando {old_in_sesion}: {e}")
                        # 2. Probar en ruta exacta guardada en archivo_en_disco
                        old_direct = os.path.join(RENOMBRADOS_DIR, old_file)
                        if os.path.exists(old_direct) and os.path.isfile(old_direct):
                            try:
                                os.remove(old_direct)
                                print(f"[REEMPLAZO] Eliminado archivo anterior: {old_direct}")
                            except Exception as e:
                                pass

                if os.path.exists(src_path):
                    import shutil
                    shutil.copy2(src_path, dst_path)
                    it["estado"] = "renombrado"
                    it["sesion"] = sesion
                    it["archivo_en_disco"] = f"{sesion}/{final_name}"
                    it["nombre_final"] = final_name
                    state[f_id] = it
                    renombrados.append({"id": f_id, "nombre_final": final_name, "sesion": sesion})
                    print(f"[RENOMBRADO] Guardado en sesión {sesion}: {final_name}")
                    
            save_state(state)
            self.send_json({"status": "ok", "renombrados": renombrados})

        # ========================================================
        # ENDPOINTS POST PARA ATLS (AIRCRAFT / FSTD TECHNICAL LOGS)
        # ========================================================

        elif path == "/api/atl/upload":
            raw_filename = self.headers.get("X-Filename", "escaneo_atl.pdf")
            filename = urllib.parse.unquote(raw_filename)
            safe_basename = os.path.basename(filename)

            if len(body) == 0:
                self.send_json({"error": "El archivo PDF recibido está vacío"}, status=400)
                return

            dest_orig = os.path.join(ATL_ORIGINALES_DIR, safe_basename)
            with open(dest_orig, "wb") as f:
                f.write(body)

            try:
                doc = pymupdf.open(stream=body, filetype="pdf")
            except Exception as e:
                self.send_json({"error": f"No se pudo leer el archivo PDF: {e}"}, status=400)
                return

            num_pages = len(doc)
            state = load_atl_state()

            # Determinar índice consecutivo inicial
            existing = [f for f in os.listdir(ATL_DIVIDIDOS_DIR) if f.startswith("atl_pag_") and f.endswith(".pdf")]
            start_idx = 1
            if existing:
                indices = []
                for ef in existing:
                    try:
                        p = ef.replace("atl_pag_", "").replace(".pdf", "")
                        indices.append(int(p))
                    except Exception:
                        pass
                if indices:
                    start_idx = max(indices) + 1

            generados = []
            for i in range(num_pages):
                curr_idx = start_idx + i
                out_name = f"atl_pag_{curr_idx:03d}.pdf"
                out_path = os.path.join(ATL_DIVIDIDOS_DIR, out_name)

                single_doc = pymupdf.open()
                single_doc.insert_pdf(doc, from_page=i, to_page=i)
                single_doc.save(out_path)
                single_doc.close()

                # Generar miniatura inmediatamente
                get_or_create_atl_thumbnail(out_name)

                # Extracción local sin IA mediante PyMuPDF
                datos_locales = extraer_datos_locales_atl(out_path)
                avion_det = datos_locales.get("avion") or "ES-3A-099"
                log_det = datos_locales.get("log_numero") or ""
                fecha_det = datos_locales.get("fecha") or ""

                nombre_prop = formatear_nombre_atl(fecha_det, avion_det, log_det)
                estado_item = "listo" if (fecha_det and avion_det and log_det) else "pendiente"

                item_info = {
                    "id": out_name,
                    "origen": safe_basename,
                    "num_pagina": i + 1,
                    "fecha": fecha_det,
                    "avion": avion_det,
                    "log_numero": log_det,
                    "estado": estado_item,
                    "nombre_final": nombre_prop,
                    "archivo_en_disco": None
                }
                state[out_name] = item_info
                generados.append(item_info)

            doc.close()
            save_atl_state(state)

            self.send_json({
                "status": "ok",
                "filename": filename,
                "paginas_generadas": num_pages,
                "items": generados
            })
            return

        elif path == "/api/atl/guardar":
            item = req_data.get("item")
            if not item or "id" not in item:
                self.send_json({"error": "Datos inválidos"}, status=400)
                return
            state = load_atl_state()
            existing = state.get(item["id"], {})

            fecha = str(item.get("fecha", "")).strip()
            avion = str(item.get("avion", "")).strip().upper()
            log_num = str(item.get("log_numero", "")).strip().upper()
            if log_num and not log_num.startswith("LOG") and log_num.isdigit():
                log_num = f"LOG{log_num.zfill(4)}"

            existing["fecha"] = fecha
            existing["avion"] = avion
            existing["log_numero"] = log_num
            existing["nombre_final"] = formatear_nombre_atl(fecha, avion, log_num)

            if existing.get("estado") != "renombrado":
                if fecha and avion and log_num:
                    existing["estado"] = "listo"
                else:
                    existing["estado"] = "pendiente"

            state[item["id"]] = existing
            save_atl_state(state)
            self.send_json({"status": "ok", "item": existing})
            return

        elif path == "/api/atl/auto_incrementar_logs":
            start_id = req_data.get("start_id")
            raw_start_log = str(req_data.get("start_log", "")).strip().upper()
            state = load_atl_state()

            m = re.search(r'(\d+)', raw_start_log)
            if not m:
                self.send_json({"error": "No se encontró un número válido en el log inicial"}, status=400)
                return
            start_num = int(m.group(1))

            sorted_keys = sorted(state.keys())
            if start_id in sorted_keys:
                idx_start = sorted_keys.index(start_id)
            else:
                idx_start = 0

            actualizados = []
            for i, key in enumerate(sorted_keys[idx_start:]):
                curr_num = start_num + i
                it = state[key]
                it["log_numero"] = f"LOG{str(curr_num).zfill(4)}"
                it["nombre_final"] = formatear_nombre_atl(it.get("fecha", ""), it.get("avion", ""), it["log_numero"])
                if it.get("estado") != "renombrado":
                    if it.get("fecha") and it.get("avion") and it.get("log_numero"):
                        it["estado"] = "listo"
                    else:
                        it["estado"] = "pendiente"
                actualizados.append(it)

            save_atl_state(state)
            self.send_json({"status": "ok", "actualizados": len(actualizados), "items": actualizados})
            return

        elif path == "/api/atl/aplicar_lote":
            ids = req_data.get("ids", [])
            fecha = req_data.get("fecha")
            avion = req_data.get("avion")
            state = load_atl_state()

            if not ids:
                ids = list(state.keys())

            for f_id in ids:
                if f_id in state:
                    it = state[f_id]
                    if fecha is not None:
                        it["fecha"] = str(fecha).strip()
                    if avion is not None:
                        it["avion"] = str(avion).strip().upper()
                    it["nombre_final"] = formatear_nombre_atl(it.get("fecha", ""), it.get("avion", ""), it.get("log_numero", ""))
                    if it.get("estado") != "renombrado":
                        if it.get("fecha") and it.get("avion") and it.get("log_numero"):
                            it["estado"] = "listo"
                        else:
                            it["estado"] = "pendiente"

            save_atl_state(state)
            self.send_json({"status": "ok", "total": len(ids)})
            return

        elif path == "/api/atl/renombrar":
            target_ids = req_data.get("ids", [])
            state = load_atl_state()
            renombrados = []

            items_to_rename = []
            if target_ids:
                items_to_rename = [state[i] for i in target_ids if i in state]
            else:
                items_to_rename = [it for it in state.values() if it.get("fecha") and it.get("avion") and it.get("log_numero")]

            for it in items_to_rename:
                f_id = it["id"]
                src_path = os.path.join(ATL_DIVIDIDOS_DIR, f_id)
                final_name = it.get("nombre_final") or formatear_nombre_atl(it.get("fecha", ""), it.get("avion", ""), it.get("log_numero", ""))
                dst_path = os.path.join(ATL_RENOMBRADOS_DIR, final_name)

                old_file = it.get("archivo_en_disco")
                if old_file and old_file != final_name:
                    old_path = os.path.join(ATL_RENOMBRADOS_DIR, old_file)
                    if os.path.exists(old_path) and os.path.isfile(old_path):
                        try:
                            os.remove(old_path)
                        except Exception:
                            pass

                if os.path.exists(src_path):
                    import shutil
                    shutil.copy2(src_path, dst_path)
                    it["estado"] = "renombrado"
                    it["nombre_final"] = final_name
                    it["archivo_en_disco"] = final_name
                    state[f_id] = it
                    renombrados.append({"id": f_id, "nombre_final": final_name})

            save_atl_state(state)
            self.send_json({"status": "ok", "renombrados": renombrados})
            return

        elif path == "/api/atl/limpiar":
            for f in os.listdir(ATL_DIVIDIDOS_DIR):
                fp = os.path.join(ATL_DIVIDIDOS_DIR, f)
                try:
                    if os.path.isfile(fp):
                        os.remove(fp)
                except Exception:
                    pass
            for f in os.listdir(ATL_THUMB_DIR):
                fp = os.path.join(ATL_THUMB_DIR, f)
                try:
                    if os.path.isfile(fp):
                        os.remove(fp)
                except Exception:
                    pass
            save_atl_state({})
            self.send_json({"status": "ok"})
            return

        elif path == "/api/secuencia_atl/renumerar":
            try:
                import renumerar_atl
                data = json.loads(body.decode("utf-8"))
                archivo = data.get("archivo", "")
                inicio = int(data.get("inicio", 1))
                prefijo = data.get("prefijo", None)
                digitos = int(data.get("digitos", 4))
                folder = os.path.join(BASE_DIR, "Sequencia ATL")

                if archivo == "TODOS":
                    docs = renumerar_atl.listar_documentos_carpeta(folder)
                    resultados = []
                    for d in docs:
                        res = renumerar_atl.renumerar_documento(
                            d["ruta_completa"],
                            start_num=inicio,
                            prefix=d["prefijo_detectado"],
                            digits=digitos
                        )
                        resultados.append(res)
                    self.send_json({"status": "ok", "modo": "todos", "resultados": resultados})
                    return
                else:
                    base_fname = os.path.basename(archivo)
                    file_path = os.path.join(folder, base_fname)
                    if not os.path.exists(file_path):
                        self.send_json({"error": f"Archivo no encontrado: {base_fname}"}, status=404)
                        return
                    res = renumerar_atl.renumerar_documento(
                        file_path,
                        start_num=inicio,
                        prefix=prefijo,
                        digits=digitos
                    )
                    self.send_json({"status": "ok", "modo": "individual", "resultado": res})
                    return
            except Exception as e:
                self.send_json({"error": f"Error al renumerar: {str(e)}"}, status=500)
                return

        elif path == "/api/secuencia_atl/abrir_carpeta":
            try:
                import subprocess
                folder = os.path.abspath(os.path.join(BASE_DIR, "Sequencia ATL"))
                os.makedirs(folder, exist_ok=True)
                try:
                    subprocess.Popen(["explorer.exe", folder])
                except Exception:
                    os.startfile(folder)
                self.send_json({"status": "ok", "ruta": folder})
            except Exception as e:
                self.send_json({"error": str(e)}, status=500)
            return

        elif path == "/api/secuencia_atl/subir":
            try:
                raw_filename = self.headers.get("X-Filename", "documento.docx")
                filename = urllib.parse.unquote(raw_filename)
                folder = os.path.join(BASE_DIR, "Sequencia ATL")
                os.makedirs(folder, exist_ok=True)
                target = os.path.join(folder, os.path.basename(filename))
                with open(target, "wb") as f:
                    f.write(body)
                self.send_json({"status": "ok", "archivo": os.path.basename(filename)})
            except Exception as e:
                self.send_json({"error": str(e)}, status=500)
            return

        else:
            self.send_error(404)

    def serve_file(self, file_path, content_type):
        if not os.path.exists(file_path):
            self.send_error(404, "Archivo no encontrado")
            return
        with open(file_path, "rb") as f:
            content = f.read()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

def run(port=8000):
    server = HTTPServer(("localhost", port), ExamHandler)
    print(f"Servidor iniciado en http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        server.server_close()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run(port)
