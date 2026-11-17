# Creating, configuring and running an app

An app is one fixed task with a form in front of it: the user gives a text, a
document, a recording or an image and gets one result back, for example
"summarise this record" or "turn this recording into notes". There is no
conversation. Choose an assistant instead when the user wants to ask follow-up
questions.

`CALL` is shorthand for `python3 <this-skill-folder>/scripts/eneo_call.py`
(`python` or `py -3` on Windows). Write it out in full in each command; a shell
variable holding it fails in zsh, the default shell on macOS.

The key needs scope **Yta** (or wider) and permission **Skriv**. Choose the
space and the model as in `manage.md`, sections 2 and 3.

## 1. Create

```bash
CALL POST "/api/v1/spaces/<space_id>/applications/apps/" --json '{"name": "Sammanfatta protokoll"}' --fields id,name,published,input_fields
```

The app starts as a draft with one text field and a model already chosen.

## 2. Configure

An app has exactly one input; a second one is refused with `400`. Choose it by
what the user hands over:

| `type` | The user gives | Accepts |
| --- | --- | --- |
| `text-field` | Text, typed or pasted | - |
| `text-upload` | Documents | Up to 3 files: PDF, Word, PowerPoint, Excel, CSV, text, Markdown |
| `audio-upload` | A sound file, transcribed before the prompt runs | 1 file: mp3, m4a, wav, ogg, webm and similar |
| `audio-recorder` | A recording made in the browser | 1 recording |
| `image-upload` | Images; choose a model with `vision: true` | Up to 2 files: png, jpg, webp, heic |

The update is a `PATCH` (assistants use `POST`). Put the body in a file:

```json
{
  "description": "Sammanfattar ett protokoll i tre punkter.",
  "input_fields": [{ "type": "text-upload", "description": "Ladda upp protokollet" }],
  "prompt": { "text": "Sammanfatta protokollet ...", "description": "Första versionen" },
  "completion_model": { "id": "<model_id>" }
}
```

```bash
CALL PATCH "/api/v1/apps/<app_id>/" --json-file app-update.json --fields id,name,description,published
CALL GET   "/api/v1/apps/<app_id>/" --select input_fields
```

Fields you leave out are not changed; `input_fields` replaces the input. The
second call shows the exact file types and size limits the input accepts.
`input_fields[].description` is the instruction the user sees above the field.
Write the prompt as in `manage.md`, section 5: it is the whole instruction,
because the user adds nothing but the input.

## 3. Run and read the result

A run is queued and finishes in the background. Start it with text, or with the
ids of files uploaded through `POST /api/v1/files/` (form field `upload_file`):

```bash
CALL POST "/api/v1/files/" --form upload_file=protokoll.pdf --fields id,name
CALL POST "/api/v1/apps/<app_id>/runs/" --json '{"files": [{"id": "<file_id>"}]}' --fields id,status
CALL POST "/api/v1/apps/<app_id>/runs/" --json-file run.json --fields id,status
CALL GET  "/api/v1/app-runs/<run_id>/" --fields status,output
```

`run.json` for a text field is `{"text": "..."}`. Poll every couple of seconds
while the status is `queued` or `in progress`; `complete` has the result in
`output`. A draft can be run, so test before publishing.
Earlier runs: `GET /api/v1/apps/<app_id>/runs/`.

Test with three or four realistic inputs and show the user each result, as in
`manage.md`, section 7. Fix problems in the prompt.

## 4. Hand over and publish

Give the user the name and the link
`ENEO_BASE_URL/spaces/<space_id>/apps/<app_id>/edit`. The app is a draft until
published; ask before publishing:

```bash
CALL POST "/api/v1/apps/<app_id>/publish/" --query published=true --fields id,published
```

`published=false` takes it back. In a personal space the call answers `403`
with code `forbidden_action`: there is no one to publish to. An app other
people should use belongs in a shared space.

Deleting is `DELETE /api/v1/apps/<app_id>/` and needs permission **Admin** on
the key. Ask first.
