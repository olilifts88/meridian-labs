"""Build and verify the visitor download without network calls or model credentials."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def verify(archive):
    with tempfile.TemporaryDirectory(prefix="meridian-download-") as folder:
        with zipfile.ZipFile(archive) as package:
            for name in package.namelist():
                path = Path(name)
                assert not path.is_absolute() and ".." not in path.parts, name
                assert not set(path.parts) & {".git", ".openai", ".env", "rate-history"}, name
            package.extractall(folder)
        root = Path(folder) / "meridian-workflow-showcase"
        manifest = json.loads((root / "MANIFEST.json").read_text())
        for name, expected in manifest.items():
            assert hashlib.sha256((root / name).read_bytes()).hexdigest() == expected, name
        public = ROOT / "demo-web"
        expected_assets = {p.relative_to(public) for p in public.rglob("*") if p.is_file() and "rate-history" not in p.parts}
        actual_assets = {p.relative_to(root / "demo-web") for p in (root / "demo-web").rglob("*") if p.is_file()}
        assert actual_assets == expected_assets, "Packaged assets differ from demo-web"
        for name in expected_assets:
            assert (public / name).read_bytes() == (root / "demo-web" / name).read_bytes(), str(name)
        # Let the OS allocate a free port; tests never compete with a user's demo.
        startup = "from src.workflow_portfolio.web_demo import make_server; server=make_server(0, offline=True); print(server.server_address[1], flush=True); server.serve_forever()"
        port_file = Path(folder) / "port.txt"
        with port_file.open("w") as stdout:
            process = subprocess.Popen([sys.executable, "-u", "-c", startup], cwd=root, stdout=stdout, stderr=subprocess.DEVNULL)
        try:
            import time
            deadline = time.monotonic() + 10
            while not port_file.read_text().strip():
                assert process.poll() is None, "Packaged server exited during startup"
                assert time.monotonic() < deadline, "Packaged server startup timed out"
                time.sleep(0.05)
            base = "http://127.0.0.1:" + port_file.read_text().strip()
            # Ignore HTTP proxy variables for this local-only verification.
            http = urllib.request.build_opener(urllib.request.ProxyHandler({}))
            for route in ["/", "/scenarios.html?workflow=call-crm", "/workspace.html", "/assets/route-settings.mjs", "/assets/release-workbench.mjs"]:
                with http.open(base + route, timeout=5) as response:
                    assert response.status == 200, route
            with http.open(base + "/api/pricing/preflight", timeout=5) as response:
                pricing = json.load(response)
            assert pricing["status"] == "saved_rates" and len(pricing["card"]["models"]) == 5
            with http.open(base + "/data/recorded-runs.json", timeout=5) as response:
                assert len(json.load(response)["records"]) == 40
            for request, status in [(urllib.request.Request(base + "/api/review", data=b"{}"), 405), (base + "/../README.md", 404)]:
                try:
                    http.open(request, timeout=5)
                except urllib.error.HTTPError as error:
                    assert error.code == status
                else:
                    raise AssertionError("Unexpected server access: " + str(request))
            print(json.dumps({"manifest_files": len(manifest), "asset_parity": True, "http_paths": 5, "offline_pricing": True, "recorded_answers": 40, "writes_blocked": True}))
        finally:
            process.terminate()
            process.wait(timeout=5)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path)
    args = parser.parse_args()
    if args.archive:
        verify(args.archive)
    else:
        spec = importlib.util.spec_from_file_location("showcase_builder", ROOT / "scripts/build-workflow-showcase.py")
        builder = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(builder)
        with tempfile.TemporaryDirectory(prefix="meridian-build-") as folder:
            archive = Path(folder) / "meridian-ai-workflows.zip"
            builder.build(archive)
            verify(archive)
