#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Módulo y herramienta CLI para renumerar documentos Word (.docx) de secuencias ATL.
Específico para talonarios técnicos de aeronaves (NNA, NNX, OKC, OKM, OMS, OXT, OXV).
No requiere dependencias externas (usa zipfile y xml.etree.ElementTree nativos).
"""

import os
import sys
import glob
import re
import shutil
import zipfile
import xml.etree.ElementTree as ET

W_NS = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

# Registrar namespaces para preservar formato XML exacto de Word
ET.register_namespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
ET.register_namespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
ET.register_namespace('m', 'http://schemas.openxmlformats.org/officeDocument/2006/math')
ET.register_namespace('v', 'urn:schemas-microsoft-com:vml')
ET.register_namespace('wp', 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing')
ET.register_namespace('w10', 'urn:schemas-microsoft-com:office:word')
ET.register_namespace('w14', 'http://schemas.microsoft.com/office/word/2010/wordml')

def extraer_info_documento(docx_path):
    """
    Analiza un documento docx y devuelve el número de páginas/partes detectadas,
    el prefijo sugerido (ej: 'LOG H-') y muestras del estado actual.
    """
    if not os.path.isfile(docx_path):
        raise FileNotFoundError(f"No existe el archivo: {docx_path}")

    filename = os.path.basename(docx_path)
    # Detectar aeronave del nombre de archivo (ej. OXV de "OXV. AIRCRAFT...")
    aeronave_match = re.match(r"^([A-Z]{3})", filename, re.IGNORECASE)
    aeronave = f"EC-{aeronave_match.group(1).upper()}" if aeronave_match else filename.split('.')[0]

    with zipfile.ZipFile(docx_path, 'r') as z:
        if 'word/document.xml' not in z.namelist():
            raise ValueError(f"El archivo {docx_path} no es un documento docx válido.")
        doc_xml = z.read('word/document.xml')

    root = ET.fromstring(doc_xml)
    log_paragraphs = []
    for p in root.iter(f'{W_NS}p'):
        text = ''.join(p.itertext()).strip()
        if ('LOG ' in text or text.startswith('LOG')) and 'AIRCRAFT TECHNICAL LOG' not in text:
            log_paragraphs.append(text)

    # Detectar prefijo
    prefix = "LOG H-"
    first_sample = log_paragraphs[0] if log_paragraphs else ""
    last_sample = log_paragraphs[-1] if log_paragraphs else ""

    m = re.search(r'(LOG\s+[A-Z]\s*[-–]?)', first_sample, re.IGNORECASE)
    if m:
        prefix = m.group(1).strip()
        if not prefix.endswith('-'):
            prefix += '-'

    return {
        "archivo": filename,
        "ruta_completa": os.path.abspath(docx_path),
        "aeronave": aeronave,
        "total_paginas": len(log_paragraphs),
        "prefijo_detectado": prefix,
        "muestra_inicio": first_sample,
        "muestra_fin": last_sample,
        "tamano_bytes": os.path.getsize(docx_path),
        "fecha_modificacion": os.path.getmtime(docx_path)
    }

def renumerar_documento(docx_path, start_num=1, prefix=None, digits=4, backup=True, output_path=None):
    """
    Renumera las páginas de un archivo docx secuencialmente desde start_num.
    
    :param docx_path: Ruta al archivo .docx
    :param start_num: Número entero desde el cual comenzar (ej: 1 o 1101)
    :param prefix: Prefijo (ej: 'LOG H-'). Si es None, se autodetecta.
    :param digits: Cantidad de dígitos con relleno de ceros (por defecto 4 -> '0001')
    :param backup: Si es True y se sobrescribe, crea una copia .bak
    :param output_path: Ruta de salida. Si es None, sobrescribe docx_path.
    :return: dict con el resultado de la operación
    """
    if not os.path.isfile(docx_path):
        raise FileNotFoundError(f"No existe el archivo: {docx_path}")

    start_num = int(start_num)
    digits = int(digits)

    # Cargar todos los archivos internos del zip en memoria
    with zipfile.ZipFile(docx_path, 'r') as zin:
        file_map = {item.filename: zin.read(item.filename) for item in zin.infolist()}

    if 'word/document.xml' not in file_map:
        raise ValueError("El archivo no contiene 'word/document.xml'.")

    root = ET.fromstring(file_map['word/document.xml'])

    # Encontrar párrafos de LOG
    matches = []
    for p in root.iter(f'{W_NS}p'):
        text = ''.join(p.itertext()).strip()
        if ('LOG ' in text or text.startswith('LOG')) and 'AIRCRAFT TECHNICAL LOG' not in text:
            matches.append(p)

    if not matches:
        raise ValueError("No se encontraron párrafos de cabecera 'LOG' en el documento.")

    # Si no se pasó prefijo, detectarlo del primer párrafo
    if not prefix:
        first_t = ''.join(matches[0].itertext()).strip()
        m = re.search(r'(LOG\s+[A-Z]\s*[-–]?)', first_t, re.IGNORECASE)
        if m:
            prefix = m.group(1).strip()
            if not prefix.endswith('-'):
                prefix += '-'
        else:
            prefix = "LOG H-"

    primer_resultado = ""
    ultimo_resultado = ""

    # Renumerar cada párrafo secuencialmente
    for i, p in enumerate(matches):
        num_val = start_num + i
        formatted_str = f"{prefix}{num_val:0{digits}d}"

        if i == 0:
            primer_resultado = formatted_str
        if i == len(matches) - 1:
            ultimo_resultado = formatted_str

        # Preservar pPr (alineación centrada, márgenes)
        pPr = p.find(f'{W_NS}pPr')

        # Limpiar elementos previos (campos dinámicos PAGE, SEQ, textos viejos)
        children = list(p)
        for c in children:
            p.remove(c)

        if pPr is not None:
            p.append(pPr)

        # Crear nuevo run con formato idéntico (fuente Asap, negrita)
        new_r = ET.Element(f'{W_NS}r')
        new_rPr = ET.SubElement(new_r, f'{W_NS}rPr')
        fonts = ET.SubElement(new_rPr, f'{W_NS}rFonts')
        fonts.set(f'{W_NS}ascii', 'Asap')
        fonts.set(f'{W_NS}hAnsi', 'Asap')
        ET.SubElement(new_rPr, f'{W_NS}b')
        ET.SubElement(new_rPr, f'{W_NS}bCs')

        new_t = ET.SubElement(new_r, f'{W_NS}t')
        new_t.text = formatted_str
        p.append(new_r)

    # Serializar XML modificado
    new_doc_xml = ET.tostring(root, encoding='utf-8', xml_declaration=True)
    file_map['word/document.xml'] = new_doc_xml

    # Determinar destino
    target_path = output_path if output_path else docx_path
    aviso_bloqueo = None

    # Escribir en memoria primero el zip completo
    import io
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zout:
        for fname, data in file_map.items():
            zout.writestr(fname, data)
    zip_bytes = zip_buffer.getvalue()

    # Intentar guardar en destino
    try:
        # Si sobrescribe y se pide backup, crear .bak si no existe uno ya
        if backup and os.path.abspath(target_path) == os.path.abspath(docx_path):
            bak_path = docx_path + ".bak"
            if not os.path.exists(bak_path):
                try:
                    shutil.copy2(docx_path, bak_path)
                except Exception:
                    pass

        with open(target_path, "wb") as f:
            f.write(zip_bytes)

    except (PermissionError, OSError) as e:
        # El archivo está abierto en Microsoft Word u otra aplicación
        dir_name = os.path.dirname(target_path)
        base_name, ext = os.path.splitext(os.path.basename(target_path))
        target_path = os.path.join(dir_name, f"{base_name}_renumerado{ext}")
        with open(target_path, "wb") as f:
            f.write(zip_bytes)
        aviso_bloqueo = (
            f"El archivo original está abierto en Microsoft Word. "
            f"Para no bloquearte, se guardó como '{os.path.basename(target_path)}'. "
            f"Si deseas sobrescribir el original directamente, ciérralo en Word y pulsa de nuevo."
        )

    # Limpiar archivo temporal si quedó alguno
    tmp_candidate = (output_path if output_path else docx_path) + ".tmp"
    if os.path.exists(tmp_candidate):
        try:
            os.remove(tmp_candidate)
        except Exception:
            pass

    return {
        "status": "ok",
        "archivo": os.path.basename(target_path),
        "ruta": target_path,
        "paginas_procesadas": len(matches),
        "prefijo": prefix,
        "inicio": start_num,
        "fin": start_num + len(matches) - 1,
        "secuencia": f"{primer_resultado} -> {ultimo_resultado}",
        "primer_registro": primer_resultado,
        "ultimo_registro": ultimo_resultado,
        "aviso": aviso_bloqueo
    }

def listar_documentos_carpeta(directorio="Sequencia ATL"):
    """Lista todos los archivos docx de la carpeta dada con su información."""
    if not os.path.isdir(directorio):
        return []

    archivos = sorted(glob.glob(os.path.join(directorio, "*.docx")))
    # Ignorar archivos temporales de Word que empiezan por ~$
    archivos = [a for a in archivos if not os.path.basename(a).startswith("~$")]

    resultados = []
    for a in archivos:
        try:
            info = extraer_info_documento(a)
            resultados.append(info)
        except Exception as e:
            print(f"Error analizando {a}: {e}")
    return resultados

# Modo interactivo / CLI
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Renumerar secuencialmente talonarios Word ATL.")
    parser.add_argument("--archivo", "-a", help="Ruta al archivo .docx a renumerar")
    parser.add_argument("--carpeta", "-c", default="Sequencia ATL", help="Carpeta con archivos .docx")
    parser.add_argument("--inicio", "-i", type=int, default=1, help="Número inicial de la secuencia (ej: 1)")
    parser.add_argument("--prefijo", "-p", help="Prefijo personalizado (ej: 'LOG H-')")
    parser.add_argument("--digitos", "-d", type=int, default=4, help="Dígitos de relleno con ceros (ej: 4)")
    parser.add_argument("--todos", action="store_true", help="Renumerar todos los archivos en la carpeta")

    args = parser.parse_args()

    if args.todos:
        docs = listar_documentos_carpeta(args.carpeta)
        if not docs:
            print(f"No se encontraron archivos .docx en {args.carpeta}")
            sys.exit(1)
        print(f"\nRenumerando {len(docs)} archivos en lote desde el número {args.inicio}...")
        for d in docs:
            res = renumerar_documento(
                d["ruta_completa"],
                start_num=args.inicio,
                prefix=args.prefijo or d["prefijo_detectado"],
                digits=args.digitos
            )
            print(f" [OK] {d['aeronave']:<8} | {res['archivo']}: {res['secuencia']} ({res['paginas_procesadas']} págs)")
        print("\n¡Todos los documentos han sido renumerados correctamente!")

    elif args.archivo:
        res = renumerar_documento(
            args.archivo,
            start_num=args.inicio,
            prefix=args.prefijo,
            digits=args.digitos
        )
        print(f"\n[OK] Documento renumerado con éxito:")
        print(f"Archivo:    {res['archivo']}")
        print(f"Secuencia:  {res['secuencia']}")
        print(f"Total págs: {res['paginas_procesadas']}")

    else:
        # Menú interactivo
        print("=" * 60)
        print("  RENUMERADOR SECUENCIAL DE TALONARIOS ATL (WORD)")
        print("=" * 60)
        docs = listar_documentos_carpeta(args.carpeta)
        if not docs:
            print(f"No se encontraron archivos en la carpeta '{args.carpeta}'.")
            sys.exit(0)

        print(f"\nArchivos detectados en '{args.carpeta}':")
        for idx, d in enumerate(docs, 1):
            print(f"  [{idx}] {d['aeronave']:<8} | {d['archivo']:<40} | Prefijo: {d['prefijo_detectado']}")

        print(f"  [T] Procesar TODOS los archivos")
        print(f"  [Q] Salir")

        opc = input("\nSelecciona un número de archivo o 'T' para todos: ").strip().upper()
        if opc == 'Q':
            sys.exit(0)

        num_str = input("Número inicial de la secuencia [por defecto 1]: ").strip()
        start_val = int(num_str) if num_str.isdigit() else 1

        if opc == 'T':
            for d in docs:
                res = renumerar_documento(d["ruta_completa"], start_num=start_val, prefix=d["prefijo_detectado"])
                print(f" -> {res['archivo']}: {res['secuencia']}")
            print("\n¡Completado con éxito!")
        elif opc.isdigit() and 1 <= int(opc) <= len(docs):
            sel = docs[int(opc) - 1]
            pref_input = input(f"Prefijo a utilizar [Enter para '{sel['prefijo_detectado']}']: ").strip()
            pref_val = pref_input if pref_input else sel['prefijo_detectado']
            res = renumerar_documento(sel["ruta_completa"], start_num=start_val, prefix=pref_val)
            print(f"\n¡Éxito! {res['archivo']} -> {res['secuencia']} ({res['paginas_procesadas']} páginas)")
        else:
            print("Opción no válida.")
