import ast
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
import urllib.parse
from unittest.mock import patch


class RenameTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.ns = {"os": os, "json": json, "urllib": urllib}
        tree = ast.parse(Path("server.py").read_text(encoding="utf-8"))
        nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef)]
        handler = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "ExamHandler")
        nodes.append(next(node for node in handler.body if isinstance(node, ast.FunctionDef) and node.name == "do_POST"))
        exec(compile(ast.fix_missing_locations(ast.Module(body=nodes, type_ignores=[])), "server.py", "exec"), self.ns)

    def configure(self, atl):
        root = Path(self.temp.name) / str(atl)
        root.mkdir(exist_ok=True)
        self.source = root / "source"
        self.output = root / "output"
        self.source.mkdir(exist_ok=True)
        self.output.mkdir(exist_ok=True)
        prefix = "ATL_" if atl else ""
        self.ns[prefix + "DIVIDIDOS_DIR"] = str(self.source)
        self.ns[prefix + "RENOMBRADOS_DIR"] = str(self.output)
        self.ns[prefix + "STATE_FILE"] = str(root / "state.json")
        self.save_name = "save_atl_state" if atl else "save_state"
        self.load_name = "load_atl_state" if atl else "load_state"
        self.atl = atl
        self.target = self.output if atl else self.output / "1"
        self.target.mkdir(exist_ok=True)

    def item(self, identity, name="same.pdf"):
        return {"id": identity, "nombre_final": name, "sesion": "1", "fecha": "260917", "avion": "TEST", "log_numero": "LOG0001"}

    def request(self, items):
        payload = {"ids": [item["id"] for item in items]} if self.atl else {"items": items}
        body = json.dumps(payload).encode()
        class Request:
            path = "/api/atl/renombrar" if self.atl else "/api/renombrar"
            headers = {"Content-Length": str(len(body))}
            rfile = io.BytesIO(body)
            def send_json(inner, data, status=200):
                inner.response = data
        request = Request()
        self.ns["do_POST"](request)
        return request.response

    def test_duplicate_names_preserve_first_document(self):
        for atl in (False, True):
            with self.subTest(atl=atl):
                self.configure(atl)
                items = [self.item("a.pdf"), self.item("b.pdf")]
                self.ns[self.save_name]({item["id"]: item for item in items})
                (self.source / "a.pdf").write_bytes(b"FIRST")
                (self.source / "b.pdf").write_bytes(b"SECOND")
                result = self.request(items)
                self.assertEqual((self.target / "same.pdf").read_bytes(), b"FIRST")
                self.assertEqual(len(result["renombrados"]), 1)
                self.assertEqual(result["errores"][0]["id"], "b.pdf")

    def test_unknown_existing_destination_is_preserved(self):
        for atl in (False, True):
            with self.subTest(atl=atl):
                self.configure(atl)
                item = self.item("a.pdf")
                self.ns[self.save_name]({"a.pdf": item})
                (self.source / "a.pdf").write_bytes(b"NEW")
                (self.target / "same.pdf").write_bytes(b"UNKNOWN")
                result = self.request([item])
                self.assertEqual((self.target / "same.pdf").read_bytes(), b"UNKNOWN")
                self.assertEqual(result["renombrados"], [])
                self.assertTrue(result["errores"])

    def test_missing_source_keeps_previous_file(self):
        self.check_previous("missing")

    def test_destination_directory_failure_is_reported_per_document(self):
        for atl in (False, True):
            with self.subTest(atl=atl):
                self.configure(atl)
                item = self.item("a.pdf")
                self.ns[self.save_name]({"a.pdf": item})
                (self.source / "a.pdf").write_bytes(b"SOURCE")
                with patch("os.makedirs", side_effect=PermissionError("folder denied")):
                    result = self.request([item])
                self.assertEqual(result["renombrados"], [])
                self.assertIn("folder denied", result["errores"][0]["error"])

    def test_copy_failure_keeps_previous_file(self):
        self.check_previous("copy")

    def test_state_failure_keeps_previous_file_and_reference(self):
        self.check_previous("state")

    def test_success_replaces_previous_file(self):
        self.check_previous("success")

    def test_same_destination_rolls_back_if_state_save_fails(self):
        for atl in (False, True):
            with self.subTest(atl=atl):
                self.configure(atl)
                item = self.item("a.pdf")
                item.update(estado="renombrado", archivo_en_disco="same.pdf" if atl else "1/same.pdf")
                self.ns[self.save_name]({"a.pdf": item})
                (self.source / "a.pdf").write_bytes(b"NEW")
                (self.target / "same.pdf").write_bytes(b"PREVIOUS")
                with patch.dict(self.ns, {self.save_name: lambda state: (_ for _ in ()).throw(OSError("state failed"))}):
                    result = self.request([item])
                self.assertEqual((self.target / "same.pdf").read_bytes(), b"PREVIOUS")
                self.assertEqual(result["renombrados"], [])
                self.assertTrue(result["errores"])

    def test_invalid_copy_does_not_replace_previous_file(self):
        for atl in (False, True):
            with self.subTest(atl=atl):
                self.configure(atl)
                item = self.item("a.pdf", "new.pdf")
                item.update(estado="renombrado", archivo_en_disco="previous.pdf" if atl else "1/previous.pdf")
                self.ns[self.save_name]({"a.pdf": item})
                (self.source / "a.pdf").write_bytes(b"SOURCE")
                (self.target / "previous.pdf").write_bytes(b"PREVIOUS")
                with patch("shutil.copy2", side_effect=lambda source, dest: Path(dest).write_bytes(b"BROKEN")):
                    result = self.request([item])
                self.assertEqual((self.target / "previous.pdf").read_bytes(), b"PREVIOUS")
                self.assertFalse((self.target / "new.pdf").exists())
                self.assertEqual(result["renombrados"], [])
                self.assertTrue(result["errores"])

    def test_state_write_failure_preserves_previous_json(self):
        for atl in (False, True):
            with self.subTest(atl=atl):
                self.configure(atl)
                self.ns[self.save_name]({"old": {"id": "old"}})
                with patch("json.dump", side_effect=OSError("disk full")):
                    with self.assertRaises(OSError):
                        self.ns[self.save_name]({"new": {"id": "new"}})
                self.assertEqual(self.ns[self.load_name](), {"old": {"id": "old"}})

    def check_previous(self, failure):
        for atl in (False, True):
            with self.subTest(atl=atl):
                self.configure(atl)
                item = self.item("a.pdf", "new.pdf")
                item["archivo_en_disco"] = "previous.pdf" if atl else "1/previous.pdf"
                item["estado"] = "renombrado"
                self.ns[self.save_name]({"a.pdf": item})
                (self.target / "previous.pdf").write_bytes(b"PREVIOUS")
                if failure != "missing":
                    (self.source / "a.pdf").write_bytes(b"NEW")
                if failure == "copy":
                    with patch("shutil.copy2", side_effect=OSError("copy failed")):
                        result = self.request([item])
                elif failure == "state":
                    with patch.dict(self.ns, {self.save_name: lambda state: (_ for _ in ()).throw(OSError("state failed"))}):
                        result = self.request([item])
                else:
                    result = self.request([item])
                if failure == "success":
                    self.assertFalse((self.target / "previous.pdf").exists())
                    self.assertEqual((self.target / "new.pdf").read_bytes(), b"NEW")
                    self.assertEqual(len(result["renombrados"]), 1)
                    repeated = self.request([item])
                    self.assertEqual(len(repeated["renombrados"]), 1)
                else:
                    self.assertEqual((self.target / "previous.pdf").read_bytes(), b"PREVIOUS")
                    self.assertFalse((self.target / "new.pdf").exists())
                    self.assertEqual(result["renombrados"], [])
                    self.assertTrue(result["errores"])
                    self.assertEqual(self.ns[self.load_name]()["a.pdf"]["archivo_en_disco"], item["archivo_en_disco"])


if __name__ == "__main__":
    unittest.main()
