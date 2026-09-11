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

os.makedirs(DIVIDIDOS_DIR, exist_ok=True)
os.makedirs(THUMB_DIR, exist_ok=True)
os.makedirs(RENOMBRADOS_DIR, exist_ok=True)
os.makedirs(ORIGINALES_DIR, exist_ok=True)
os.makedirs(HISTORICO_DIR, exist_ok=True)
os.makedirs(PUBLIC_DIR, exist_ok=True)

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
