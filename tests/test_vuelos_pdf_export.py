import ast
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import urllib.parse
import unittest
from unittest.mock import patch


class FlightPdfExportTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        tree = ast.parse(Path("server.py").read_text(encoding="utf-8"))
        functions = [
            node for node in tree.body
            if isinstance(node, ast.FunctionDef) and node.name in ("save_flight_pdf", "save_flight_excel", "save_flight_image", "reveal_file_in_explorer")
        ]
        handler = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "ExamHandler")
        do_post = next(node for node in handler.body if isinstance(node, ast.FunctionDef) and node.name == "do_POST")
        do_post.decorator_list = []
        handler = ast.ClassDef(name="ExamHandler", bases=[], keywords=[], body=[do_post], decorator_list=[])
        self.ns = {
            "os": os,
            "re": __import__("re"),
            "json": json,
            "urllib": urllib,
            "subprocess": subprocess,
            "BASE_DIR": self.temporary.name
        }
        module = ast.Module(body=functions + [handler], type_ignores=[])
        exec(compile(ast.fix_missing_locations(module), "server.py", "exec"), self.ns)

    def test_server_saves_the_pdf_and_reveals_the_file_in_explorer(self):
        source = Path("server.py").read_text(encoding="utf-8")

        self.assertIn('elif path == "/api/vuelos/guardar_pdf":', source)
        self.assertIn("save_flight_pdf(body, filename)", source)
        self.assertIn('elif path == "/api/vuelos/guardar_excel":', source)
        self.assertIn("save_flight_excel(body, filename)", source)
        self.assertIn("reveal_file_in_explorer(saved_path)", source)

    def request(self, pdf_bytes, filename, endpoint="/api/vuelos/guardar_pdf"):
        response = {}

        class Request:
            path = endpoint
            headers = {
                "Content-Length": str(len(pdf_bytes)),
                "X-Filename": urllib.parse.quote(filename)
            }
            rfile = io.BytesIO(pdf_bytes)

            def send_json(inner, data, status=200):
                response.update(data=data, status=status)

        self.ns["ExamHandler"].do_POST(Request())
        return response

    def test_endpoint_writes_pdf_to_downloads_and_selects_it_in_explorer(self):
        downloads = Path(self.temporary.name) / "Downloads"
        downloads.mkdir()
        pdf_bytes = b"%PDF-1.4 test"

        with patch("os.path.expanduser", return_value=self.temporary.name), patch.object(subprocess, "Popen") as open_explorer:
            response = self.request(pdf_bytes, "Informe_28-09-2026.pdf")

        saved_path = downloads / "Informe_28-09-2026.pdf"
        self.assertEqual(response["status"], 200)
        self.assertEqual(response["data"]["status"], "ok")
        self.assertEqual(Path(response["data"]["ruta"]), saved_path)
        self.assertEqual(saved_path.read_bytes(), pdf_bytes)
        self.assertEqual(response["data"]["ubicacion"], "Descargas")
        self.assertTrue(response["data"]["explorer_opened"])
        open_explorer.assert_called_once_with(["explorer.exe", f"/select,{saved_path}"])

    def test_endpoint_writes_excel_to_downloads_and_selects_it_in_explorer(self):
        downloads = Path(self.temporary.name) / "Downloads"
        downloads.mkdir()
        excel_bytes = b"PK\x03\x04fake-xlsx-zip-content"

        with patch("os.path.expanduser", return_value=self.temporary.name), patch.object(subprocess, "Popen") as open_explorer:
            response = self.request(excel_bytes, "Desviacion_Vuelos_28-09-2026.xlsx", endpoint="/api/vuelos/guardar_excel")

        saved_path = downloads / "Desviacion_Vuelos_28-09-2026.xlsx"
        self.assertEqual(response["status"], 200)
        self.assertEqual(response["data"]["status"], "ok")
        self.assertEqual(Path(response["data"]["ruta"]), saved_path)
        self.assertEqual(saved_path.read_bytes(), excel_bytes)
        self.assertEqual(response["data"]["ubicacion"], "Descargas")
        self.assertTrue(response["data"]["explorer_opened"])
        open_explorer.assert_called_once_with(["explorer.exe", f"/select,{saved_path}"])

    def test_endpoint_writes_image_to_downloads_and_selects_it_in_explorer(self):
        downloads = Path(self.temporary.name) / "Downloads"
        downloads.mkdir()
        png_bytes = b"\x89PNG\r\n\x1a\nfake-png-content"

        with patch("os.path.expanduser", return_value=self.temporary.name), patch.object(subprocess, "Popen") as open_explorer:
            response = self.request(png_bytes, "Desviacion_Vuelos_28-09-2026.png", endpoint="/api/vuelos/guardar_imagen")

        saved_path = downloads / "Desviacion_Vuelos_28-09-2026.png"
        self.assertEqual(response["status"], 200)
        self.assertEqual(response["data"]["status"], "ok")
        self.assertEqual(Path(response["data"]["ruta"]), saved_path)
        self.assertEqual(saved_path.read_bytes(), png_bytes)
        self.assertEqual(response["data"]["ubicacion"], "Descargas")
        self.assertTrue(response["data"]["explorer_opened"])
        open_explorer.assert_called_once_with(["explorer.exe", f"/select,{saved_path}"])

    def test_endpoint_rejects_non_pdf_data(self):
        with patch("os.path.expanduser", return_value=self.temporary.name):
            response = self.request(b"not a PDF", "Informe.pdf")

        self.assertEqual(response["status"], 400)
        self.assertEqual(response["data"]["status"], "error")
        self.assertFalse(list(Path(self.temporary.name).rglob("*.pdf")))

    def test_saved_filename_cannot_escape_downloads_directory(self):
        target = self.ns["save_flight_pdf"](b"%PDF-1.4 test", "../../outside.pdf", self.temporary.name)
        self.assertEqual(Path(target), Path(self.temporary.name) / "outside.pdf")

    def test_save_falls_back_to_app_folder_when_downloads_is_denied(self):
        downloads = Path(self.temporary.name) / "Downloads"
        downloads.mkdir()
        actual_replace = os.replace

        def replace_or_deny_downloads(source, destination):
            if Path(destination).parent == downloads:
                raise PermissionError(13, "Permission denied", str(downloads))
            actual_replace(source, destination)

        with patch("os.path.expanduser", return_value=self.temporary.name), patch("os.replace", side_effect=replace_or_deny_downloads):
            target = self.ns["save_flight_pdf"](b"%PDF-1.4 test", "Informe.pdf")

        fallback = Path(self.temporary.name) / "Informes_Vuelos" / "Informe.pdf"
        self.assertEqual(Path(target), fallback)
        self.assertEqual(fallback.read_bytes(), b"%PDF-1.4 test")

    def test_endpoint_reports_and_reveals_fallback_when_downloads_is_denied(self):
        downloads = Path(self.temporary.name) / "Downloads"
        downloads.mkdir()
        actual_replace = os.replace

        def replace_or_deny_downloads(source, destination):
            if Path(destination).parent == downloads:
                raise PermissionError(13, "Permission denied", str(downloads))
            actual_replace(source, destination)

        with patch("os.path.expanduser", return_value=self.temporary.name), patch("os.replace", side_effect=replace_or_deny_downloads), patch.object(subprocess, "Popen") as open_explorer:
            response = self.request(b"%PDF-1.4 test", "Informe.pdf")

        fallback = Path(self.temporary.name) / "Informes_Vuelos" / "Informe.pdf"
        self.assertEqual(response["status"], 200)
        self.assertEqual(response["data"]["ubicacion"], "Informes_Vuelos")
        self.assertEqual(Path(response["data"]["ruta"]), fallback)
        self.assertEqual(fallback.read_bytes(), b"%PDF-1.4 test")
        open_explorer.assert_called_once_with(["explorer.exe", f"/select,{fallback}"])
