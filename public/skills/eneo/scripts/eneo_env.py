"""Shared helpers: settings from .env, one HTTP call to Eneo, readable errors."""

import json
import mimetypes
import os
import socket
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

DEFAULT_BASE_URL = "https://eneo-modules.sundsvall.dev"

# Set explicitly instead of asking the system. On Windows, mimetypes also reads
# the registry, where installed programs change types (.csv becomes an Excel
# type), and older Python versions (3.9, for one) do not know .md. Eneo stores
# the type the upload declares.
CONTENT_TYPES = {
    ".md": "text/markdown",
    ".markdown": "text/markdown",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".json": "application/json",
    ".pdf": "application/pdf",
}

# Keyed by the `code` field of Eneo's error body, then by HTTP status.
HINTS = {
    "invalid_api_key": "The key was not accepted: it is mistyped, revoked, "
    "expired or suspended, or it belongs to another Eneo installation.",
    "insufficient_scope": "The key's scope does not cover this resource. A key "
    "scoped to one space, assistant or app only works inside it.",
    "insufficient_resource_permission": "The key has fine-grained resource "
    "permissions and this resource type is not allowed by them.",
    "owner_permission_revoked": "An Organisation-scoped user key only works "
    "for an administrator. Create a key scoped to a space instead.",
    "owner_membership_revoked": "The key's owner is no longer a member of the "
    "space the key is scoped to.",
    "service_key_cannot_create_resources": "Service keys cannot create new "
    "assistants, spaces, files or collections. Use a user key for that.",
    "origin_not_allowed": "A public (pk_) key only works from the web "
    "origins it lists. Use a secret (sk_) key on a server.",
    "rate_limit_exceeded": "Rate limit reached. Wait and try again.",
    "file_in_use": "The file is still used, for example by a conversation. "
    "Delete what uses it first (deleting an assistant removes its "
    "conversations), then the file. 'details' lists the uses under 'blockers'.",
    401: "The key was not accepted. Check ENEO_API_KEY.",
    403: "The key is valid but may not do this. Creating or changing needs "
    "permission 'write', deleting needs 'admin', and the key's scope must "
    "cover the resource.",
    404: "Not found. Check the id in the path; something already deleted also "
    "answers 404. An unknown assistant id gives 404 even when the key would "
    "not have covered it.",
    409: "The resource is still in use or in a state that blocks this. "
    "'details' says what is in the way.",
    422: "Eneo rejected the request body. 'details' lists the failing fields.",
    429: "Rate limit reached. Wait and try again.",
}


class EneoError(Exception):
    def __init__(self, status, body):
        super().__init__(f"Eneo answered HTTP {status}")
        self.status = status
        self.body = body

    def explain(self):
        lines = [f"Eneo answered HTTP {self.status}"]
        body = self.body if isinstance(self.body, dict) else {"message": str(self.body)[:500]}
        for field in ("message", "code", "request_id", "details"):
            if body.get(field):
                lines.append(f"  {field}: {body[field]}")
        hint = HINTS.get(body.get("code")) or HINTS.get(self.status)
        if hint:
            lines.append(f"Hint: {hint}")
        return "\n".join(lines)


def use_utf8_output():
    """Print as UTF-8 on every platform.

    On Windows, Python writes with the system code page (cp1252) when the
    output goes to a pipe, which is how a coding agent runs these scripts.
    Swedish letters then arrive garbled, and a character outside the code page
    stops the script with UnicodeEncodeError.
    """
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure:
            reconfigure(encoding="utf-8", errors="replace")


def api_path(path):
    """Return the path as Eneo expects it, starting with /api/.

    Git Bash on Windows rewrites an argument that starts with a slash into a
    Windows path, so "/api/v1/spaces/" can arrive as
    "C:/Program Files/Git/api/v1/spaces/". Cut that prefix off again.
    """
    path = path.strip()
    if "/api/" not in path and "\\api\\" in path:
        path = path.replace("\\", "/")
    if "/api/" in path and not path.startswith("/api/"):
        path = path[path.index("/api/"):]
    return path


def load_dotenv(path=".env"):
    """Return KEY=value pairs from a .env file; real environment variables win."""
    values = {}
    file = Path(path)
    if file.is_file():
        # utf-8-sig: Notepad and PowerShell may save the file with a byte order mark.
        for raw in file.read_text(encoding="utf-8-sig").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            values[key.strip().removeprefix("export ").strip()] = value
    values.update({k: v for k, v in os.environ.items() if k.startswith("ENEO_")})
    return values


def base_url(values):
    """Normalize the address: no trailing slash and no /api/v1 suffix."""
    url = (values.get("ENEO_BASE_URL") or DEFAULT_BASE_URL).strip().rstrip("/")
    return url.removesuffix("/api/v1")


def _multipart(files):
    boundary = uuid.uuid4().hex
    parts = []
    for field, path in files.items():
        file = Path(path)
        content_type = (
            CONTENT_TYPES.get(file.suffix.lower())
            or mimetypes.guess_type(file.name)[0]
            or "application/octet-stream"
        )
        parts.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="{field}"; '
            f'filename="{file.name}"\r\nContent-Type: {content_type}\r\n\r\n'.encode()
            + file.read_bytes()
            + b"\r\n"
        )
    parts.append(f"--{boundary}--\r\n".encode())
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def _read_stream(response):
    """Collect a streamed answer (`stream: true`) into one ordinary response.

    Each event is a `data:` line holding a JSON object shaped like the normal
    response, whose `answer` is the next fragment of text. Returns the last
    event with the fragments joined in `answer`.
    """
    result, fragments = {}, []
    for raw in response:
        line = raw.decode("utf-8", "replace").strip()
        if not line.startswith("data:"):
            continue  # blank separator lines and ":" keep-alive comments
        try:
            event = json.loads(line[5:])
        except ValueError:
            continue
        if isinstance(event, dict):
            fragments.append(event.get("answer") or "")
            result = event
    result["answer"] = "".join(fragments)
    return result


def call(method, path, *, values=None, json_body=None, files=None, query=None, timeout=120):
    """Make one authenticated call. Returns parsed JSON, or None for an empty body.

    `files` maps a multipart field name to a local file path.
    """
    values = load_dotenv() if values is None else values
    key = (values.get("ENEO_API_KEY") or "").strip()
    if not key:
        raise SystemExit("ENEO_API_KEY is not set. Add it to .env in this folder.")
    path = api_path(path)
    if not path.startswith("/"):
        raise SystemExit(f"The path must start with /api/v1/, got '{path}'.")
    url = base_url(values) + path
    if query:
        url += ("&" if "?" in url else "?") + urllib.parse.urlencode(query)
    headers = {"X-API-Key": key, "Accept": "application/json"}
    data = None
    if files:
        data, headers["Content-Type"] = _multipart(files)
    elif json_body is not None:
        data = json.dumps(json_body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method=method.upper())
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            if response.headers.get_content_type() == "text/event-stream":
                return _read_stream(response)
            raw = response.read()
    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8", "replace")
        try:
            body = json.loads(raw)
        except ValueError:
            body = raw
        raise EneoError(error.code, body) from None
    except urllib.error.URLError as error:
        raise SystemExit(
            f"Could not reach {base_url(values)} ({error.reason}). "
            "Check ENEO_BASE_URL and the network."
        ) from None
    except (TimeoutError, socket.timeout):
        raise SystemExit(f"No answer within {timeout} seconds. Try again.") from None
    return json.loads(raw) if raw.strip() else None
