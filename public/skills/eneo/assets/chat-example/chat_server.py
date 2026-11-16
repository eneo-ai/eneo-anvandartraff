#!/usr/bin/env python3
"""A small chat page for one Eneo assistant. No packages to install.

    python3 chat_server.py        then open http://127.0.0.1:8000

Reads ENEO_BASE_URL, ENEO_API_KEY and ENEO_ASSISTANT_ID from the environment or
from .env in the current folder. The key stays in this server process; the
browser only talks to /api/ask.
"""

import json
import os
import re
import socket
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST, PORT = "127.0.0.1", 8000
MAX_QUESTION_BYTES = 20_000
SESSION_ID = re.compile(r"^[0-9a-fA-F-]{36}$")

PAGE = """<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Chatta med assistenten</title>
<style>
  body { font-family: system-ui, sans-serif; line-height: 1.5; margin: 0; color: #1a1a1a; background: #f5f5f3; }
  main { max-width: 44rem; margin: 0 auto; padding: 1.5rem 1rem 2rem; }
  h1 { font-size: 1.4rem; }
  #messages { list-style: none; padding: 0; margin: 0 0 1rem; }
  #messages li { padding: 0.75rem 1rem; margin-bottom: 0.5rem; border-radius: 0.5rem; white-space: pre-wrap; overflow-wrap: anywhere; }
  .user { background: #dbe7f5; }
  .assistant { background: #fff; border: 1px solid #c9c9c4; }
  .error { background: #fde8e6; border: 1px solid #b3261e; }
  .who { display: block; font-weight: 600; font-size: 0.85rem; }
  form { display: flex; gap: 0.5rem; align-items: flex-end; }
  .field { flex: 1; }
  label { display: block; font-weight: 600; margin-bottom: 0.25rem; }
  textarea { width: 100%; box-sizing: border-box; min-height: 4.5rem; padding: 0.5rem; font: inherit; border: 1px solid #6b6b66; border-radius: 0.375rem; }
  button { font: inherit; padding: 0.6rem 1.1rem; border: 0; border-radius: 0.375rem; background: #1d4f91; color: #fff; cursor: pointer; }
  button:disabled { background: #6b6b66; cursor: default; }
  :focus-visible { outline: 3px solid #1d4f91; outline-offset: 2px; }
  #status { min-height: 1.5rem; color: #44443f; }
</style>
</head>
<body>
<main>
  <h1>Chatta med assistenten</h1>
  <ul id="messages" aria-live="polite" aria-label="Konversation"></ul>
  <p id="status" role="status"></p>
  <form id="form">
    <div class="field">
      <label for="question">Din fråga</label>
      <textarea id="question" required></textarea>
    </div>
    <button type="submit">Skicka</button>
  </form>
</main>
<script>
  const form = document.getElementById("form");
  const input = document.getElementById("question");
  const button = form.querySelector("button");
  const messages = document.getElementById("messages");
  const status = document.getElementById("status");
  let sessionId = null;

  function add(kind, who, text) {
    const item = document.createElement("li");
    item.className = kind;
    const label = document.createElement("span");
    label.className = "who";
    label.textContent = who;
    // textContent, not innerHTML: the answer is shown as text and cannot inject markup.
    item.append(label, document.createTextNode(text));
    messages.append(item);
    item.scrollIntoView({ block: "end" });
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    add("user", "Du", question);
    input.value = "";
    button.disabled = true;
    status.textContent = "Assistenten skriver ett svar. Det kan ta en stund.";
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, session_id: sessionId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Något gick fel.");
      sessionId = body.session_id;
      add("assistant", "Assistenten", body.answer);
    } catch (error) {
      add("error", "Fel", error.message);
    } finally {
      status.textContent = "";
      button.disabled = false;
      input.focus();
    }
  });

  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
  });
</script>
</body>
</html>
"""


def load_settings():
    values = {}
    env_file = Path(".env")
    if env_file.is_file():
        # utf-8-sig: Notepad and PowerShell may save the file with a byte order mark.
        for raw in env_file.read_text(encoding="utf-8-sig").splitlines():
            line = raw.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                values[key.strip()] = value.strip().strip("\"'")
    values.update({k: v for k, v in os.environ.items() if k.startswith("ENEO_")})
    missing = [k for k in ("ENEO_API_KEY", "ENEO_ASSISTANT_ID") if not values.get(k)]
    if missing:
        raise SystemExit(f"Missing in .env: {', '.join(missing)}")
    base = (values.get("ENEO_BASE_URL") or "https://eneo-modules.sundsvall.dev").rstrip("/")
    values["ENEO_BASE_URL"] = base.removesuffix("/api/v1")
    return values


SETTINGS = load_settings()


def ask_eneo(question, session_id):
    url = f"{SETTINGS['ENEO_BASE_URL']}/api/v1/assistants/{SETTINGS['ENEO_ASSISTANT_ID']}/sessions/"
    if session_id:
        url += f"{session_id}/"
    request = urllib.request.Request(
        url,
        data=json.dumps({"question": question}).encode("utf-8"),
        headers={"X-API-Key": SETTINGS["ENEO_API_KEY"], "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path != "/":
            self.send_error(404)
            return
        body = PAGE.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/api/ask":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length") or 0)
        if not 0 < length <= MAX_QUESTION_BYTES:
            self.send_json(413, {"error": "Frågan är för lång."})
            return
        try:
            payload = json.loads(self.rfile.read(length))
            question = str(payload["question"]).strip()
            session_id = payload.get("session_id")
        except (ValueError, KeyError, TypeError, AttributeError):
            self.send_json(400, {"error": "Ogiltig förfrågan."})
            return
        # The session id becomes part of the upstream path, so only a UUID is accepted.
        if not question or (session_id is not None and not SESSION_ID.match(str(session_id))):
            self.send_json(400, {"error": "Ogiltig förfrågan."})
            return
        try:
            reply = ask_eneo(question, session_id)
        except urllib.error.HTTPError as error:
            try:
                detail = json.loads(error.read()).get("message")
            except (ValueError, AttributeError):
                detail = None
            self.send_json(502, {"error": detail or f"Eneo svarade med fel {error.code}."})
            return
        except (urllib.error.URLError, TimeoutError, socket.timeout):
            self.send_json(504, {"error": "Det gick inte att nå Eneo. Försök igen."})
            return
        self.send_json(200, {"answer": reply.get("answer", ""), "session_id": reply.get("session_id")})


if __name__ == "__main__":
    print(f"Chat page: http://{HOST}:{PORT}  (Ctrl+C to stop)")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
