import json
import os
import secrets
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlencode, urlparse

import requests

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
]
REDIRECT_URI = "http://127.0.0.1:8765/callback"


class OAuthCallbackHandler(BaseHTTPRequestHandler):
    auth_code: str | None = None
    auth_state: str | None = None

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)

        OAuthCallbackHandler.auth_code = (query.get("code") or [None])[0]
        OAuthCallbackHandler.auth_state = (query.get("state") or [None])[0]

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(
            b"<h2>Authorization received. You can close this tab and return to terminal.</h2>"
        )

    def log_message(self, format: str, *args: object) -> None:
        return


def load_client_credentials() -> tuple[str, str]:
    path = os.getenv("GOOGLE_CLIENT_JSON", "client_secret.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    desktop = data.get("installed") or data.get("web") or {}
    client_id = desktop.get("client_id", "").strip()
    client_secret = desktop.get("client_secret", "").strip()

    if not client_id or not client_secret:
        raise RuntimeError("Could not find client_id/client_secret in the client JSON file")

    return client_id, client_secret


def main() -> int:
    client_id, client_secret = load_client_credentials()
    state = secrets.token_urlsafe(16)

    OAuthCallbackHandler.auth_code = None
    OAuthCallbackHandler.auth_state = None
    server = HTTPServer(("127.0.0.1", 8765), OAuthCallbackHandler)
    server_thread = threading.Thread(target=server.handle_request, daemon=True)
    server_thread.start()

    params = {
        "client_id": client_id,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }

    url = AUTH_URL + "?" + urlencode(params)
    print("Open this URL and login with your viewer Google account:")
    print(url)

    try:
        webbrowser.open(url)
    except Exception:
        pass

    server_thread.join(timeout=180)
    code = OAuthCallbackHandler.auth_code

    if not code:
        redirected_url = input("\nPaste the final redirected URL from browser: ").strip()
        if redirected_url:
            parsed = urlparse(redirected_url)
            query = parse_qs(parsed.query)
            code = (query.get("code") or [""])[0]

    callback_state = OAuthCallbackHandler.auth_state
    if callback_state and callback_state != state:
        raise RuntimeError("OAuth state mismatch. Please retry.")

    server.server_close()

    if not code:
        raise RuntimeError("No authorization code received")

    token_resp = requests.post(
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
    token_resp.raise_for_status()
    token_data = token_resp.json()

    refresh_token = token_data.get("refresh_token")
    if not refresh_token:
        raise RuntimeError(
            "No refresh_token returned. Re-run and ensure prompt=consent, offline access, and first-time consent."
        )

    print("\nSave these as GitHub Secrets:")
    print(f"GOOGLE_CLIENT_ID={client_id}")
    print(f"GOOGLE_CLIENT_SECRET={client_secret}")
    print(f"GOOGLE_REFRESH_TOKEN={refresh_token}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
