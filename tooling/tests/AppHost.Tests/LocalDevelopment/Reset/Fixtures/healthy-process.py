import http.server
import os


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        gate = os.environ.get("HEALTH_GATE_FILE")
        self.send_response(200 if not gate or os.path.isfile(gate) else 503)
        self.end_headers()
        self.wfile.write(b"healthy")

    def log_message(self, *_):
        pass


http.server.ThreadingHTTPServer(("127.0.0.1", int(os.environ["PORT"])), Handler).serve_forever()
