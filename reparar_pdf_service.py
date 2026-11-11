import os
import re
import sys
import tempfile
import pymupdf
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPARA_DIR = os.path.join(BASE_DIR, "Repara PDF")
REPARADOS_DIR = os.path.join(REPARA_DIR, "Reparados")

# Patrones para detectar bloques inyectados por el motor Quartz / Apple Preview de macOS
# que duplican el texto del formulario justo antes de /Tx BMC
MACOS_INJECTED_PATTERN = re.compile(
    rb'q\s+1\s+0\s+0\s+-1\s+[-0-9\.]+\s+[-0-9\.]+\s+cm\s+BT.*?ET\s+Q\s+Q(?=\s*/Tx BMC)',
    re.DOTALL
)

# Variante donde el bloque /Tx BMC puede estar ligeramente espaciado o con variaciones de retorno de carro
MACOS_INJECTED_ALT = re.compile(
    rb'q\s+1\s+0\s+0\s+-1\s+[-0-9\.]+\s+[-0-9\.]+\s+cm\s+BT.*?ET\s+Q\s+Q\s*(?=/Tx\s+BMC)',
    re.DOTALL
)


def asegurar_directorios():
    """Asegura que existan las carpetas de trabajo."""
    os.makedirs(REPARA_DIR, exist_ok=True)
    os.makedirs(REPARADOS_DIR, exist_ok=True)


def get_downloads_dir():
    """Obtiene la ruta a la carpeta de descargas del usuario."""
    user_home = os.path.expanduser("~")
    pref_dl = os.path.join(user_home, "Downloads")
    if not os.path.isdir(pref_dl):
        pref_dl = os.path.join(user_home, "Descargas")
    return pref_dl if os.path.isdir(pref_dl) else REPARADOS_DIR


def listar_archivos_carpeta_repara():
    """Devuelve la lista de archivos PDF disponibles en la carpeta 'Repara PDF'."""
    asegurar_directorios()
    archivos = []
    try:
        for f in os.listdir(REPARA_DIR):
            if f.lower().endswith(".pdf") and os.path.isfile(os.path.join(REPARA_DIR, f)):
                fpath = os.path.join(REPARA_DIR, f)
                stat = os.stat(fpath)
                archivos.append({
                    "nombre": f,
                    "ruta": fpath,
                    "tamano_bytes": stat.st_size,
                    "tamano_mb": round(stat.st_size / (1024 * 1024), 2),
                    "modificado": stat.st_mtime
                })
    except Exception as e:
        print(f"Error listando archivos en Repara PDF: {e}")
    archivos.sort(key=lambda x: x["modificado"], reverse=True)
    return archivos


def abrir_documento_pymupdf(origen):
    """Abre un documento PyMuPDF desde ruta (str) o bytes."""
    if isinstance(origen, (bytes, bytearray)):
        return pymupdf.open(stream=origen, filetype="pdf")
    elif isinstance(origen, str):
        if not os.path.exists(origen):
            raise FileNotFoundError(f"No existe el archivo: {origen}")
        return pymupdf.open(origen)
    elif isinstance(origen, pymupdf.Document):
        return origen
    else:
        raise ValueError("Origen no válido para PyMuPDF")


def analizar_pdf(origen):
    """
    Analiza un PDF para detectar:
    - Total de páginas
    - Si es un formulario interactivo (AcroForm / XFA)
    - Total de campos / widgets interactivos
    - Flujos de apariencia con duplicación por bug de macOS Preview / Quartz
    - Textos duplicados superpuestos en el contenido plano
    """
    doc = abrir_documento_pymupdf(origen)
    total_paginas = len(doc)
    es_formulario = bool(doc.is_form_pdf)
    
    total_widgets = 0
    total_anotaciones = 0
    streams_con_bug_macos = 0
    
    # 1. Contar widgets y anotaciones por página
    for page in doc:
        total_widgets += len(list(page.widgets() or []))
        total_anotaciones += len(list(page.annots() or []))

    # 2. Analizar flujos de objetos (xrefs) en busca de inyecciones de macOS
    for i in range(1, doc.xref_length()):
        try:
            s = doc.xref_stream(i)
            if s and b'/Tx BMC' in s and (MACOS_INJECTED_PATTERN.search(s) or MACOS_INJECTED_ALT.search(s)):
                streams_con_bug_macos += 1
        except Exception:
            pass

    # 3. Detectar palabras duplicadas en la primera página
    duplicados_palabras_p1 = 0
    if total_paginas > 0:
        palabras_p1 = doc[0].get_text("words")
        vistas = {}
        for w in palabras_p1:
            k = (round(w[0], 1), round(w[1], 1), w[4])
            if k in vistas:
                duplicados_palabras_p1 += 1
            else:
                vistas[k] = True

    return {
        "total_paginas": total_paginas,
        "es_formulario": es_formulario,
        "total_widgets": total_widgets,
        "total_anotaciones": total_anotaciones,
        "streams_con_bug_macos": streams_con_bug_macos,
        "duplicados_palabras_p1": duplicados_palabras_p1,
        "requiere_reparacion": streams_con_bug_macos > 0 or duplicados_palabras_p1 > 0 or es_formulario
    }


def reparar_flujos_macos(doc):
    """
    Elimina los bloques de texto duplicados inyectados por Quartz/macOS Preview
    en los flujos de apariencia (/AP) de los campos de formulario.
    """
    reparados = 0
    for i in range(1, doc.xref_length()):
        try:
            s = doc.xref_stream(i)
            if s and b'/Tx BMC' in s:
                if MACOS_INJECTED_PATTERN.search(s):
                    nuevo_s = MACOS_INJECTED_PATTERN.sub(b'', s)
                    doc.update_stream(i, nuevo_s)
                    reparados += 1
                elif MACOS_INJECTED_ALT.search(s):
                    nuevo_s = MACOS_INJECTED_ALT.sub(b'', s)
                    doc.update_stream(i, nuevo_s)
                    reparados += 1
        except Exception:
            pass
    return reparados


def generar_preview_imagen(origen, num_pagina=0, dpi=120):
    """Renderiza una página del PDF como imagen PNG en bytes."""
    doc = abrir_documento_pymupdf(origen)
    if num_pagina < 0 or num_pagina >= len(doc):
        num_pagina = 0
    page = doc[num_pagina]
    pix = page.get_pixmap(dpi=dpi)
    return pix.tobytes("png")


def reparar_pdf(
    origen,
    nombre_base=None,
    eliminar_duplicados=True,
    aplanar_aesa=True,
    guardar_en_descargas=True
):
    """
    Repara el PDF solucionando textos dobles y aplanándolo para la normativa AESA.
    
    Retorna un diccionario con estadísticas, ruta final del archivo guardado y buffer de bytes.
    """
    asegurar_directorios()
    doc = abrir_documento_pymupdf(origen)
    stats_antes = analizar_pdf(doc)

    streams_reparados = 0
    if eliminar_duplicados:
        streams_reparados = reparar_flujos_macos(doc)

    # Aplanar para AESA: convierte campos de formulario y anotaciones en vectores/texto
    # permanentes, eliminando el diccionario interactivo AcroForm.
    fue_aplanado = False
    if aplanar_aesa:
        doc.bake(annots=True, widgets=True)
        fue_aplanado = True

    # Generar bytes optimizados
    pdf_bytes = doc.tobytes(garbage=4, deflate=True)
    doc_reparado = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    stats_despues = analizar_pdf(doc_reparado)

    # Determinar nombre del archivo
    if not nombre_base:
        if isinstance(origen, str):
            nombre_base = os.path.basename(origen)
        else:
            nombre_base = "DOCUMENTO.pdf"

    nombre_sin_ext, _ = os.path.splitext(nombre_base)
    # Limpiar sufijos previos para no acumular _REPARADO_REPARADO
    nombre_limpio = re.sub(r'(_REPARADO|_AESA|_FIXED)+', '', nombre_sin_ext, flags=re.IGNORECASE)
    
    sufijo = "_REPARADO_AESA.pdf" if aplanar_aesa else "_REPARADO.pdf"
    nombre_final = f"{nombre_limpio}{sufijo}"

    # Guardar en destino
    carpeta_destino = get_downloads_dir() if guardar_en_descargas else REPARADOS_DIR
    os.makedirs(carpeta_destino, exist_ok=True)
    ruta_guardado = os.path.join(carpeta_destino, nombre_final)

    with open(ruta_guardado, "wb") as f:
        f.write(pdf_bytes)

    return {
        "status": "ok",
        "nombre_archivo": nombre_final,
        "ruta_guardada": ruta_guardado,
        "carpeta_destino": carpeta_destino,
        "tamano_bytes": len(pdf_bytes),
        "tamano_mb": round(len(pdf_bytes) / (1024 * 1024), 2),
        "total_paginas": len(doc_reparado),
        "streams_reparados": streams_reparados,
        "fue_aplanado": fue_aplanado,
        "stats_antes": stats_antes,
        "stats_despues": stats_despues,
        "pdf_bytes": pdf_bytes
    }

