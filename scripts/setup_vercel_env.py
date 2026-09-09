"""One-shot setup for live sheet syncing.

Runs the Google consent flow, then writes the four credentials straight into the
Vercel project. Values are piped to `vercel env add` over stdin and are never
printed, so the refresh token does not pass through your clipboard, your shell
history, or a terminal transcript.

Usage:
    python3 scripts/setup_vercel_env.py [--sheet-id ID] [--project NAME]

Needs client_secret.json in the repo root (gitignored) and a logged-in Vercel
CLI (`vercel login`).
"""

import argparse
import json
import os
import secrets
import subprocess
import sys
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlencode, urlparse

import requests

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
REDIRECT_URI = "http://127.0.0.1:8765/callback"

# Read-only access to spreadsheets, and nothing else. Deliberately excludes
# drive.readonly, which the old Drive-based export needed: that scope would let
# anyone holding this token read every file in the account's Drive.
SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

DEFAULT_SHEET_ID = "1D9JoU82HhSe1td3dXVROzDeRTDQPS5IXRYf0Yl4Y5hM"
ENVIRONMENTS = ("production", "preview", "development")


class OAuthCallbackHandler(BaseHTTPRequestHandler):
    auth_code: "str | None" = None
    auth_state: "str | None" = None

    def do_GET(self) -> None:  # noqa: N802
        query = parse_qs(urlparse(self.path).query)
        OAuthCallbackHandler.auth_code = (query.get("code") or [None])[0]
        OAuthCallbackHandler.auth_state = (query.get("state") or [None])[0]

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(b"<h2>Done. You can close this tab.</h2>")

    def log_message(self, format: str, *args: object) -> None:
        return


def load_client_credentials() -> "tuple[str, str]":
    path = os.getenv("GOOGLE_CLIENT_JSON", "client_secret.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    section = data.get("installed") or data.get("web") or {}
    client_id = section.get("client_id", "").strip()
    client_secret = section.get("client_secret", "").strip()

    if not client_id or not client_secret:
        raise RuntimeError(f"No client_id/client_secret found in {path}")

    return client_id, client_secret


def obtain_refresh_token(client_id: str, client_secret: str) -> str:
    state = secrets.token_urlsafe(16)

    OAuthCallbackHandler.auth_code = None
    OAuthCallbackHandler.auth_state = None
    server = HTTPServer(("127.0.0.1", 8765), OAuthCallbackHandler)
    thread = threading.Thread(target=server.handle_request, daemon=True)
    thread.start()

    params = {
        "client_id": client_id,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    url = f"{AUTH_URL}?{urlencode(params)}"

    print("Approve access in the browser window that just opened.")
    print("If it did not open, paste this into your browser:\n")
    print(url, "\n")

    try:
        webbrowser.open(url)
    except Exception:
        pass

    thread.join(timeout=180)
    code = OAuthCallbackHandler.auth_code

    if not code:
        redirected = input("Paste the URL you were redirected to: ").strip()
        if redirected:
            code = (parse_qs(urlparse(redirected).query).get("code") or [""])[0]

    if OAuthCallbackHandler.auth_state and OAuthCallbackHandler.auth_state != state:
        raise RuntimeError("OAuth state mismatch, please retry")

    server.server_close()

    if not code:
        raise RuntimeError("No authorization code received")

    response = requests.post(
        TOKEN_URL,
        data={
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=30,
    )
    response.raise_for_status()

    refresh_token = response.json().get("refresh_token")
    if not refresh_token:
        raise RuntimeError(
            "Google returned no refresh_token. Revoke the app's access at "
            "https://myaccount.google.com/permissions and run this again."
        )

    return refresh_token


def set_env(name: str, value: str, project: "str | None") -> None:
    """Write one variable to every Vercel environment, replacing any existing one."""
    for environment in ENVIRONMENTS:
        base = ["npx", "vercel", "env"]
        scope = ["--yes"] + (["--scope", project] if project else [])

        # Remove first: `env add` fails when the name already exists.
        subprocess.run(
            base + ["rm", name, environment] + scope,
            input="",
            capture_output=True,
            text=True,
        )

        done = subprocess.run(
            base + ["add", name, environment],
            input=value,
            capture_output=True,
            text=True,
        )

        if done.returncode != 0:
            # stderr can echo the value back, so report only the variable name.
            raise RuntimeError(f"vercel env add failed for {name} ({environment})")

    print(f"  set {name}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sheet-id", default=DEFAULT_SHEET_ID)
    parser.add_argument("--project", default=None, help="Vercel scope, if not the default")
    args = parser.parse_args()

    client_id, client_secret = load_client_credentials()
    refresh_token = obtain_refresh_token(client_id, client_secret)

    print("\nWriting credentials to Vercel...")
    set_env("GOOGLE_CLIENT_ID", client_id, args.project)
    set_env("GOOGLE_CLIENT_SECRET", client_secret, args.project)
    set_env("GOOGLE_REFRESH_TOKEN", refresh_token, args.project)
    set_env("GOOGLE_SHEET_ID", args.sheet_id, args.project)

    print("\nDone. Deploy to pick them up:")
    print("  npx vercel deploy --prod")
    print("\nThen confirm live syncing:")
    print("  curl -s https://nustview.vercel.app/api/timetable | head -c 120")
    print('  (expect "source":"live")')
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nCancelled.")
        sys.exit(1)
