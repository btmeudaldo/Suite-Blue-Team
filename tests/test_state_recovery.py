import ast
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
import urllib.parse
from unittest.mock import patch


class StateRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        tree = ast.parse(Path("server.py").read_text(encoding="utf-8"))
        functions = [node for node in tree.body if isinstance(node, ast.FunctionDef)]
        handler = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "ExamHandler")
        handler.bases = []
        self.ns = {"os": os, "json": json, "urllib": urllib}
        exec(compile(ast.fix_missing_locations(ast.Module(body=functions + [handler], type_ignores=[])), "server.py", "exec"), self.ns)

    def configure(self, atl):
        root = Path(self.temporary.name) / str(atl)
        root.mkdir(exist_ok=True)
        self.path = root / "state.json"
        self.backup = root / "state.json.bak"
        prefix = "ATL_" if atl else ""
        self.ns[prefix + "STATE_FILE"] = str(self.path)
        for name in ("DIVIDIDOS_DIR", "THUMB_DIR", "RENOMBRADOS_DIR"):
            directory = root / name
            directory.mkdir(exist_ok=True)
            self.ns[prefix + name] = str(directory)
        self.load = self.ns["load_atl_state" if atl else "load_state"]
        self.save = self.ns["save_atl_state" if atl else "save_state"]
        self.atl = atl

    def request(self, method, path, payload=None):
        handler = self.ns["ExamHandler"]()
        handler.path = path
        body = json.dumps(payload or {}).encode()
        handler.headers = {"Content-Length": str(len(body))}
        handler.rfile = io.BytesIO(body)
        handler.wfile = io.BytesIO()
        headers = {}
        result = {}
        handler.send_response = lambda status: result.update(status=status)
        handler.send_header = lambda name, value: headers.update({name: value})
        handler.end_headers = lambda: None
        getattr(handler, "do_" + method)()
        return result["status"], headers, json.loads(handler.wfile.getvalue())

    def test_initial_save_has_backup_and_subsequent_save_preserves_previous_valid_state(self):
        for atl in (False, True):
            with self.subTest(atl=atl):
                self.configure(atl)
                self.assertEqual(self.load(), {})
                first = {"a.pdf": {"id": "a.pdf", "alumno": "FIRST"}}
                second = {"a.pdf": {"id": "a.pdf", "alumno": "SECOND"}}
                self.save(first)
                self.assertEqual(json.loads(self.backup.read_text()), first)
                self.save(second)
                self.assertEqual(self.load(), second)
                self.assertEqual(json.loads(self.backup.read_text()), first)

    def test_corrupt_primary_recovers_backup_and_preserves_corrupt_evidence(self):
        for atl in (False, True):
            with self.subTest(atl=atl):
                self.configure(atl)
                good = {"legacy.pdf": {"estado": "pendiente"}}
                self.backup.write_text(json.dumps(good))
                self.path.write_bytes(b'{"broken":')
                self.assertEqual(self.load(), good)
                self.assertEqual(json.loads(self.path.read_text()), good)
                evidence = list(self.path.parent.glob("state.json.corrupt-*"))
                self.assertEqual(len(evidence), 1)
                self.assertEqual(evidence[0].read_bytes(), b'{"broken":')
                self.load()
                self.assertEqual(len(list(self.path.parent.glob("state.json.corrupt-*"))), 1)
                route = "/api/atl/items" if atl else "/api/examenes"
                status, headers, body = self.request("GET", route)
                self.assertEqual(status, 200)
                self.assertIsInstance(body, list)
                self.assertIn("respaldo", urllib.parse.unquote(headers["X-State-Warning"]).lower())

    def test_corrupt_state_without_valid_backup_blocks_get_post_and_direct_save(self):
        for atl in (False, True):
            with self.subTest(atl=atl):
                self.configure(atl)
                damaged = b'{"broken":'
                self.path.write_bytes(damaged)
                self.backup.write_bytes(b'[]')
                with self.assertRaises(OSError):
                    self.load()
                with self.assertRaises(OSError):
                    self.save({})
                route = "/api/atl/items" if atl else "/api/examenes"
                status, _, body = self.request("GET", route)
                self.assertEqual(status, 503)
                self.assertIn("error", body)
                route = "/api/atl/guardar" if atl else "/api/guardar_edicion"
                status, _, body = self.request("POST", route, {"item": {"id": "new.pdf"}})
                self.assertEqual(status, 503)
                self.assertIn("error", body)
                self.assertEqual(self.path.read_bytes(), damaged)
                self.assertEqual(self.backup.read_bytes(), b'[]')

    def test_wrong_shapes_and_mismatched_ids_are_corruption(self):
        for index, value in enumerate(([], {"a.pdf": None}, {"a.pdf": {"id": "other.pdf"}})):
            with self.subTest(value=value):
                self.configure(index)
                self.path.write_text(json.dumps(value))
                with self.assertRaises(OSError):
                    self.load()

    def test_permission_failure_does_not_restore_backup_or_change_files(self):
        self.configure(False)
        self.path.write_text('{"a.pdf": {}}')
        self.backup.write_text('{"b.pdf": {}}')
        original_open = open
        def denied(path, *args, **kwargs):
            if os.fspath(path) == str(self.path):
                raise PermissionError("locked")
            return original_open(path, *args, **kwargs)
        with patch("builtins.open", side_effect=denied):
            with self.assertRaises(OSError):
                self.load()
        self.assertEqual(self.path.read_text(), '{"a.pdf": {}}')
        self.assertFalse(list(self.path.parent.glob("*.corrupt-*")))

    def test_missing_primary_with_backup_recovers_instead_of_starting_empty(self):
        self.configure(False)
        self.backup.write_text('{"a.pdf": {}}')
        self.assertEqual(self.load(), {"a.pdf": {}})
        self.assertTrue(self.path.exists())

    def test_invalid_primary_never_replaces_valid_backup_on_save(self):
        self.configure(False)
        good = {"a.pdf": {"id": "a.pdf"}}
        self.backup.write_text(json.dumps(good))
        self.path.write_bytes(b'INVALID')
        self.save({"b.pdf": {"id": "b.pdf"}})
        self.assertEqual(json.loads(self.backup.read_text()), good)
        self.assertEqual(self.load(), {"b.pdf": {"id": "b.pdf"}})
        self.assertEqual(next(self.path.parent.glob("*.corrupt-*")).read_bytes(), b'INVALID')

    def test_write_failures_preserve_primary_and_valid_backup(self):
        for failing_target in ("backup", "primary"):
            with self.subTest(failing_target=failing_target):
                self.configure(failing_target)
                previous = {"a.pdf": {"id": "a.pdf"}}
                self.save(previous)
                destination = self.backup if failing_target == "backup" else self.path
                original_replace = os.replace
                def fail_replace(source, target):
                    if os.fspath(target) == str(destination):
                        raise PermissionError("replacement blocked")
                    return original_replace(source, target)
                with patch("os.replace", side_effect=fail_replace):
                    with self.assertRaises(OSError):
                        self.save({"b.pdf": {"id": "b.pdf"}})
                self.assertEqual(self.load(), previous)
                self.assertEqual(json.loads(self.backup.read_text()), previous)

    def test_missing_primary_and_invalid_backup_are_not_first_run(self):
        self.configure(False)
        self.backup.write_bytes(b'INVALID')
        with self.assertRaises(OSError):
            self.load()
        with self.assertRaises(OSError):
            self.save({})
        self.assertFalse(self.path.exists())
        self.assertEqual(self.backup.read_bytes(), b'INVALID')

    def test_corrupt_exam_archive_does_not_touch_documents(self):
        self.configure(False)
        self.path.write_text('{"broken":')
        document = Path(self.ns["DIVIDIDOS_DIR"]) / "a.pdf"
        document.write_bytes(b"KEEP")
        status, _, body = self.request("POST", "/api/archivar_convocatoria")
        self.assertEqual(status, 503)
        self.assertIn("error", body)
        self.assertEqual(document.read_bytes(), b"KEEP")

    def test_corrupt_atl_clear_does_not_delete_documents(self):
        self.configure(True)
        self.path.write_text('{"broken":')
        document = Path(self.ns["ATL_DIVIDIDOS_DIR"]) / "a.pdf"
        document.write_bytes(b"KEEP")
        status, _, body = self.request("POST", "/api/atl/limpiar")
        self.assertEqual(status, 503)
        self.assertIn("error", body)
        self.assertEqual(document.read_bytes(), b"KEEP")


if __name__ == "__main__":
    unittest.main()
