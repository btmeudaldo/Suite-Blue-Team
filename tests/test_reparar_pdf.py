import os
import sys
import unittest
import pymupdf
from rapidocr_onnxruntime import RapidOCR

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

import reparar_pdf_service as rps


class TestRepararPDF(unittest.TestCase):

    def setUp(self):
        self.sample_pdf = os.path.join(
            BASE_DIR, "Repara PDF", "Jonathan Furtado.DOCUMENTACIÓN EXAMEN.pdf"
        )
        self.output_pdf = os.path.join(
            BASE_DIR, "Repara PDF", "Reparados", "TEST_JONATHAN_REPARADO.pdf"
        )

    def test_analizar_pdf(self):
        self.assertTrue(os.path.exists(self.sample_pdf), "El PDF de muestra debe existir")
        stats = rps.analizar_pdf(self.sample_pdf)
        
        self.assertEqual(stats["total_paginas"], 13)
        self.assertTrue(stats["es_formulario"])
        self.assertGreater(stats["total_widgets"], 100)
        self.assertEqual(stats["streams_con_bug_macos"], 102, "Debe detectar los 102 streams con el bug de macOS")
        self.assertTrue(stats["requiere_reparacion"])

    def test_reparar_pdf_completo(self):
        res = rps.reparar_pdf(
            self.sample_pdf,
            nombre_base="TEST_JONATHAN.pdf",
            eliminar_duplicados=True,
            aplanar_aesa=True,
            guardar_en_descargas=False
        )

        self.assertEqual(res["status"], "ok")
        self.assertEqual(res["streams_reparados"], 102)
        self.assertTrue(res["fue_aplanado"])
        self.assertTrue(os.path.exists(res["ruta_guardada"]))

        # Verificar el documento generado
        doc = pymupdf.open(res["ruta_guardada"])
        self.assertEqual(len(doc), 13)
        self.assertFalse(doc.is_form_pdf, "No debe ser formulario interactivo tras aplanar AESA")

        stats_despues = res["stats_despues"]
        self.assertEqual(stats_despues["streams_con_bug_macos"], 0)
        self.assertEqual(stats_despues["total_widgets"], 0)

        # Prueba OCR en la zona del nombre y apellidos
        pix = doc[0].get_pixmap(dpi=150)
        temp_img = os.path.join(BASE_DIR, "temp_ocr_test.png")
        pix.save(temp_img)

        ocr = RapidOCR()
        ocr_res, _ = ocr(temp_img)
        text_lines = [r[1] for r in (ocr_res or [])]
        joined = " ".join(text_lines)

        self.assertIn("Jonathan", joined)
        self.assertIn("Furtado", joined)
        self.assertNotIn("Jdoaathan", joined, "No debe haber duplicación corrupta tipo Jdoaathan")

        doc.close()
        if os.path.exists(temp_img):
            os.remove(temp_img)
        if os.path.exists(res["ruta_guardada"]):
            os.remove(res["ruta_guardada"])

    def test_listar_archivos(self):
        archivos = rps.listar_archivos_carpeta_repara()
        self.assertIsInstance(archivos, list)
        self.assertGreater(len(archivos), 0)
        nombres = [a["nombre"] for a in archivos]
        self.assertIn("Jonathan Furtado.DOCUMENTACIÓN EXAMEN.pdf", nombres)


if __name__ == "__main__":
    unittest.main()
