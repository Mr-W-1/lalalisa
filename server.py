#!/usr/bin/env python3
"""High-speed LAN server for LaLaLisa + JENNIE Native Three.js Web Edition (iPhone + Desktop).
Serves directly from outputs/LaLaLisa-Repo with HTTP Range streaming for iOS Safari audio/video.
"""

import argparse
import mimetypes
import socket
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

REPO_ROOT = Path(__file__).resolve().parent

mimetypes.add_type("model/gltf-binary", ".glb")
mimetypes.add_type("model/gltf+json", ".gltf")
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("video/mp4", ".mp4")
mimetypes.add_type("audio/mpeg", ".mp3")
mimetypes.add_type("audio/wav", ".wav")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("image/webp", ".webp")


def lan_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("1.1.1.1", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return "127.0.0.1"


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        pass

    def _resolve_path(self, raw_path: str) -> Path | None:
        clean = unquote(urlsplit(raw_path).path)
        if clean == "/" or clean == "":
            return REPO_ROOT / "index.html"
        rel = clean.lstrip("/")
        target = (REPO_ROOT / rel).resolve()
        return target if str(target).startswith(str(REPO_ROOT.resolve())) else None

    def _serve_file(self, head_only: bool):
        target = self._resolve_path(self.path)
        if target is None or not target.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        size = target.stat().st_size
        ctype, _ = mimetypes.guess_type(str(target))
        if not ctype:
            ctype = "application/octet-stream"

        range_hdr = self.headers.get("Range")
        start, end = 0, size - 1
        status = HTTPStatus.OK
        if range_hdr and range_hdr.startswith("bytes="):
            spec = range_hdr[6:].split(",")[0].strip()
            s_str, e_str = spec.split("-", 1)
            if s_str:
                start = int(s_str)
            if e_str:
                end = min(size - 1, int(e_str))
            if start >= size or start > end:
                self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                self.send_header("Content-Range", f"bytes */{size}")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            status = HTTPStatus.PARTIAL_CONTENT

        length = end - start + 1
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(length))
        if status == HTTPStatus.PARTIAL_CONTENT:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        if target.suffix in (".jpg", ".png", ".webp", ".mp3", ".mp4", ".wav", ".ttf"):
            self.send_header("Cache-Control", "public, max-age=3600")
        else:
            self.send_header("Cache-Control", "no-store")
        self.end_headers()

        if head_only:
            return
        with target.open("rb") as fh:
            fh.seek(start)
            remaining = length
            while remaining > 0:
                chunk = fh.read(min(131072, remaining))
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                except (BrokenPipeError, ConnectionResetError):
                    break
                remaining -= len(chunk)

    def do_HEAD(self):
        self._serve_file(True)

    def do_GET(self):
        self._serve_file(False)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    srv = ThreadingHTTPServer(("0.0.0.0", args.port), Handler)
    ip = lan_ip()
    print(f"\n  LaLaLisa + JENNIE · Bangkok After Dark")
    print(f"  iPhone / LAN : http://{ip}:{args.port}/")
    print(f"  Local Mac    : http://127.0.0.1:{args.port}/\n", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()


if __name__ == "__main__":
    main()
