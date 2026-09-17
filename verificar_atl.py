#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Módulo de Verificación de Números de Parte (P/N) y Serie (S/N) para Talonarios ATL.
Permite comprobar si los datos de Motores, Hélices y Accesorios en los documentos
Word (.docx) coinciden con la información técnica de referencia oficial, sin modificar nada.
"""

import os
import sys
import re
import glob
import zipfile
import xml.etree.ElementTree as ET

# Asegurar compatibilidad de codificación en consola Windows
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

W_NS = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

# ==============================================================================
# TABLAS DE REFERENCIA TÉCNICA OFICIAL
# ==============================================================================

# Referencia de Motores y Hélices según la flota (Imagen 2) y MSN de Célula oficial
# Mapea matrículas actuales y sus matrículas históricas (D-EKJJ -> EC-OXV, HA-KLB -> EC-OXT)
TABLA_REFERENCIA_MOTORES_HELICES = {
    'EC-NNA': {
        'matricula': 'EC-NNA',
        'matricula_historica': None,
        'sn_celula': '172-69394',
        'msn': '172-69394',
        'motor_lh': {'pn': 'TAE125-02-114', 'sn': '02-02-12981'},
        'motor_rh': {'pn': 'N/A', 'sn': 'N/A'},
        'helice_lh': {'pn': 'MTV-6-A/190-69', 'sn': '201176'},
        'helice_rh': {'pn': 'N/A', 'sn': 'N/A'},
    },
    'EC-NNX': {
        'matricula': 'EC-NNX',
        'matricula_historica': None,
        'sn_celula': 'F172-0132',
        'msn': 'F172-0132',
        'motor_lh': {'pn': 'TAE125-02-114', 'sn': '02-02-12980'},
        'motor_rh': {'pn': 'N/A', 'sn': 'N/A'},
        'helice_lh': {'pn': 'MTV-6-A/190-69', 'sn': '251506'},
        'helice_rh': {'pn': 'N/A', 'sn': 'N/A'},
    },
    'EC-OXV': {
        'matricula': 'EC-OXV',
        'matricula_anterior': 'D-EKJJ',
        'matricula_historica': 'D-EKJJ',
        'sn_celula': 'F17200800',
        'msn': 'F17200800',
        'motor_lh': {'pn': 'TAE125-02-99', 'sn': '02-02-06625'},
        'motor_rh': {'pn': 'N/A', 'sn': 'N/A'},
        'helice_lh': {'pn': 'MTV-6-A/187-129', 'sn': '5715'},
        'helice_rh': {'pn': 'N/A', 'sn': 'N/A'},
    },
    'EC-OXT': {
        'matricula': 'EC-OXT',
        'matricula_anterior': 'HA-KLB',
        'matricula_historica': 'HA-KLB',
        'sn_celula': 'F17201095',
        'msn': 'F17201095',
        'motor_lh': {'pn': 'TAE125-02-99', 'sn': '02-02-04977'},
        'motor_rh': {'pn': 'N/A', 'sn': 'N/A'},
        'helice_lh': {'pn': 'MTV-6-A/187-129', 'sn': '3420'},
        'helice_rh': {'pn': 'N/A', 'sn': 'N/A'},
    },
    'EC-OKC': {
        'matricula': 'EC-OKC',
        'matricula_historica': None,
        'sn_celula': 'D4.205',
        'msn': 'D4.205',
        'motor_lh': {'pn': 'TAE125-02-114', 'sn': '02-02-11584'},
        'motor_rh': {'pn': 'N/A', 'sn': 'N/A'},
        'helice_lh': {'pn': 'MTV-6-A/190-69', 'sn': '70516'},
        'helice_rh': {'pn': 'N/A', 'sn': 'N/A'},
    },
    'EC-OMS': {
        'matricula': 'EC-OMS',
        'matricula_historica': None,
        'sn_celula': '42320',
        'msn': '42320',
        'motor_lh': {'pn': 'TAE125-02-99', 'sn': '02-02-04791'},
        'motor_rh': {'pn': 'TAE125-02-99', 'sn': '02-02-04792'},
        'helice_lh': {'pn': 'MTV-6-A-C-F/CF187-129', 'sn': '71229'},
        'helice_rh': {'pn': 'MTV-6-A-C-F/CF187-129', 'sn': '71236'},
    },
    'EC-OKM': {
        'matricula': 'EC-OKM',
        'matricula_historica': None,
        'sn_celula': '42296',
        'msn': '42296',
        'motor_lh': {'pn': 'TAE125-02-114', 'sn': '02-02-10884'},
        'motor_rh': {'pn': 'TAE125-02-114', 'sn': '02-02-10885'},
        'helice_lh': {'pn': 'MTV-6-A-C-F/CF190-69', 'sn': '6716'},
        'helice_rh': {'pn': 'MTV-6-A-C-F/CF190-69', 'sn': '70934'},
    }
}

# Referencia de Accesorios 14V (Imagen 1)
# S/N reportados del último status recibido para EC-OKC
TABLA_REFERENCIA_ACCESORIOS = {
    'ALTERNADOR 14V': {
        'pn': '05-7150-E000502',
        'sn_okc': '04075F',
        'descripcion': 'Alternador 14V'
    },
    'HIGH PRESSURE PUMP 14V': {
        'pn': '05-7312-K005303',
        'sn_okc': '2636',
        'descripcion': 'Bomba de Alta Presión 14V'
    },
    'FEED PUMP 14V': {
        'pn': '05-7312-K017703',
        'sn_okc': '13595',
        'descripcion': 'Bomba de Alimentación 14V'
    },
    'GEARBOX 14V': {
        'pn': '05-7212-K041503',
        'sn_okc': '4694',
        'descripcion': 'Reductora (Gearbox) 14V'
    }
}

# Mapeo de alias para resolución flexible de matrícula
ALIAS_MATRICULAS = {
    'NNA': 'EC-NNA',
    'NNX': 'EC-NNX',
    'OKC': 'EC-OKC',
    'OKM': 'EC-OKM',
    'OMS': 'EC-OMS',
    'OXT': 'EC-OXT',
    'OXV': 'EC-OXV',
    'D-EKJJ': 'EC-OXV',
    'EKJJ': 'EC-OXV',
    'HA-KLB': 'EC-OXT',
    'KLB': 'EC-OXT',
}


def _normalizar_texto(txt):
    """Limpia espacios en blanco y caracteres especiales para comparación."""
    if not txt:
        return ""
    # Sustituir guiones largos, espacios no rompibles, etc.
    res = txt.strip().replace('\xa0', ' ')
    res = re.sub(r'\s+', ' ', res)
    return res


def normalizar_sn(sn):
    """Elimina guiones, barras, puntos y espacios para comparación flexible de números de serie."""
    if not sn:
        return ""
    return re.sub(r'[\s\-_/.]', '', str(sn)).upper()


def _coincide_sn(encontrado, esperado):
    """Comprueba si dos números de serie coinciden de forma exacta o normalizada."""
    if not esperado or not encontrado:
        return False
    enc_clean = str(encontrado).strip().upper()
    esp_clean = str(esperado).strip().upper()
    if enc_clean == esp_clean:
        return True
    norm_enc = normalizar_sn(enc_clean)
    norm_esp = normalizar_sn(esp_clean)
    if norm_enc == norm_esp:
        return True
    # Comparar quitando ceros a la izquierda tras el prefijo (ej. F1720800 vs F17200800)
    clean_prefix_enc = re.sub(r'^([A-Z]+)0+', r'\1', norm_enc)
    clean_prefix_esp = re.sub(r'^([A-Z]+)0+', r'\1', norm_esp)
    return clean_prefix_enc == clean_prefix_esp


def _identificar_aeronave(docx_path, root=None):
    """
    Identifica la matrícula de la aeronave a partir del nombre del archivo
    y del contenido del documento XML.
    """
    fname = os.path.basename(docx_path).upper()
    
    # Intentar por nombre de archivo
    for alias, mat in ALIAS_MATRICULAS.items():
        if alias in fname:
            return mat
            
    # Intentar por contenido XML si está disponible
    if root is not None:
        for t in root.iter(f'{W_NS}t'):
            if t.text:
                txt = t.text.upper().strip()
                for alias, mat in ALIAS_MATRICULAS.items():
                    if alias in txt:
                        return mat

    return None


def verificar_atl_documento(docx_path):
    """
    Comprueba que los P/N y S/N de cada página en un talonario ATL (.docx)
    coincidan con los valores oficiales de referencia.
    
    IMPORTANTE: Esta función es de solo lectura, NO modifica el archivo.
    
    :param docx_path: Ruta al archivo .docx
    :return: dict con el resultado detallado de la verificación
    """
    if not os.path.isfile(docx_path):
        return {
            "status": "error",
            "es_valido": False,
            "archivo": os.path.basename(docx_path),
            "errores": [f"El archivo no existe: {docx_path}"]
        }

    fname = os.path.basename(docx_path)

    try:
        with zipfile.ZipFile(docx_path, 'r') as z:
            if 'word/document.xml' not in z.namelist():
                return {
                    "status": "error",
                    "es_valido": False,
                    "archivo": fname,
                    "errores": ["El archivo no contiene 'word/document.xml' válido."]
                }
            doc_xml = z.read('word/document.xml')
    except Exception as e:
        return {
            "status": "error",
            "es_valido": False,
            "archivo": fname,
            "errores": [f"Error al abrir archivo Word: {str(e)}"]
        }

    try:
        root = ET.fromstring(doc_xml)
    except Exception as e:
        return {
            "status": "error",
            "es_valido": False,
            "archivo": fname,
            "errores": [f"Error al analizar XML de Word: {str(e)}"]
        }

    tables = root.findall(f'.//{W_NS}tbl')
    total_paginas = len(tables)

    if total_paginas == 0:
        return {
            "status": "error",
            "es_valido": False,
            "archivo": fname,
            "errores": ["No se encontraron tablas de talonario ATL en el documento."]
        }

    # Detectar aeronave
    aeronave = _identificar_aeronave(docx_path, root)
    if not aeronave or aeronave not in TABLA_REFERENCIA_MOTORES_HELICES:
        return {
            "status": "error",
            "es_valido": False,
            "archivo": fname,
            "aeronave": aeronave or "DESCONOCIDA",
            "errores": [f"No se reconoce la aeronave o no tiene tabla técnica de referencia asociada: {aeronave}"]
        }

    ref_aero = TABLA_REFERENCIA_MOTORES_HELICES[aeronave]
    ref_motor_lh = ref_aero['motor_lh']
    ref_motor_rh = ref_aero['motor_rh']
    ref_helice_lh = ref_aero['helice_lh']
    ref_helice_rh = ref_aero['helice_rh']

    # Analizar todas las páginas
    discrepancias = []
    avisos = []
    paginas_con_error = []
    datos_primera_pagina = {}
    
    valores_observados = {
        'motor_lh_sn': set(),
        'motor_lh_pn': set(),
        'motor_rh_sn': set(),
        'motor_rh_pn': set(),
        'helice_lh_sn': set(),
        'helice_lh_pn': set(),
        'helice_rh_sn': set(),
        'helice_rh_pn': set(),
        'celula_sn': set()
    }

    for p_idx, tbl in enumerate(tables, 1):
        rows = tbl.findall(f'.//{W_NS}tr')
        
        sn_cells = None
        pn_cells = None
        
        for r in rows:
            cells = [_normalizar_texto(''.join(tc.itertext())) for tc in r.findall(f'.//{W_NS}tc')]
            if len(cells) >= 6 and cells[0] == 'S/N' and cells[2] == 'S/N':
                sn_cells = cells
            elif len(cells) >= 6 and cells[0] == 'P/N' and cells[2] == 'P/N':
                pn_cells = cells

        if not sn_cells or not pn_cells:
            discrepancias.append(f"Página {p_idx}: No se encontró la fila de S/N o P/N de motores/hélices.")
            paginas_con_error.append(p_idx)
            continue

        # Extraer valores de la página actual
        # Fila S/N: [0: 'S/N', 1: M1_SN, 2: 'S/N', 3: M2_SN, 4: 'S/N', 5: H1_SN, 6: 'S/N', 7: H2_SN, 8: 'S/N', 9: AIRFRAME_SN]
        m1_sn = sn_cells[1] if len(sn_cells) > 1 else ''
        m2_sn = sn_cells[3] if len(sn_cells) > 3 else ''
        h1_sn = sn_cells[5] if len(sn_cells) > 5 else ''
        h2_sn = sn_cells[7] if len(sn_cells) > 7 else ''
        airframe_sn = sn_cells[9] if len(sn_cells) > 9 else (sn_cells[-1] if len(sn_cells) > 8 else '')

        # Fila P/N: [0: 'P/N', 1: M1_PN, 2: 'P/N', 3: M2_PN, 4: 'P/N', 5: H1_PN, 6: 'P/N', 7: H2_PN]
        m1_pn = pn_cells[1] if len(pn_cells) > 1 else ''
        m2_pn = pn_cells[3] if len(pn_cells) > 3 else ''
        h1_pn = pn_cells[5] if len(pn_cells) > 5 else ''
        h2_pn = pn_cells[7] if len(pn_cells) > 7 else ''

        valores_observados['motor_lh_sn'].add(m1_sn)
        valores_observados['motor_lh_pn'].add(m1_pn)
        valores_observados['motor_rh_sn'].add(m2_sn)
        valores_observados['motor_rh_pn'].add(m2_pn)
        valores_observados['helice_lh_sn'].add(h1_sn)
        valores_observados['helice_lh_pn'].add(h1_pn)
        valores_observados['helice_rh_sn'].add(h2_sn)
        valores_observados['helice_rh_pn'].add(h2_pn)
        if airframe_sn:
            valores_observados['celula_sn'].add(airframe_sn)

        if p_idx == 1:
            datos_primera_pagina = {
                'motor_lh_sn': m1_sn,
                'motor_lh_pn': m1_pn,
                'motor_rh_sn': m2_sn,
                'motor_rh_pn': m2_pn,
                'helice_lh_sn': h1_sn,
                'helice_lh_pn': h1_pn,
                'helice_rh_sn': h2_sn,
                'helice_rh_pn': h2_pn,
                'celula_sn': airframe_sn
            }

        # Comprobación de conformidad con referencia
        fallos_pagina = []
        if m1_pn != ref_motor_lh['pn']:
            fallos_pagina.append(f"Motor LH P/N '{m1_pn}' != esperado '{ref_motor_lh['pn']}'")
        if not _coincide_sn(m1_sn, ref_motor_lh['sn']):
            fallos_pagina.append(f"Motor LH S/N '{m1_sn}' != esperado '{ref_motor_lh['sn']}'")

        if m2_pn != ref_motor_rh['pn']:
            fallos_pagina.append(f"Motor RH P/N '{m2_pn}' != esperado '{ref_motor_rh['pn']}'")
        if not _coincide_sn(m2_sn, ref_motor_rh['sn']):
            fallos_pagina.append(f"Motor RH S/N '{m2_sn}' != esperado '{ref_motor_rh['sn']}'")

        if h1_pn != ref_helice_lh['pn']:
            fallos_pagina.append(f"Hélice LH P/N '{h1_pn}' != esperado '{ref_helice_lh['pn']}'")
        if not _coincide_sn(h1_sn, ref_helice_lh['sn']):
            fallos_pagina.append(f"Hélice LH S/N '{h1_sn}' != esperado '{ref_helice_lh['sn']}'")

        if h2_pn != ref_helice_rh['pn']:
            fallos_pagina.append(f"Hélice RH P/N '{h2_pn}' != esperado '{ref_helice_rh['pn']}'")
        if not _coincide_sn(h2_sn, ref_helice_rh['sn']):
            fallos_pagina.append(f"Hélice RH S/N '{h2_sn}' != esperado '{ref_helice_rh['sn']}'")

        ref_celula_sn = ref_aero.get('sn_celula', '')
        if ref_celula_sn and not _coincide_sn(airframe_sn, ref_celula_sn):
            fallos_pagina.append(f"Célula S/N '{airframe_sn}' != esperado '{ref_celula_sn}'")

        if fallos_pagina:
            paginas_con_error.append(p_idx)
            # Solo añadir detalle de las primeras 3 páginas discrepantes para no saturar
            if len(paginas_con_error) <= 3:
                discrepancias.append(f"Página {p_idx}: " + "; ".join(fallos_pagina))

    # Comprobar coherencia interna (¿todas las 100 páginas tienen los mismos valores?)
    inconsistencias_internas = []
    for campo, vals in valores_observados.items():
        if len(vals) > 1:
            inconsistencias_internas.append(f"El campo '{campo}' varía entre páginas: {list(vals)}")

    if inconsistencias_internas:
        discrepancias.extend(inconsistencias_internas)

    # Resumen de componentes
    ref_celula_sn = ref_aero.get('sn_celula', '')
    sn_celula_enc = datos_primera_pagina.get('celula_sn', '')
    celula_ok = _coincide_sn(sn_celula_enc, ref_celula_sn) if ref_celula_sn else bool(sn_celula_enc)

    detalles_componentes = {
        'motor_lh': {
            'nombre': 'Motor LH (Engine 1)',
            'pn_esperado': ref_motor_lh['pn'],
            'pn_encontrado': datos_primera_pagina.get('motor_lh_pn', ''),
            'pn_ok': datos_primera_pagina.get('motor_lh_pn', '') == ref_motor_lh['pn'],
            'sn_esperado': ref_motor_lh['sn'],
            'sn_encontrado': datos_primera_pagina.get('motor_lh_sn', ''),
            'sn_ok': _coincide_sn(datos_primera_pagina.get('motor_lh_sn', ''), ref_motor_lh['sn']),
        },
        'motor_rh': {
            'nombre': 'Motor RH (Engine 2)',
            'pn_esperado': ref_motor_rh['pn'],
            'pn_encontrado': datos_primera_pagina.get('motor_rh_pn', ''),
            'pn_ok': datos_primera_pagina.get('motor_rh_pn', '') == ref_motor_rh['pn'],
            'sn_esperado': ref_motor_rh['sn'],
            'sn_encontrado': datos_primera_pagina.get('motor_rh_sn', ''),
            'sn_ok': _coincide_sn(datos_primera_pagina.get('motor_rh_sn', ''), ref_motor_rh['sn']),
        },
        'helice_lh': {
            'nombre': 'Hélice LH (Propeller 1)',
            'pn_esperado': ref_helice_lh['pn'],
            'pn_encontrado': datos_primera_pagina.get('helice_lh_pn', ''),
            'pn_ok': datos_primera_pagina.get('helice_lh_pn', '') == ref_helice_lh['pn'],
            'sn_esperado': ref_helice_lh['sn'],
            'sn_encontrado': datos_primera_pagina.get('helice_lh_sn', ''),
            'sn_ok': _coincide_sn(datos_primera_pagina.get('helice_lh_sn', ''), ref_helice_lh['sn']),
        },
        'helice_rh': {
            'nombre': 'Hélice RH (Propeller 2)',
            'pn_esperado': ref_helice_rh['pn'],
            'pn_encontrado': datos_primera_pagina.get('helice_rh_pn', ''),
            'pn_ok': datos_primera_pagina.get('helice_rh_pn', '') == ref_helice_rh['pn'],
            'sn_esperado': ref_helice_rh['sn'],
            'sn_encontrado': datos_primera_pagina.get('helice_rh_sn', ''),
            'sn_ok': _coincide_sn(datos_primera_pagina.get('helice_rh_sn', ''), ref_helice_rh['sn']),
        },
        'celula': {
            'nombre': 'Célula / Airframe (MSN)',
            'pn_esperado': 'N/A',
            'pn_encontrado': 'N/A',
            'pn_ok': True,
            'sn_esperado': ref_celula_sn if ref_celula_sn else 'N/A',
            'sn_encontrado': sn_celula_enc,
            'sn_ok': celula_ok,
            'msn_esperado': ref_celula_sn if ref_celula_sn else 'N/A',
            'msn_encontrado': sn_celula_enc
        }
    }

    # Comprobación de accesorios (Imagen 1)
    # Verificar si el documento Word contiene celdas para accesorios
    all_text_upper = ' '.join([t.text.upper() for t in root.iter(f'{W_NS}t') if t.text])
    accesorios_encontrados_en_docx = False
    for kw in ['ALTERNADOR', 'HIGH PRESSURE PUMP', 'FEED PUMP', 'GEARBOX', 'BOMBA ALTA PRESION']:
        if kw in all_text_upper:
            accesorios_encontrados_en_docx = True
            break

    if not accesorios_encontrados_en_docx:
        avisos.append(
            "La plantilla actual de Word NO dispone de campos para los accesorios 14V "
            "(Alternador, Bomba Alta Presión, Bomba Alimentación, Reductora). "
            "Se conserva la tabla de referencia para verificación o futura incorporación."
        )

    todos_componentes_ok = all([
        detalles_componentes['motor_lh']['pn_ok'],
        detalles_componentes['motor_lh']['sn_ok'],
        detalles_componentes['motor_rh']['pn_ok'],
        detalles_componentes['motor_rh']['sn_ok'],
        detalles_componentes['helice_lh']['pn_ok'],
        detalles_componentes['helice_lh']['sn_ok'],
        detalles_componentes['helice_rh']['pn_ok'],
        detalles_componentes['helice_rh']['sn_ok'],
        detalles_componentes['celula']['sn_ok'],
    ]) and len(inconsistencias_internas) == 0

    return {
        "status": "ok" if todos_componentes_ok else "discrepancia",
        "es_valido": todos_componentes_ok,
        "archivo": fname,
        "ruta_completa": os.path.abspath(docx_path),
        "aeronave": aeronave,
        "matricula_anterior": ref_aero.get('matricula_anterior') or ref_aero.get('matricula_historica'),
        "matricula_historica": ref_aero.get('matricula_anterior') or ref_aero.get('matricula_historica'),
        "total_paginas": total_paginas,
        "paginas_consistentes": len(inconsistencias_internas) == 0,
        "total_paginas_discrepantes": len(paginas_con_error),
        "detalles_componentes": detalles_componentes,
        "accesorios_referencia": {
            "disponibles": TABLA_REFERENCIA_ACCESORIOS,
            "presentes_en_word": accesorios_encontrados_en_docx,
            "nota": "S/N de accesorios extraídos del status oficial de OKC."
        },
        "discrepancias": discrepancias,
        "avisos": avisos,
        "errores": []
    }


def verificar_todos_los_atl(directorio="Sequencia ATL"):
    """
    Verifica todos los documentos Word (.docx) presentes en la carpeta dada.
    
    :param directorio: Carpeta con los talonarios
    :return: dict con el resumen y la lista de comprobaciones individuales
    """
    if not os.path.isdir(directorio):
        return {
            "status": "error",
            "directorio": directorio,
            "total": 0,
            "error": f"Directorio no encontrado: {directorio}"
        }

    archivos = sorted(glob.glob(os.path.join(directorio, "*.docx")))
    archivos = [a for a in archivos if not os.path.basename(a).startswith("~$") and not a.endswith(".bak")]

    resultados = []
    con_discrepancias = 0
    correctos = 0

    for a in archivos:
        res = verificar_atl_documento(a)
        resultados.append(res)
        if res.get("es_valido"):
            correctos += 1
        else:
            con_discrepancias += 1

    return {
        "status": "ok",
        "directorio": os.path.abspath(directorio),
        "total_talonarios": len(archivos),
        "correctos": correctos,
        "con_discrepancias": con_discrepancias,
        "documentos": resultados
    }


# ==============================================================================
# CLI / EJECUCIÓN DIRECTA EN CONSOLA
# ==============================================================================

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Comprobar P/N y S/N en talonarios ATL Word.")
    parser.add_argument("--archivo", "-a", help="Ruta a un archivo .docx específico")
    parser.add_argument("--carpeta", "-c", default="Sequencia ATL", help="Carpeta con archivos .docx")
    parser.add_argument("--todos", "-t", action="store_true", help="Comprobar todos los talonarios")

    args = parser.parse_args()

    # Si se pasa un archivo específico
    if args.archivo:
        res = verificar_atl_documento(args.archivo)
        print("\n" + "=" * 70)
        print(f"  VERIFICACIÓN TÉCNICA ATL: {res['archivo']}")
        print("=" * 70)
        mat_ant = res.get('matricula_anterior') or res.get('matricula_historica')
        print(f" Aeronave:     {res.get('aeronave', 'N/A')}" + (f" (Matrícula Anterior: {mat_ant})" if mat_ant else ""))
        print(f" Total págs:   {res.get('total_paginas', 0)}")
        print(f" Estado:       {'✅ VÁLIDO (Todo correcto)' if res.get('es_valido') else '⚠️ CON DISCREPANCIAS'}")
        
        print("\n ⚙️ DETALLE COMPONENTES (ENCONTRADO vs ESPERADO):")
        for k, comp in res.get('detalles_componentes', {}).items():
            if k == 'celula':
                sn_icon = "✅" if comp['sn_ok'] else "❌"
                print(f"   • {comp['nombre']:<24}: S/N {sn_icon} Encontrado: '{comp.get('sn_encontrado')}' | Esperado: '{comp.get('sn_esperado')}'")
                continue
            pn_icon = "✅" if comp['pn_ok'] else "❌"
            sn_icon = "✅" if comp['sn_ok'] else "❌"
            print(f"   • {comp['nombre']:<24}:")
            print(f"       - P/N {pn_icon} Encontrado: '{comp['pn_encontrado']}' | Esperado: '{comp['pn_esperado']}'")
            print(f"       - S/N {sn_icon} Encontrado: '{comp['sn_encontrado']}' | Esperado: '{comp['sn_esperado']}'")

        if res.get('avisos'):
            print("\n ℹ️ AVISOS:")
            for av in res['avisos']:
                print(f"   ⚠️  {av}")

        if res.get('discrepancias'):
            print("\n ❌ DISCREPANCIAS ENCONTRADAS:")
            for d in res['discrepancias']:
                print(f"   - {d}")
        print("=" * 70 + "\n")

    else:
        # Por defecto o con --todos: verificar toda la carpeta
        res_global = verificar_todos_los_atl(args.carpeta)
        print("\n" + "=" * 75)
        print("  INFORME DE VERIFICACIÓN DE P/N Y S/N EN TALONARIOS ATL")
        print("=" * 75)
        print(f" Carpeta:           {res_global['directorio']}")
        print(f" Total talonarios:  {res_global['total_talonarios']}")
        print(f" Talonarios OK:     {res_global['correctos']}")
        print(f" Con discrepancias: {res_global['con_discrepancias']}")
        print("-" * 75)

        for d in res_global.get('documentos', []):
            icon = "✅" if d.get("es_valido") else "❌"
            mat_ant = d.get('matricula_anterior') or d.get('matricula_historica')
            ant_str = f" [Ant: {mat_ant}]" if mat_ant else ""
            print(f" {icon} {d.get('aeronave', 'N/A')}{ant_str:<18} | {d['archivo']:<42} | {d.get('total_paginas', 0)} págs")
            if not d.get("es_valido") and d.get("discrepancias"):
                for disc in d["discrepancias"][:2]:
                    print(f"     ⚠️  {disc}")

        print("\n 📦 REFERENCIA DE ACCESORIOS 14V (STATUS OKC):")
        for k, v in TABLA_REFERENCIA_ACCESORIOS.items():
            print(f"   • {v['descripcion']:<28}: P/N {v['pn']} | S/N {v['sn_okc']}")
        print("   ℹ️  Nota: Las plantillas actuales de Word no contienen celdas de accesorios.")
        print("=" * 75 + "\n")
