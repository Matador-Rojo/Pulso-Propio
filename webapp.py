"""Aplicación WSGI para publicar Pulso Propio con PythonAnywhere."""
import json
import os
import sqlite3
import threading
import time
from collections import deque
from pathlib import Path
from types import SimpleNamespace

from flask import Flask, Response, request, send_from_directory

from server import CSP, Handler, Problem, PUBLIC, ROOT, connect, init_store


app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 16384
app.config["PULSO_DATA_DIR"] = os.environ.get("PULSO_DATA_DIR", str(ROOT / "data"))
app.config["PULSO_HOST"] = os.environ.get("PULSO_HOST", "matadorrojo.pythonanywhere.com").lower()
runtime = SimpleNamespace(attempts=deque(), login_lock=threading.Lock())


class WebHandler(Handler):
    @staticmethod
    def cookie(value, seconds):
        return Handler.cookie(value, seconds) + "; Secure"

    def login(self, db, data):
        # Reserve each attempt in SQLite so limits survive a worker restart.
        now = int(time.time())
        db.execute("CREATE TABLE IF NOT EXISTS login_attempts (created INTEGER NOT NULL)")
        db.commit()
        db.execute("BEGIN IMMEDIATE")
        db.execute("DELETE FROM login_attempts WHERE created <= ?", (now - 60,))
        if db.execute("SELECT COUNT(*) FROM login_attempts").fetchone()[0] >= 5:
            db.commit()
            raise Problem(429, "Espera un minuto antes de volver a intentar.")
        db.execute("INSERT INTO login_attempts VALUES (?)", (now,))
        db.commit()
        result = super().login(db, data)
        db.execute("DELETE FROM login_attempts")
        return result


@app.after_request
def response_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Content-Security-Policy"] = CSP
    return response


@app.route("/api/<path:route>", methods=["GET", "POST"])
def api(route):
    try:
        if request.host.lower() != app.config["PULSO_HOST"]:
            raise Problem(400, "Servidor no válido.")
        if request.method == "POST":
            origin = request.headers.get("Origin")
            if origin and origin != "https://" + app.config["PULSO_HOST"]:
                raise Problem(403, "El origen de la solicitud no está permitido.")
            if request.mimetype != "application/json":
                raise Problem(415, "Envía los datos como JSON.")
            if not request.content_length or request.content_length > 16384:
                raise Problem(413, "El formulario supera el límite permitido.")
            try:
                data = json.loads(request.get_data().decode("utf-8"))
            except (ValueError, UnicodeError, RecursionError):
                raise Problem(400, "El formulario tiene un formato incorrecto.")
            if not isinstance(data, dict):
                raise Problem(400, "El formulario tiene un formato incorrecto.")
        else:
            data = {}
        runtime.db_path = init_store(Path(app.config["PULSO_DATA_DIR"]))
        handler = object.__new__(WebHandler)
        handler.server = runtime
        handler.command = request.method
        handler.headers = request.headers
        with connect(runtime.db_path) as db:
            status, result, extra = handler.dispatch(db, "/api/" + route, request.query_string.decode(), data)
        body = result if isinstance(result, bytes) else json.dumps(result, ensure_ascii=False).encode("utf-8")
        response = Response(body, status=status, content_type=extra.get("content_type", "application/json; charset=utf-8"))
        response.headers.update(extra.get("headers", {}))
    except Problem as exc:
        response = app.json.response(error=str(exc))
        response.status_code = exc.status
    except sqlite3.Error:
        response = app.json.response(error="No se pudo acceder a los datos. Intenta de nuevo.")
        response.status_code = 503
    except (ValueError, UnicodeError):
        response = app.json.response(error="Solicitud no válida.")
        response.status_code = 400
    response.headers["Cache-Control"] = "no-store"
    return response


@app.route("/", defaults={"path": "index.html"})
@app.route("/<path:path>")
def static_file(path):
    if any(part.startswith(".") for part in Path(path).parts):
        return Response(status=404)
    return send_from_directory(PUBLIC, path, conditional=True)


application = app
