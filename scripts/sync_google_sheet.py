import hashlib
import os
import shutil
import subprocess
import sys
from pathlib import Path

import requests

TOKEN_URL = "https://oauth2.googleapis.com/token"
DRIVE_EXPORT_URL = "https://www.googleapis.com/drive/v3/files/{file_id}/export"
XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_access_token(client_id: str, client_secret: str, refresh_token: str) -> str:
    response = requests.post(
        TOKEN_URL,
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    access_token = data.get("access_token", "")
    if not access_token:
        raise RuntimeError("Google token response did not include access_token")
    return access_token


def export_sheet_xlsx(sheet_id: str, access_token: str) -> bytes:
    response = requests.get(
        DRIVE_EXPORT_URL.format(file_id=sheet_id),
        params={"mimeType": XLSX_MIME},
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=60,
    )
    response.raise_for_status()
    return response.content


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def run_parser(repo_root: Path) -> None:
    parser_path = repo_root / "parser.py"
    if not parser_path.exists():
        raise RuntimeError("parser.py not found in repository root")

    subprocess.run([sys.executable, str(parser_path)], cwd=repo_root, check=True)


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    hash_path = repo_root / "data" / "google-sheet.hash"
    xlsx_path = repo_root / "timetable.xlsx"
    parser_output = repo_root / "timetable.json"
    app_json_path = repo_root / "lib" / "timetable-data.json"

    client_id = required_env("GOOGLE_CLIENT_ID")
    client_secret = required_env("GOOGLE_CLIENT_SECRET")
    refresh_token = required_env("GOOGLE_REFRESH_TOKEN")
    sheet_id = required_env("GOOGLE_SHEET_ID")

    print("Getting Google access token...")
    access_token = get_access_token(client_id, client_secret, refresh_token)

    print("Exporting Google Sheet as XLSX...")
    xlsx_bytes = export_sheet_xlsx(sheet_id, access_token)
    new_hash = sha256_bytes(xlsx_bytes)

    old_hash = hash_path.read_text(encoding="utf-8").strip() if hash_path.exists() else ""
    if new_hash == old_hash:
        print("No sheet changes detected. Exiting.")
        return 0

    print("Changes detected. Running parser...")
    xlsx_path.write_bytes(xlsx_bytes)

    run_parser(repo_root)

    if not parser_output.exists():
        raise RuntimeError("parser.py did not create timetable.json")

    app_json_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(parser_output, app_json_path)

    hash_path.parent.mkdir(parents=True, exist_ok=True)
    hash_path.write_text(new_hash + "\n", encoding="utf-8")

    print("Sync complete. Updated lib/timetable-data.json")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else "unknown"
        body = exc.response.text[:1000] if exc.response is not None else ""
        print(f"HTTP error from Google API (status={status}): {body}")
        raise
