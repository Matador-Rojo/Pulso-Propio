"""Pruebas HTTP con base temporal, sin respuestas de prueba en la plataforma."""
import csv
import http.client
import io
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
from uuid import uuid4

from server import Handler, PUBLIC, connect, create_server, init_store, main, set_password


class MemoryTransport:
    """Flujo de bytes HTTP para pruebas sin permisos de red saliente."""
    def __init__(self, data):
        self.incoming = io.BytesIO(data)
        self.outgoing = io.BytesIO()

    def makefile(self, mode, *args):
        return self.incoming

    def sendall(self, data):
        self.outgoing.write(data)


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.server = create_server("127.0.0.1", 0, self.tmp.name)
        thread = threading.Thread(target=self.server.serve_forever,
                                  kwargs={"poll_interval": 0.01}, daemon=True)
        thread.start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(thread.join, 2)
        self.addCleanup(self.server.shutdown)
        self.credentials = {}

    def call(self, verb, path, body=None, headers=None):
        opts = {"Host": "127.0.0.1", **self.credentials}
        opts.update(headers or {})
        if body is not None:
            opts.setdefault("Content-Type", "application/json")
            body = json.dumps(body).encode("utf-8")
            opts["Content-Length"] = str(len(body))
        conn = None
        try:
            if os.environ.get("PULSO_HTTP_TESTS") == "tcp":
                conn = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
                conn.request(verb, path, body=body, headers=opts)
                result = conn.getresponse()
            else:
                head = f"{verb} {path} HTTP/1.0\r\n"
                head += "".join(f"{name}: {value}\r\n" for name, value in opts.items()) + "\r\n"
                wire = MemoryTransport(head.encode("ascii") + (body or b""))
                Handler(wire, ("127.0.0.1", 12345), self.server)
                result = http.client.HTTPResponse(MemoryTransport(wire.outgoing.getvalue()))
                result.begin()
            data = result.read()
            if "application/json" in result.getheader("Content-Type", ""):
                data = json.loads(data)
            return result.status, data, dict(result.getheaders())
        finally:
            if conn:
                conn.close()

    def login(self):
        password = "clave-de-prueba-solo-local"
        set_password(self.server.db_path, password)
        status, data, headers = self.call("POST", "/api/admin/login", {"password": password})
        self.assertEqual(status, 200)
        self.assertIn("HttpOnly", headers["Set-Cookie"])
        self.assertIn("SameSite=Strict", headers["Set-Cookie"])
        self.credentials = {"Cookie": headers["Set-Cookie"].split(";")[0],
                            "X-CSRF-Token": data["csrf"]}

    def feedback(self):
        return {"navigation": 4, "clarity": 5, "usefulness": 3,
                "highlight": "Escuchar ambas versiones", "improvement": "=4+5",
                "submission_id": str(uuid4()), "consent": True, "consent_version": "pulso-1"}

    def test_empty_validated_feedback_and_persistence(self):
        self.login()
        self.assertEqual(self.call("GET", "/api/admin/feedback")[1]["total"], 0)
        body = self.feedback()
        for key, value in [("consent", False), ("navigation", True), ("clarity", 0),
                           ("usefulness", 6), ("consent_version", "other"), ("highlight", "x"*1001)]:
            with self.subTest(key=key):
                self.assertEqual(self.call("POST", "/api/feedback", {**body, key: value})[0], 400)
        self.assertEqual(self.call("POST", "/api/feedback", body)[0], 201)
        self.assertEqual(self.call("POST", "/api/feedback", body)[0], 200)
        self.assertEqual(self.call("POST", "/api/feedback", {**body, "clarity": 3})[0], 409)
        self.assertEqual(self.call("GET", "/api/admin/feedback")[1]["total"], 1)
        _, data, _ = self.call("GET", "/api/admin/export.csv")
        rows = list(csv.reader(io.StringIO(data.decode("utf-8-sig"))))
        self.assertEqual(len(rows), 2)
        self.assertIn("'=4+5", rows[1])
        path = init_store(Path(self.tmp.name))
        with connect(path) as db:
            self.assertEqual(db.execute("SELECT highlight FROM feedback").fetchone()[0], body["highlight"])

    def test_access_isolation_logout(self):
        for path in ("feedback", "notes", "export.csv"):
            self.assertEqual(self.call("GET", "/api/admin/" + path)[0], 401)
        self.assertEqual(self.call("POST", "/api/feedback", self.feedback(),
                                   {"Origin": "http://other.invalid"})[0], 403)
        self.assertEqual(self.call("GET", "/api/admin/session", headers={"Host": "other.invalid"})[0], 403)
        self.assertEqual(self.call("POST", "/api/admin/login", {"password": "unused"})[0], 503)
        self.login()
        self.assertEqual(self.call("GET", "/api/admin/session")[0], 200)
        self.assertEqual(self.call("POST", "/api/admin/logout", {}, {"X-CSRF-Token": "bad"})[0], 403)
        self.assertEqual(self.call("POST", "/api/admin/logout", {})[0], 200)
        self.assertEqual(self.call("GET", "/api/admin/session")[0], 401)
        self.assertEqual(self.call("GET", "/schema.sql")[0], 404)

    def test_editorial_revisions(self):
        self.login()
        note = {"lesson": "voces", "body": "Escucha el vibrato.", "revision": 0}
        self.assertEqual(self.call("POST", "/api/admin/notes", note)[0], 200)
        self.assertEqual(self.call("POST", "/api/admin/notes", note)[0], 409)
        self.assertEqual(self.call("GET", "/api/notes")[1]["notes"], {"voces": note["body"]})
        self.assertEqual(self.call("POST", "/api/admin/notes", {**note, "body": "", "revision": 1})[0], 200)
        self.assertEqual(self.call("GET", "/api/notes")[1]["notes"], {})
        self.assertEqual(self.call("GET", "/api/admin/notes")[1]["notes"]["voces"]["revision"], 2)

    def test_password_rotation_and_throttle(self):
        self.login()
        set_password(self.server.db_path, "una-segunda-clave-privada")
        self.assertEqual(self.call("GET", "/api/admin/session")[0], 401)
        for attempt in range(5):
            self.assertEqual(self.call("POST", "/api/admin/login", {"password": "incorrecta"})[0], 401)
        self.assertEqual(self.call("POST", "/api/admin/login", {"password": "incorrecta"})[0], 429)

    def test_intro_migration_publication_and_restore(self):
        # Reproducir la tabla inicial con una nota guardada antes de la actualización.
        with connect(self.server.db_path) as db:
            db.execute("DROP TABLE notes")
            db.execute("CREATE TABLE notes (lesson TEXT PRIMARY KEY,body TEXT NOT NULL,revision INTEGER NOT NULL)")
            db.execute("INSERT INTO notes VALUES ('introduccion','Nota previa',1)")
        init_store(Path(self.tmp.name))
        self.login()
        self.assertEqual(self.call("GET", "/api/notes")[1],
                         {"notes": {"introduccion": "Nota previa"}, "intros": {}})
        edit = {"lesson": "introduccion", "revision": 1, "body": "Nota previa", "intro": "Un nuevo inicio."}
        self.assertEqual(self.call("POST", "/api/admin/notes", edit)[0], 200)
        self.assertEqual(self.call("POST", "/api/admin/notes", edit)[0], 409)
        self.assertEqual(self.call("GET", "/api/notes")[1]["intros"]["introduccion"], edit["intro"])
        legacy_edit = {"lesson": "introduccion", "revision": 2, "body": ""}
        self.assertEqual(self.call("POST", "/api/admin/notes", legacy_edit)[0], 200)
        self.assertEqual(self.call("GET", "/api/notes")[1], {"notes": {}, "intros": {"introduccion": edit["intro"]}})
        self.assertEqual(self.call("POST", "/api/admin/notes", {**legacy_edit, "revision": 3, "intro": ""})[0], 200)
        self.assertEqual(self.call("GET", "/api/notes")[1], {"notes": {}, "intros": {}})

    def test_partial_video_and_captions(self):
        clip = PUBLIC / "media" / "silencio.webm"
        expected = clip.read_bytes()
        for value, chunk in [("bytes=100-135", expected[100:136]), ("bytes=-20", expected[-20:])]:
            status, data, headers = self.call("GET", "/media/silencio.webm", headers={"Range": value})
            self.assertEqual(status, 206)
            self.assertEqual(data, chunk)
            self.assertEqual(headers["Content-Type"], "video/webm")
            self.assertEqual(int(headers["Content-Length"]), len(chunk))
        self.assertEqual(self.call("GET", "/media/silencio.webm", headers={"Range": "bytes=5000000000-"})[0], 416)
        status, data, headers = self.call("GET", "/media/silencio.vtt")
        self.assertEqual(status, 200)
        self.assertTrue(data.startswith(b"WEBVTT"))
        self.assertEqual({k.lower(): v for k, v in headers.items()}["content-type"], "text/vtt")

    def test_open_browser_is_opt_in_and_local(self):
        cases = [([], False), (["--host", "0.0.0.0", "--open-browser"], False), (["--open-browser"], True)]
        for flags, should_open in cases:
            with self.subTest(flags=flags), patch("sys.argv", ["server.py", *flags]), \
                 patch("server.create_server") as create, patch("server.webbrowser.open") as open_tab, \
                 patch("builtins.print"):
                create.return_value.__enter__.return_value.server_port = 8765
                main()
                if should_open:
                    open_tab.assert_called_once_with("http://127.0.0.1:8765/")
                else:
                    open_tab.assert_not_called()


if __name__ == "__main__":
    unittest.main()
