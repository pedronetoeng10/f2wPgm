#!/usr/bin/env python3
"""Servidor HTTP local para o WebGIS Viewer (GeoJSON + QMD)."""

import http.server
import os
import socketserver
import webbrowser
from pathlib import Path

PORT = int(os.environ.get("PORT", "3000"))
ROOT = Path(__file__).resolve().parent


class WebGISHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Cache-Control", "no-store")
        if self.path.endswith(".geojson"):
            self.send_header("Content-Type", "application/geo+json; charset=utf-8")
        elif self.path.endswith(".qmd"):
            self.send_header("Content-Type", "application/xml; charset=utf-8")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def log_message(self, fmt, *args):
        print("[WebGIS]", fmt % args)


class ThreadingHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


def check_data_files():
    data_dir = ROOT / "data"
    required = ["estado.geojson", "CAR.geojson", "estado.qmd", "CAR.qmd"]
    print(" Verificando pasta data/:")
    missing = []
    for name in required:
        path = data_dir / name
        if path.is_file():
            size_mb = path.stat().st_size / (1024 * 1024)
            print(f"   OK  {name} ({size_mb:.1f} MB)")
        else:
            print(f"   FALTA  {name}")
            missing.append(name)
    if missing:
        print(" AVISO: arquivos ausentes em data/ — camadas podem falhar no navegador.")
    return not missing


def main():
    url = f"http://localhost:{PORT}"
    print("========================================")
    print(" WebGIS Viewer ativo")
    print(f" URL: {url}")
    print(f" Pasta: {ROOT}")
    check_data_files()
    print(" Pressione Ctrl+C para encerrar")
    print("========================================")

    if os.environ.get("NO_OPEN") != "1":
        webbrowser.open(url)

    with ThreadingHTTPServer(("", PORT), WebGISHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor encerrado.")


if __name__ == "__main__":
    main()
