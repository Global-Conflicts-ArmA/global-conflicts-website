"""Loopback receiver for the website's new-modpack button. Run on the Windows game host."""
import hmac
import json
import os
from pathlib import Path
import re
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path.cwd()
LOCK = threading.Lock()


def launcher(guid, preview=False):
    # Only a validated hex GUID varies on this command line. All paths are relative
    # to the administrator-selected working directory.
    return [os.environ["COMSPEC"], "/d", "/c", "Start-GCMission.bat",
            f"missions/{guid}.launch.json", "-Config", "new-modpack.json",
            "-ProfileDirectory", "new-modpack-profile"] + (["-PlanOnly"] if preview else [])


def watch_startup(process):
    # Serialize requests through the launcher's receipt check, then allow another
    # mission to be selected while this launcher continues supervising its server.
    try:
        for line in process.stdout:
            print(line.rstrip(), flush=True)
            if line.startswith("Ready:"):
                break
        else:
            print(f"Launcher exited during startup ({process.wait()})", flush=True)
    finally:
        LOCK.release()
    for line in process.stdout:
        print(line.rstrip(), flush=True)
    process.stdout.close()
    process.wait()


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if self.path != "/launch":
            return self.reply(404, {})
        expected = "Bearer " + self.server.token
        if not hmac.compare_digest(self.headers.get("Authorization", "").encode(), expected.encode()):
            return self.reply(403, {})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 8192:
                raise ValueError()
            payload = json.loads(self.rfile.read(length))
            scenario = payload["scenarioId"]
            match = re.fullmatch(r"\{([a-fA-F0-9]{16})\}[^\r\n]+\.conf", scenario, re.IGNORECASE)
            if not match:
                raise ValueError()
        except (ValueError, KeyError, TypeError):
            return self.reply(400, {"error": "Invalid scenario"})
        guid = match[1].upper()
        if not LOCK.acquire(blocking=False):
            return self.reply(409, {"error": "Launch already in progress"})
        handed_off = False
        try:
            metadata = ROOT / "missions" / f"{guid}.launch.json"
            if not metadata.is_file():
                return self.reply(404, {"error": "Mission metadata has not been deployed"})
            record = json.loads(metadata.read_text(encoding="utf-8-sig"))
            if not isinstance(record, dict) or str(record.get("scenario")).casefold() != scenario.casefold():
                return self.reply(409, {"error": "Deployed scenario differs from the website"})
            subprocess.run(launcher(guid, preview=True), cwd=ROOT, check=True, timeout=25)
            # This site-specific script knows which service owns the event server.
            # It must wait for a clean shutdown (including the old launcher).
            subprocess.run(["powershell.exe", "-NoProfile", "-NonInteractive", "-File",
                            str(ROOT / "stop-event-server.ps1")], cwd=ROOT, check=True, timeout=60)
            process = subprocess.Popen(launcher(guid), cwd=ROOT, stdout=subprocess.PIPE,
                                       stderr=subprocess.STDOUT, text=True, errors="replace")
            threading.Thread(target=watch_startup, args=(process,), daemon=True).start()
            handed_off = True
            return self.reply(202, {"accepted": True})
        except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
            print(f"Launch failed for {guid}: {error}", flush=True)
            return self.reply(500, {"error": "Game host could not start the launcher"})
        finally:
            if not handed_off:
                LOCK.release()


if __name__ == "__main__":
    token = os.environ["NEW_MODPACK_LAUNCH_TOKEN"]
    if not token or not all((ROOT / name).is_file() for name in (
            "Start-GCMission.bat", "ArmaReforgerServer.exe", "new-modpack.json", "stop-event-server.ps1")):
        raise SystemExit("Configure the token, launcher, executable, server config and stop script first.")
    server = ThreadingHTTPServer(("127.0.0.1", 8771), Handler)
    server.token = token
    server.serve_forever()
