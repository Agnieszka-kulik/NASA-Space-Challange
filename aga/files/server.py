"""ASTRO EYE – lokalny serwer eye trackingu oparty na EyeTrax (https://github.com/ck-zhang/eyetrax).

Uruchomienie:
    pip install eyetrax screeninfo opencv-python numpy
    python server.py            # potem otwórz http://localhost:8000
Opcje: --camera 0  --monitor 0  --port 8000
Kamera jest czytana wyłącznie tutaj (przeglądarka jej nie używa), obraz nie opuszcza komputera.
"""
import argparse, json, os, threading
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

import cv2
import numpy as np
from eyetrax import GazeEstimator, run_9_point_calibration

ap = argparse.ArgumentParser()
ap.add_argument("--camera", type=int, default=0)
ap.add_argument("--monitor", type=int, default=0)
ap.add_argument("--port", type=int, default=8000)
args = ap.parse_args()
HERE = os.path.dirname(os.path.abspath(__file__))


def screen_size(idx):
    try:
        from screeninfo import get_monitors
        m = get_monitors()[idx]
        return float(m.width), float(m.height)
    except Exception:
        import tkinter as tk
        r = tk.Tk(); w, h = r.winfo_screenwidth(), r.winfo_screenheight(); r.destroy()
        return float(w), float(h)


SW, SH = screen_size(args.monitor)
lock = threading.Lock()
state = dict(status="idle", cam=False, face=False, valid=False, x=0.5, y=0.5, motion=0.0)
cmd = dict(calibrate=False, ref=False)


class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def _send(self, body, ctype="application/json"):
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith("/api/state"):
            with lock: self._send(json.dumps(state).encode())
        else:
            with open(os.path.join(HERE, "astro-eye.html"), "rb") as f:
                self._send(f.read(), "text/html; charset=utf-8")

    def do_POST(self):
        with lock:
            if self.path == "/api/calibrate":
                cmd["calibrate"] = True; state["status"] = "calibrating"
            elif self.path == "/api/ref":
                cmd["ref"] = True
        self._send(b"{}")


threading.Thread(target=lambda: ThreadingHTTPServer(("127.0.0.1", args.port), H).serve_forever(), daemon=True).start()
print(f"ASTRO EYE: otwórz http://localhost:{args.port} (ekran {SW:.0f}x{SH:.0f})")


def small_gray(frame):
    g = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    return cv2.resize(g, (64, 48), interpolation=cv2.INTER_AREA).astype(np.float32)


def motion_score(cur, ref):
    a = cur[6:42, 12:52]; b = ref[6:42, 12:52]
    return float(np.mean(np.abs((a - a.mean()) - (b - b.mean()))))


est = GazeEstimator()
cap = cv2.VideoCapture(args.camera)
calibrated, ref = False, None

while True:
    if cmd["calibrate"]:
        cap.release()
        try:
            run_9_point_calibration(est, camera_index=args.camera)
        except TypeError:
            run_9_point_calibration(est)
        cv2.destroyAllWindows()
        cap = cv2.VideoCapture(args.camera)
        calibrated, ref = True, None
        with lock: cmd["calibrate"] = False; state["status"] = "ready"
        continue

    ok, frame = cap.read()
    if not ok:
        with lock: state.update(cam=False, face=False, valid=False)
        cv2.waitKey(30); continue

    g = small_gray(frame)
    if cmd["ref"]:
        ref = g; cmd["ref"] = False
    motion = motion_score(g, ref) if ref is not None else 0.0

    face = valid = False; x = y = 0.5
    try:
        features, blink = est.extract_features(frame)
        face = features is not None
        valid = calibrated and face and not blink
        if valid:
            px, py = est.predict([features])[0]
            x = min(max(float(px) / SW, 0.0), 1.0); y = min(max(float(py) / SH, 0.0), 1.0)
    except Exception:
        valid = False
    with lock:
        state.update(cam=True, face=face, valid=valid, x=x, y=y, motion=motion)
