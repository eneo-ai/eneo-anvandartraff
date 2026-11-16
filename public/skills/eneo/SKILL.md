---
name: eneo
description: Work with Eneo, the open-source AI platform for the public sector - explain how it works, guide the user through it, and act in it through its REST API. Use this whenever the user mentions Eneo or wants to create, configure or test an Eneo assistant or space, choose a model, write a system prompt, add knowledge, get or use an Eneo API key, call an assistant from their own code, run a flow, or build a simple chat page or widget on top of Eneo. Also use it for Swedish requests such as "skapa en assistent i Eneo", "välj en lämplig modell", "skriv en systemprompt", "hur fungerar ytor i Eneo", "skaffa en API-nyckel" or "bygg en chatt mot Eneo", and for addresses such as eneo-modules.sundsvall.dev.
---

# Eneo

Eneo is an AI platform where an organisation builds assistants: a prompt, a
model and optionally its own documents as knowledge. People use the assistants
in Eneo's web interface, and everything the interface does is also available
through a REST API. With an API key you can therefore do the work for the user:
create an assistant, choose its model, write its prompt, test it, and build
something around it.

The user is often not a programmer. Answer in the language they write in
(usually Swedish), use the Swedish names of things in the interface when you
tell them where to click, explain what you are doing in plain words, and show
results early instead of planning a large solution.

## Start here: is there a working key?

Everything you do in Eneo needs an API key. Check before anything else:

```bash
python3 <this-skill-folder>/scripts/check_connection.py
```

`<this-skill-folder>` is the folder this file is in, for example
`.claude/skills/eneo`. Run the scripts from the user's project folder: they
read `.env` from the current folder. They need Python 3.9 or later.

The commands are written for bash and zsh, which is what a coding agent
normally runs them in, on Windows too (Git Bash). Two things differ on Windows:

- `python3` is often missing there, or opens Microsoft Store. If so, use
  `python` or `py -3` instead in every command.
- In PowerShell, give request bodies with `--json-file`, not `--json`:
  PowerShell drops the quotes inside a JSON argument.

- **It prints OK**: continue with the task.
- **No key yet, or the key is refused**: read `references/getting-started.md`
  and guide the user through creating one. Which scope and permission to choose
  depends on what they asked for, so pick them from the task. Put any questions
  you need answered about the task in the same message, after the key steps, so
  the user can answer while the key is being created.

Handle the key carefully. It gives the same access as the user's account within
its scope. Create `.env` from `assets/env.example`, make sure `.env` is listed
in `.gitignore`, and ask the user to paste the key into that file themselves
rather than into the chat. Do not print it, commit it or copy it into source
files.

## Then: what does the user want?

| The user wants to | Read |
| --- | --- |
| Understand Eneo: spaces, assistants, knowledge, models, roles | `references/concepts.md` |
| Create, configure or test an assistant or space ("skapa en assistent som ...") | `references/manage.md` |
| Call an assistant from their own program or script | `references/api.md` |
| A simple chat page, or an assistant embedded on a website | `references/chat-ui.md` |
| Run a published flow, for example audio to meeting notes | `references/flows.md` |

Read only what the task needs. Many requests combine two of these: "create a
procurement assistant and test it" is `manage.md`; adding "and give me a page
where my colleagues can try it" continues in `chat-ui.md`.

## Making calls

Use the bundled caller instead of hand-written curl. It adds the key from
`.env`, prints readable errors and keeps the key out of the terminal history:

```bash
python3 <this-skill-folder>/scripts/eneo_call.py GET "/api/v1/spaces/" --query include_personal=true
python3 <this-skill-folder>/scripts/eneo_call.py POST "/api/v1/assistants/<id>/sessions/" --json '{"question": "Hej!"}'
```

Responses can be large. Trim them with `--select` and `--fields`, shown in
`references/manage.md`. With `"stream": true` in the body, the caller waits for
the whole stream and prints the assembled answer; to show the text as it
arrives, use the example in `references/api.md`.

## Do not guess the API

Eneo has several hundred operations, and installations run different versions.
A path or field name from memory is often wrong. Before writing a call that the
reference files do not show, look it up in the installation's own specification:

```bash
python3 <this-skill-folder>/scripts/eneo_spec.py search groups
python3 <this-skill-folder>/scripts/eneo_spec.py show POST "/api/v1/spaces/{id}/applications/assistants/"
```

The API has its own names for some things: a collection is a `group`, and a
document in a collection is an `info-blob`. Search for the API's word.

The full document at `$ENEO_BASE_URL/openapi.json` is about 2 MB. Do not read
it whole; the script downloads it once and prints only what you ask for.
`references/openapi-core.json` holds the exact schemas for asking an assistant
and uploading files.

## Working carefully in someone's Eneo

You are acting in a system other people use.

- Say what you are about to create or change, then do it. Report the name and a
  link the user can open, for example
  `$ENEO_BASE_URL/spaces/<space_id>/assistants/<assistant_id>/edit`.
- Ask before deleting anything, before publishing an assistant to other people,
  and before changing something you did not create in this conversation.
- Do not invent the organisation's content. If an assistant should follow "our
  guidelines", ask for the guidelines; a prompt built on guessed rules gives
  confident wrong answers.
- Assistants answer from a language model and can be wrong. When the task has
  consequences for a person or a decision, say so in the assistant's prompt and
  to the user: the assistant supports the case officer, it does not decide.

## When a call fails

`eneo_call.py` prints the status, Eneo's message and a hint. The usual causes:

| Status | Usual cause |
| --- | --- |
| `401` | The key is mistyped, revoked or expired, or belongs to another installation. |
| `403` | The key may not do this: the scope does not cover the resource, the permission is too low (`write` to create or change, `admin` to delete), or the key type cannot do it. `code` in the response says which. |
| `404` | Wrong id. For assistants Eneo looks the assistant up before it checks the key. |
| `409` | Something still uses the resource. A file attached to a conversation cannot be deleted until the conversation is gone; `details` says what is in the way. |
| `422` | The body does not match the schema; `details` lists the fields. Check with `eneo_spec.py show`. |
| `429` | Rate limit. Wait, do not retry in a tight loop. |

Give the user the `request_id` from the error when they need help from the
Eneo administrators; it identifies the request in the server logs.
