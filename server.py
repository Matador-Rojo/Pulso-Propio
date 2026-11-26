"""Servidor local de Pulso Propio. Python 3.10+; biblioteca estándar."""
import argparse
import csv
import getpass
import gzip
import hashlib
import hmac
import io
import ipaddress
import json
from pathlib import Path
import re
import secrets
import sqlite3
import threading
import time
import webbrowser
from collections import deque
from contextlib import contextmanager
from http.cookies import CookieError, SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit
from uuid import UUID

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
CONSENT = "pulso-1"
CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self'; "
    "img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; "
    "connect-src 'self'; worker-src 'self'; manifest-src 'self'; "
    "object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'"
)
COMPRESSIBLE = {".html", ".css", ".js", ".mjs", ".svg", ".vtt", ".json", ".webmanifest"}
IMMUTABLE_DIRS = {"fonts", "art", "media", "assets", "vendor"}
RATINGS = ("navigation", "clarity", "usefulness")
COLUMNS = ("id", "created", *RATINGS, "highlight", "improvement", "consent_version")
HEADERS = ("Registro", "Fecha UTC", "Navegación", "Claridad", "Utilidad",
           "Qué ayudó", "Qué mejorar", "Versión de consentimiento")


@contextmanager
def connect(path):
    db = sqlite3.connect(path, timeout=5)
    db.row_factory = sqlite3.Row
    try:
        with db:
            yield db
    finally:
        db.close()


def init_store(directory):
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / "pulso.sqlite3"
    with connect(path) as db:
        db.executescript((ROOT / "schema.sql").read_text(encoding="utf-8"))
        db.execute("BEGIN IMMEDIATE")
        columns = {row["name"] for row in db.execute("PRAGMA table_info(notes)")}
        if "intro" not in columns:
            db.execute("ALTER TABLE notes ADD COLUMN intro TEXT NOT NULL DEFAULT ''")
    return path


def derive(password, salt):
    return hashlib.scrypt(password.encode(), salt=salt, n=2**17, r=8, p=1,
                          maxmem=192 * 1024 * 1024, dklen=32)


def set_password(path, password):
    if not 12 <= len(password) <= 128:
        raise ValueError("Usa entre 12 y 128 caracteres.")
    salt = secrets.token_bytes(16)
    digest = derive(password, salt)
    with connect(path) as db:
        db.execute("INSERT OR REPLACE INTO admin VALUES (1, ?, ?)", (salt, digest))
        db.execute("DELETE FROM sessions")


class Problem(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


class Handler(SimpleHTTPRequestHandler):
    server_version = "PulsoPropio"
    sys_version = ""
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      ".js": "text/javascript", ".mjs": "text/javascript",
                      ".vtt": "text/vtt", ".webm": "video/webm", ".woff2": "font/woff2",
                      ".webp": "image/webp", ".webmanifest": "application/manifest+json"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

    def log_message(self, *args):
        # Las respuestas anónimas no generan registros con IP o agente del visitante.
        pass

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", CSP)
        super().end_headers()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def send_head(self):
        target = Path(self.translate_path(self.path)).resolve()
        if target.is_dir():
            target = (target / "index.html").resolve()
        if not target.is_relative_to(PUBLIC.resolve()) or any(
            p.startswith(".") for p in target.relative_to(PUBLIC.resolve()).parts
        ):
            self.send_error(404)
            return None
        self.range_length = None
        byte_range = self.headers.get("Range")
        if byte_range and target.suffix.lower() in {".mp4", ".webm", ".wav", ".mp3", ".ogg"} and target.is_file():
            return self.media_range(target, byte_range)
        if not target.is_file():
            self.send_error(404)
            return None
        stat = target.stat()
        etag = f'W/"{stat.st_mtime_ns:x}-{stat.st_size:x}"'
        rel_parts = target.relative_to(PUBLIC.resolve()).parts
        cache_control = (
            "public, max-age=86400" if rel_parts and rel_parts[0] in IMMUTABLE_DIRS else "no-cache"
        )
        if self.headers.get("If-None-Match") == etag:
            self.send_response(304)
            self.send_header("ETag", etag)
            self.send_header("Cache-Control", cache_control)
            self.end_headers()
            return None
        accept_enc = self.headers.get("Accept-Encoding", "")
        use_gzip = (
            self.command == "GET"
            and "gzip" in accept_enc
            and target.suffix.lower() in COMPRESSIBLE
            and stat.st_size >= 512
        )
        ctype = self.guess_type(str(target))
        if use_gzip:
            compressed = gzip.compress(target.read_bytes(), compresslevel=6)
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Vary", "Accept-Encoding")
            self.send_header("ETag", etag)
            self.send_header("Cache-Control", cache_control)
            self.send_header("Content-Length", str(len(compressed)))
            self.end_headers()
            return io.BytesIO(compressed)
        stream = target.open("rb")
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("ETag", etag)
        self.send_header("Cache-Control", cache_control)
        if target.suffix.lower() in COMPRESSIBLE:
            self.send_header("Vary", "Accept-Encoding")
        if target.suffix.lower() in {".mp4", ".webm", ".wav", ".mp3", ".ogg"}:
            self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(stat.st_size))
        self.end_headers()
        return stream

    def media_range(self, target, value):
        size = target.stat().st_size
        match = re.fullmatch(r"bytes=(\d{0,18})-(\d{0,18})", value)
        start, end = size, size - 1
        if match:
            first, last = match.groups()
            if first:
                start = int(first)
                end = min(int(last), size - 1) if last else size - 1
            elif last:
                start = max(0, size - int(last))
        if start > end:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None
        stream = target.open("rb")
        stream.seek(start)
        self.range_length = end - start + 1
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(str(target)))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(self.range_length))
        self.end_headers()
        return stream

    def copyfile(self, source, outputfile):
        try:
            if self.range_length is None:
                return super().copyfile(source, outputfile)
            remaining = self.range_length
            while remaining:
                chunk = source.read(min(remaining, 64 * 1024))
                if not chunk:
                    break
                outputfile.write(chunk)
                remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def do_HEAD(self):
        if self.path.startswith("/api/"):
            self.send_error(405)
        else:
            super().do_HEAD()

    def do_GET(self):
        if self.path.startswith("/api/"):
            self.api()
        else:
            super().do_GET()

    def do_POST(self):
        self.api()

    def reply(self, status, body, *, content_type="application/json; charset=utf-8",
              headers=None):
        data = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        for name, value in (headers or {}).items():
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(data)

    def read_body(self):
        if self.headers.get_content_type() != "application/json":
            raise Problem(415, "Envía los datos como JSON.")
        try:
            size = int(self.headers.get("Content-Length", ""))
        except ValueError:
            raise Problem(411, "Falta la longitud de la solicitud.")
        if size <= 0 or size > 16384:
            raise Problem(413, "El formulario supera el límite permitido.")
        try:
            data = json.loads(self.rfile.read(size).decode("utf-8"))
        except (UnicodeError, ValueError, RecursionError):
            raise Problem(400, "El formulario tiene un formato incorrecto.")
        if not isinstance(data, dict):
            raise Problem(400, "El formulario tiene un formato incorrecto.")
        return data

    def api(self):
        try:
            parsed = urlsplit(self.path)
            route = parsed.path
            admin = route.startswith("/api/admin/")
            if admin:
                hostname = urlsplit("//" + self.headers.get("Host", "")).hostname
                if hostname not in {"localhost", "127.0.0.1", "::1"} or not ipaddress.ip_address(
                    self.client_address[0]
                ).is_loopback:
                    raise Problem(403, "Abre la administración en localhost desde el equipo anfitrión.")
            data = {}
            if self.command == "POST":
                origin = self.headers.get("Origin")
                if origin and origin != "http://" + self.headers.get("Host", ""):
                    raise Problem(403, "El origen de la solicitud no está permitido.")
                data = self.read_body()
            with connect(self.server.db_path) as db:
                status, result, extra = self.dispatch(db, route, parsed.query, data)
            self.reply(status, result, **extra)
        except Problem as exc:
            self.reply(exc.status, {"error": str(exc)})
        except sqlite3.Error:
            self.reply(503, {"error": "No se pudo acceder a los datos. Intenta de nuevo."})
        except (ValueError, UnicodeError):
            self.reply(400, {"error": "Solicitud no válida."})

    def dispatch(self, db, route, query, data):
        action = (self.command, route)
        if action == ("GET", "/api/notes"):
            rows = db.execute("SELECT lesson, body, intro FROM notes WHERE body <> '' OR intro <> ''").fetchall()
            return 200, {
                "notes": {row["lesson"]: row["body"] for row in rows if row["body"]},
                "intros": {row["lesson"]: row["intro"] for row in rows if row["intro"]},
            }, {}
        if action == ("POST", "/api/feedback"):
            return self.feedback(db, data)
        if action == ("GET", "/api/community"):
            return self.community_list(db)
        if action == ("POST", "/api/community/posts"):
            return self.community_create_post(db, data)
        if action == ("POST", "/api/community/replies"):
            return self.community_create_reply(db, data)
        if action == ("POST", "/api/community/like"):
            return self.community_like_post(db, data)
        if action == ("POST", "/api/admin/login"):
            return self.login(db, data)
        if action == ("GET", "/api/admin/status"):
            try:
                active = self.session(db)
                return 200, {"authenticated": True, "csrf": active["csrf"]}, {}
            except Problem:
                return 200, {"authenticated": False}, {}
        if not route.startswith("/api/admin/"):
            raise Problem(404, "Ruta desconocida.")
        session = self.session(db)
        if self.command == "POST" and not hmac.compare_digest(
            self.headers.get("X-CSRF-Token", "").encode(), session["csrf"].encode()
        ):
            raise Problem(403, "Actualiza la sesión antes de continuar.")
        if action == ("GET", "/api/admin/session"):
            return 200, {"csrf": session["csrf"]}, {}
        if action == ("POST", "/api/admin/logout"):
            db.execute("DELETE FROM sessions WHERE token_hash = ?", (session["token_hash"],))
            return 200, {"ok": True}, {"headers": {"Set-Cookie": self.cookie("", 0)}}
        if action == ("GET", "/api/admin/feedback"):
            page = int(parse_qs(query).get("page", ["1"])[0])
            if not 1 <= page <= 1000000:
                raise Problem(400, "Número de página fuera de rango.")
            db.execute("BEGIN")
            total = db.execute("SELECT COUNT(*) FROM feedback").fetchone()[0]
            rows = db.execute(f"SELECT {', '.join(COLUMNS)} FROM feedback ORDER BY id DESC "
                              "LIMIT 20 OFFSET ?", ((page - 1) * 20,))
            return 200, {"total": total, "page": page, "rows": list(map(dict, rows))}, {}
        if action == ("GET", "/api/admin/export.csv"):
            buf = io.StringIO(newline="")
            out = csv.writer(buf)
            out.writerow(HEADERS)
            for row in db.execute(f"SELECT {', '.join(COLUMNS)} FROM feedback ORDER BY id"):
                out.writerow([csv_value(value) for value in row])
            return 200, buf.getvalue().encode("utf-8-sig"), {
                "content_type": "text/csv; charset=utf-8",
                "headers": {"Content-Disposition": 'attachment; filename="pulso-evaluaciones.csv"'}}
        if action == ("GET", "/api/admin/notes"):
            rows = db.execute("SELECT lesson, body, intro, revision FROM notes")
            return 200, {"notes": {row["lesson"]: dict(row) for row in rows}}, {}
        if action == ("POST", "/api/admin/notes"):
            name, body, revision = data.get("lesson"), data.get("body"), data.get("revision")
            if not isinstance(name, str) or not re.fullmatch("[a-z0-9-]{1,80}", name):
                raise Problem(400, "Identificador de lección no válido.")
            if type(revision) is not int or revision < 0:
                raise Problem(400, "Falta la versión de la nota.")
            body = clean_text(body, 2000)
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT revision, intro FROM notes WHERE lesson = ?", (name,)).fetchone()
            if (row["revision"] if row else 0) != revision:
                raise Problem(409, "Otra sesión cambió la nota. Recarga su versión antes de editar.")
            # Los clientes anteriores solo envían la nota. Conserva la introducción en esos casos.
            intro = clean_text(data.get("intro", row["intro"] if row else ""), 2000)
            db.execute("INSERT OR REPLACE INTO notes (lesson, body, intro, revision) VALUES (?, ?, ?, ?)",
                       (name, body, intro, revision + 1))
            return 200, {"revision": revision + 1, "body": body, "intro": intro}, {}
        if action == ("GET", "/api/admin/community"):
            return self.community_list(db, include_hidden=True)
        if action == ("POST", "/api/admin/community/moderate"):
            return self.community_moderate(db, data)
        raise Problem(404, "Ruta desconocida.")

    def community_list(self, db, include_hidden=False):
        where = "" if include_hidden else "WHERE hidden = 0"
        posts = [dict(row) for row in db.execute(
            f"SELECT id, created, author, city, category, title, tools, media_url, contact, body, likes, hidden "
            f"FROM community_posts {where} ORDER BY id DESC LIMIT 50"
        )]
        reply_where = "" if include_hidden else "WHERE hidden = 0"
        replies_by_post = {}
        for row in db.execute(
            f"SELECT id, post_id, created, author, body, hidden FROM community_replies {reply_where} ORDER BY id ASC"
        ):
            replies_by_post.setdefault(row["post_id"], []).append(dict(row))
        for post in posts:
            post["replies"] = replies_by_post.get(post["id"], [])
        return 200, {"posts": posts}, {}

    def community_create_post(self, db, data):
        allowed_cats = {"Difusión multimedia", "Busco colaboración", "Debate e IA", "Consejo de herramienta"}
        author = clean_text(data.get("author", ""), 60)
        city = clean_text(data.get("city", ""), 60)
        category = data.get("category", "")
        title = clean_text(data.get("title", ""), 120)
        tools = clean_text(data.get("tools", ""), 140)
        media_url = clean_text(data.get("media_url", ""), 240)
        contact = clean_text(data.get("contact", ""), 100)
        body = clean_text(data.get("body", ""), 1200)
        if len(author) < 2:
            raise Problem(400, "Escribe tu nombre artístico o banda (mínimo 2 caracteres).")
        if category not in allowed_cats:
            raise Problem(400, "Elige una categoría válida para tu publicación.")
        if len(title) < 3:
            raise Problem(400, "Escribe un título de al menos 3 caracteres.")
        if len(body) < 10:
            raise Problem(400, "Cuenta un poco más de tu experiencia o consulta (mínimo 10 caracteres).")
        if media_url:
            parsed_url = urlsplit(media_url)
            if parsed_url.scheme != "https" or not parsed_url.netloc:
                raise Problem(400, "El enlace multimedia debe empezar con https:// (YouTube, SoundCloud, Spotify, etc.).")
        cur = db.execute(
            "INSERT INTO community_posts (author, city, category, title, tools, media_url, contact, body) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (author, city, category, title, tools, media_url, contact, body),
        )
        row = dict(db.execute(
            "SELECT id, created, author, city, category, title, tools, media_url, contact, body, likes, hidden "
            "FROM community_posts WHERE id = ?", (cur.lastrowid,)
        ).fetchone())
        row["replies"] = []
        return 201, {"post": row}, {}

    def community_create_reply(self, db, data):
        post_id = data.get("post_id")
        if type(post_id) is not int or post_id <= 0:
            raise Problem(400, "Publicación no válida.")
        author = clean_text(data.get("author", ""), 60)
        body = clean_text(data.get("body", ""), 600)
        if len(author) < 2 or len(body) < 3:
            raise Problem(400, "Completa tu nombre y un mensaje de al menos 3 caracteres.")
        exists = db.execute("SELECT id FROM community_posts WHERE id = ? AND hidden = 0", (post_id,)).fetchone()
        if not exists:
            raise Problem(404, "La publicación ya no está disponible.")
        cur = db.execute(
            "INSERT INTO community_replies (post_id, author, body) VALUES (?, ?, ?)",
            (post_id, author, body),
        )
        reply = dict(db.execute(
            "SELECT id, post_id, created, author, body, hidden FROM community_replies WHERE id = ?",
            (cur.lastrowid,)
        ).fetchone())
        return 201, {"reply": reply}, {}

    def community_like_post(self, db, data):
        post_id = data.get("post_id")
        if type(post_id) is not int or post_id <= 0:
            raise Problem(400, "Publicación no válida.")
        cur = db.execute("UPDATE community_posts SET likes = likes + 1 WHERE id = ? AND hidden = 0", (post_id,))
        if not cur.rowcount:
            raise Problem(404, "Publicación no encontrada.")
        likes = db.execute("SELECT likes FROM community_posts WHERE id = ?", (post_id,)).fetchone()["likes"]
        return 200, {"id": post_id, "likes": likes}, {}

    def community_moderate(self, db, data):
        kind = data.get("kind")
        item_id = data.get("id")
        mod_action = data.get("action")
        if kind not in {"post", "reply"} or type(item_id) is not int or item_id <= 0 or mod_action not in {"hide", "show", "delete"}:
            raise Problem(400, "Acción de moderación no válida.")
        table = "community_posts" if kind == "post" else "community_replies"
        if mod_action == "delete":
            if kind == "post":
                db.execute("DELETE FROM community_replies WHERE post_id = ?", (item_id,))
            db.execute(f"DELETE FROM {table} WHERE id = ?", (item_id,))
        else:
            db.execute(f"UPDATE {table} SET hidden = ? WHERE id = ?", (1 if mod_action == "hide" else 0, item_id))
        return 200, {"ok": True}, {}

    def feedback(self, db, data):
        if data.get("consent") is not True or data.get("consent_version") != CONSENT:
            raise Problem(400, "Revisa el consentimiento antes de enviar.")
        if any(type(data.get(key)) is not int or not 1 <= data[key] <= 5 for key in RATINGS):
            raise Problem(400, "Completa cada escala con una valoración del 1 al 5.")
        submission = str(data.get("submission_id", ""))
        if str(UUID(submission)) != submission:
            raise Problem(400, "Identificador de envío no válido.")
        values = tuple(data[k] for k in RATINGS) + (
            clean_text(data.get("highlight", ""), 1000),
            clean_text(data.get("improvement", ""), 1000), CONSENT)
        cur = db.execute("INSERT INTO feedback (submission_id,navigation,clarity,usefulness,"
                         "highlight,improvement,consent_version) VALUES (?,?,?,?,?,?,?) "
                         "ON CONFLICT(submission_id) DO NOTHING", (submission, *values))
        if cur.rowcount == 0:
            old = db.execute("SELECT navigation,clarity,usefulness,highlight,improvement,"
                             "consent_version FROM feedback WHERE submission_id=?", (submission,)).fetchone()
            if tuple(old) != values:
                raise Problem(409, "Ya se recibió una evaluación distinta con ese identificador.")
        return (201 if cur.rowcount else 200), {"received": True}, {}

    def login(self, db, data):
        password = data.get("password")
        if not isinstance(password, str) or not 1 <= len(password) <= 128:
            raise Problem(400, "Introduce tu clave de administración.")
        row = db.execute("SELECT salt, password_hash FROM admin WHERE id = 1").fetchone()
        if not row:
            raise Problem(503, "Configura primero la clave desde la consola del equipo.")
        now = time.monotonic()
        with self.server.login_lock:
            attempts = self.server.attempts
            while attempts and attempts[0] <= now - 60:
                attempts.popleft()
            if len(attempts) >= 5:
                raise Problem(429, "Espera un minuto antes de volver a intentar.")
            attempts.append(now)
            if not hmac.compare_digest(derive(password, row["salt"]), row["password_hash"]):
                raise Problem(401, "La clave no es correcta.")
            attempts.clear()
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        db.execute("DELETE FROM sessions WHERE expires <= ?", (int(time.time()),))
        cur = db.execute("INSERT INTO sessions SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM admin "
                         "WHERE id=1 AND password_hash=?)",
                         (hashlib.sha256(token.encode()).digest(), csrf, int(time.time()) + 3600,
                          row["password_hash"]))
        if not cur.rowcount:
            raise Problem(401, "La clave cambió durante el acceso. Vuelve a entrar.")
        return 200, {"csrf": csrf}, {"headers": {"Set-Cookie": self.cookie(token, 3600)}}

    @staticmethod
    def cookie(value, seconds):
        return f"pulso_session={value}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age={seconds}"

    def session(self, db):
        cookies = SimpleCookie()
        try:
            cookies.load(self.headers.get("Cookie", ""))
        except CookieError:
            pass
        token = cookies.get("pulso_session")
        row = None
        if token:
            digest = hashlib.sha256(token.value.encode()).digest()
            row = db.execute("SELECT * FROM sessions WHERE token_hash=? AND expires>?",
                             (digest, int(time.time()))).fetchone()
        if not row:
            raise Problem(401, "Inicia sesión para acceder.")
        return row


def clean_text(value, maximum):
    if not isinstance(value, str) or len(value) > maximum or any(
        ord(c) < 32 and c not in "\r\n\t" for c in value
    ):
        raise Problem(400, f"Usa texto de hasta {maximum} caracteres.")
    value.encode("utf-8")
    return value.strip()


def csv_value(value):
    if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@")):
        return "'" + value
    return value


def create_server(host, port, data_dir):
    path = init_store(Path(data_dir))
    server = ThreadingHTTPServer((host, port), Handler)
    server.db_path = path
    server.attempts = deque()
    server.login_lock = threading.Lock()
    return server


def main():
    parser = argparse.ArgumentParser(description="Guía multimedia Pulso Propio")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8765, type=int)
    parser.add_argument("--data-dir", type=Path, default=ROOT / "data")
    parser.add_argument("--set-password", action="store_true", help="Crear o cambiar la clave del equipo")
    parser.add_argument("--open-browser", action="store_true", help="Abrir la guía al iniciar en localhost")
    args = parser.parse_args()
    if args.data_dir.resolve().is_relative_to(PUBLIC.resolve()):
        parser.error("Los datos deben guardarse fuera de la carpeta pública.")
    if args.set_password:
        password = getpass.getpass("Nueva clave de administración (12 a 128 caracteres): ")
        if password != getpass.getpass("Repite la clave: "):
            parser.error("Las claves no coinciden.")
        try:
            set_password(init_store(args.data_dir), password)
        except ValueError as exc:
            parser.error(str(exc))
        print("Clave guardada. Las sesiones anteriores han caducado.")
        return
    with create_server(args.host, args.port, args.data_dir) as server:
        print(f"Pulso Propio en http://{args.host}:{server.server_port}  |  Ctrl+C para salir", flush=True)
        if args.open_browser and args.host in {"127.0.0.1", "localhost"}:
            webbrowser.open(f"http://{args.host}:{server.server_port}/")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
