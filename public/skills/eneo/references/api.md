# Calling an assistant from your own code

All paths are relative to `ENEO_BASE_URL`. Every request carries the key in the
`X-API-Key` header. Bodies and responses are JSON unless stated otherwise.
Exact schemas are in `openapi-core.json` next to this file. A key scoped to the
assistant with permission **Skriv** is enough.

Contents: [Ask](#ask-an-assistant) · [Follow-up](#ask-a-follow-up) ·
[Files](#send-a-file) · [Streaming](#streaming) ·
[Find an assistant](#find-an-assistant) · [Errors](#errors) ·
[Design decisions](#design-decisions) · [Examples](#complete-examples)

## Ask an assistant

`POST /api/v1/assistants/{assistant_id}/sessions/` starts a new conversation.

Request body:

| Field | Type | Notes |
| --- | --- | --- |
| `question` | string, required | The user's text. |
| `files` | array of file ids | Ids returned by the upload call below. |
| `stream` | boolean, default `false` | `true` switches the response to Server-Sent Events. |

Response (`stream` false):

| Field | Notes |
| --- | --- |
| `answer` | The assistant's reply as text, usually Markdown. |
| `session_id` | Keep it to ask follow-up questions. |
| `references` | Knowledge sources the answer drew on, when the assistant has knowledge attached. |
| `files`, `generated_files` | Files sent with the question and files the assistant produced. |

Other fields describe the model and tools and can be ignored at first.

## Ask a follow-up

`POST /api/v1/assistants/{assistant_id}/sessions/{session_id}/` takes the same
body and returns the same response. Eneo keeps the history, so send only the new
question.

## Send a file

Two steps: upload the file, then refer to it in a question.

1. `POST /api/v1/files/` as `multipart/form-data` with the file in a part named
   `upload_file`. The response contains `id`, `name`, `mimetype` and `size`.
2. Ask with `"files": ["<id>"]`.

Uploads are refused with `415` for file types the installation does not accept
and `413` when the file is too large. Uploading needs a user key; service keys
cannot upload. `DELETE /api/v1/files/{id}/` removes a file and needs permission
**Admin**.

```bash
curl -sS -X POST "$ENEO_BASE_URL/api/v1/files/" \
  -H "X-API-Key: $ENEO_API_KEY" \
  -F "upload_file=@notes.pdf"
```

The example is for bash. In PowerShell, `curl` is a different command: use
`curl.exe` and `$env:ENEO_BASE_URL`, or the bundled caller, which works the same
everywhere: `eneo_call.py POST "/api/v1/files/" --form upload_file=notes.pdf`.

## Streaming

Send `"stream": true`. The response is `text/event-stream`:

- Each event's `data:` line is a JSON object shaped like the normal response.
- Its `answer` field holds the next fragment of text, not the text so far.
  Append the fragments in order to build the full answer.
- `session_id` is present in every event.
- Lines starting with `:` are keep-alive comments. Ignore them.
- The stream ends when the server closes the connection.

## Find an assistant

The assistant's id is in the address bar when it is open in Eneo:
`/spaces/<space_id>/assistants/<assistant_id>/edit`. Through the API,
`GET /api/v1/spaces/{space_id}/applications/` lists a space's assistants under
`assistants.items`, each with `id` and `name`.

## Errors

Error responses share one shape:

```json
{ "message": "Human-readable explanation", "code": "stable_identifier", "request_id": "..." }
```

Branch on `code` or the HTTP status, not on the wording of `message`. A `422`
additionally lists the fields that failed validation in `details`.

## Design decisions

These hold for nearly every integration:

- **Keep the key on the server.** A browser page, mobile app or anything else
  the end user can inspect must not contain the key. Give the application a
  small server route of its own, for example `POST /api/ask`, that adds the key
  and forwards the request. A script or backend job can call Eneo directly.
- **Start without streaming.** Add it when the wait feels long.
- **Allow for slow answers.** A model can take tens of seconds. Use a timeout
  of at least 120 seconds and show that work is in progress.
- **Keep `session_id`** when the user should be able to ask follow-up questions.
- **Show errors usefully.** Show `message` to the user and log `request_id`.
- **Treat the answer as text.** Do not insert it into a page as HTML without
  sanitising it.

## Complete examples

Python, standard library only:

```python
import json
import os
import urllib.request

def ask(question, session_id=None, file_ids=()):
    base = os.environ["ENEO_BASE_URL"].rstrip("/")
    url = f"{base}/api/v1/assistants/{os.environ['ENEO_ASSISTANT_ID']}/sessions/"
    if session_id:
        url += f"{session_id}/"
    request = urllib.request.Request(
        url,
        data=json.dumps({"question": question, "files": list(file_ids)}).encode(),
        headers={
            "X-API-Key": os.environ["ENEO_API_KEY"],
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)

reply = ask("Vad kan du hjälpa mig med?")
print(reply["answer"])
follow_up = ask("Ge ett exempel.", session_id=reply["session_id"])
print(follow_up["answer"])
```

JavaScript on the server (Node 18 or later, no packages):

```js
export async function ask(question, sessionId) {
  const base = process.env.ENEO_BASE_URL.replace(/\/$/, "");
  const path = `/api/v1/assistants/${process.env.ENEO_ASSISTANT_ID}/sessions/`;
  const response = await fetch(base + path + (sessionId ? `${sessionId}/` : ""), {
    method: "POST",
    headers: {
      "X-API-Key": process.env.ENEO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? `Eneo answered ${response.status}`);
  return body; // { answer, session_id, ... }
}
```
