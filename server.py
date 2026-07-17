import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", "8000"))
DATA_FILE = os.path.join(ROOT, "data.json")


def load_state():
    if not os.path.exists(DATA_FILE):
        return {"rooms": {}}
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return {"rooms": {}}


def save_state(state):
    with open(DATA_FILE, "w", encoding="utf-8") as fh:
        json.dump(state, fh, ensure_ascii=False, indent=2)


class Handler(BaseHTTPRequestHandler):
    def _send(self, status, payload, content_type="application/json"):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def _serve_static(self, path):
        if path in ["", "/"]:
            path = "/index.html"
        if path.startswith("/api/") or path == "/api":
            return False
        file_path = ROOT + path
        if not os.path.exists(file_path) or os.path.isdir(file_path):
            self.send_response(404)
            self.end_headers()
            return True
        with open(file_path, "rb") as fh:
            content = fh.read()
        self.send_response(200)
        if file_path.endswith(".css"):
            self.send_header("Content-Type", "text/css; charset=utf-8")
        elif file_path.endswith(".js"):
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
        elif file_path.endswith(".html"):
            self.send_header("Content-Type", "text/html; charset=utf-8")
        else:
            self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)
        return True

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path == "/api/health":
            self._send(200, {"ok": True, "message": "servidor listo"})
            return

        if path.startswith("/api/state/"):
            code = path.split("/api/state/", 1)[1]
            state = load_state()
            room = state.get("rooms", {}).get(code)
            if room:
                self._send(200, {"ok": True, "room": room, "students": room.get("students", [])})
            else:
                self._send(404, {"ok": False, "room": None, "students": []})
            return

        self._serve_static(path)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path != "/api/sync":
            self._send(404, {"ok": False, "error": "ruta no válida"})
            return

        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length).decode("utf-8")
        try:
            data = json.loads(body or "{}")
        except Exception as e:
            self._send(400, {"ok": False, "error": str(e)})
            return

        code = data.get("codigo")
        if not code:
            self._send(400, {"ok": False, "error": "falta codigo"})
            return

        state = load_state()
        rooms = state.setdefault("rooms", {})
        room = rooms.get(code) or {"codigo": code, "estado": "espera", "precios": [], "students": []}

        if data.get("room"):
            room.update(data["room"])
        if "students" in data and isinstance(data["students"], list):
            merged_students = {}
            def key_for_student(est):
                if not isinstance(est, dict):
                    return None
                if est.get("id"):
                    return f"id:{est['id']}"
                return f"{est.get('nombre')}|{est.get('grado')}|{est.get('seccion')}"

            for est in room.get("students", []):
                clave = key_for_student(est)
                if clave:
                    merged_students[clave] = est
            for est in data["students"]:
                clave = key_for_student(est)
                if clave:
                    merged_students[clave] = est
            room["students"] = list(merged_students.values())

        rooms[code] = room
        save_state(state)
        self._send(200, {"ok": True, "room": room, "students": room.get("students", [])})


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Servidor listo en http://0.0.0.0:{PORT}")
    server.serve_forever()
