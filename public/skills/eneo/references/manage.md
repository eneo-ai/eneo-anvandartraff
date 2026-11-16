# Creating, configuring and testing an assistant

The recipe for requests like: "Skapa en upphandlingsassistent i Eneo som hjälper
handläggare att granska förfrågningsunderlag mot våra riktlinjer. Välj en
lämplig modell, skriv en systemprompt och testa assistenten."

`CALL` below stands for `python3 <this-skill-folder>/scripts/eneo_call.py`.
The key needs scope **Yta** (or wider) and permission **Skriv**.

Contents: [Clarify](#1-clarify-before-building) · [Space](#2-find-the-space) ·
[Model](#3-choose-a-model) · [Create](#4-create-the-assistant) ·
[Prompt](#5-write-the-prompt) · [Knowledge](#6-add-knowledge-when-needed) ·
[Test](#7-test-and-improve) · [Hand over](#8-hand-over) ·
[Other changes](#other-changes)

## 1. Clarify before building

Ask only what you cannot reasonably decide yourself, in one message:

- **Who uses it and for what decision?** This sets the tone and the output.
- **What should it rely on?** "Our guidelines" must come from the user as text
  or files. Do not write rules on the organisation's behalf.
- **What does a good answer look like?** A list of deviations, a summary, a
  draft?
- **Which space?** If the key is scoped to one space, that is the answer.

If the user wants to see something quickly, build a first version from what
they said, state your assumptions, and improve it after the first test.

## 2. Find the space

```bash
CALL GET "/api/v1/spaces/" --query include_personal=true --fields id,name,personal,organization
```

Creating a new shared space is `POST /api/v1/spaces/` with `{"name": "..."}`.
It needs a key with Organisation scope; with a space-scoped key, ask the user to
create the space in the interface (**Skapa yta**) and make a key for it.

## 3. Choose a model

A space offers the models its administrators have allowed. List them:

```bash
CALL GET "/api/v1/spaces/<space_id>/" --select completion_models \
  --fields id,name,nickname,description,vision,reasoning,max_input_tokens,hosting,is_org_default,is_deprecated,is_locked,can_access
```

Leave out models that are deprecated, locked or not accessible. Then choose by
what the task needs, and tell the user which model you chose and why in one or
two sentences:

| The task | Look for |
| --- | --- |
| Long documents, such as tender documents or reports | A large `max_input_tokens` |
| Careful comparison against rules, weighing, multi-step analysis | `reasoning: true` |
| Scanned pages, images, drawings | `vision: true` |
| Personal or otherwise sensitive data | `hosting` and the space's security classification; ask the user if unsure |
| Short, frequent questions | A smaller, faster model |

When nothing points elsewhere, the organisation's default (`is_org_default`) is
a sound choice. Model names say little about suitability; base the choice on
the fields, not on what you remember about a model family.

## 4. Create the assistant

```bash
CALL POST "/api/v1/spaces/<space_id>/applications/assistants/" --json '{"name": "Upphandlingsassistent"}'
```

Keep the `id` from the response. Add `"enabled_capabilities": ["file_analysis"]`
when users will attach documents to their questions.

## 5. Write the prompt

The prompt is the assistant's standing instruction. Write it in the language
the assistant should answer in. A prompt that works usually states:

1. **Role and reader**: who the assistant is and whom it helps.
2. **Task**: what it does with what it is given.
3. **Basis**: what it relies on (the supplied guidelines, attached knowledge)
   and that it says so when the basis does not cover the question.
4. **Method**: how to go through the material, when that matters.
5. **Answer format**: headings, order, length.
6. **Limits**: what it does not do, and that a person makes the decision.

Explain the reason for a rule instead of only stating it; the model applies a
rule better when it knows what the rule is for. Keep it as short as the task
allows. Example for the request above:

```text
Du är ett stöd för handläggare som granskar förfrågningsunderlag i upphandlingar
hos [organisationen].

Din uppgift är att jämföra det underlag handläggaren bifogar med organisationens
riktlinjer för upphandling, som finns i din kunskapsbas.

Arbeta så här:
1. Läs hela underlaget innan du bedömer något.
2. Gå igenom riktlinjerna punkt för punkt och avgör om underlaget följer dem.
3. Bedöm bara det som underlaget och riktlinjerna faktiskt säger. Om en
   riktlinje inte går att bedöma utifrån underlaget, skriv det.

Svara med:
- Sammanfattning: två till tre meningar om helhetsintrycket.
- Avvikelser: en punkt per avvikelse med vad underlaget säger, vilken riktlinje
  det gäller och ett förslag på ändring.
- Oklarheter: sådant handläggaren behöver kontrollera själv.

Hänvisa alltid till avsnitt eller sida i underlaget och till rätt riktlinje, så
att handläggaren kan kontrollera din bedömning. Du ger underlag för
handläggarens beslut; du fattar inte beslutet. Ge inte juridisk rådgivning, och
säg till när en fråga bör gå till upphandlingsjurist.
```

Make the prompt match how the material actually reaches the assistant. The
example says the guidelines are in the knowledge base; if they are pasted into
the prompt or not supplied yet, say that instead, or the assistant will refer
to a source it does not have.

Save the prompt and the model in one update. Put the body in a file, because
long text in a shell argument breaks on quotes and line breaks:

```json
{
  "prompt": { "text": "Du är ett stöd för ...", "description": "Första versionen" },
  "completion_model": { "id": "<model_id>" },
  "description": "Granskar förfrågningsunderlag mot riktlinjerna för upphandling."
}
```

```bash
CALL POST "/api/v1/assistants/<assistant_id>/" --json-file assistant-update.json --fields id,name,completion_model,prompt
```

Fields you leave out are not changed. `prompt.description` is a note about the
change, useful when the prompt is revised.

## 6. Add knowledge when needed

How the organisation's material reaches the assistant:

| Material | Approach |
| --- | --- |
| A page or two of rules | Put the text in the prompt. Simplest and most reliable. |
| Longer or several documents that stay the same | A collection attached to the assistant. |
| A different document each time, such as the tender to review | The user attaches it to the question. |

To create a collection, upload to it and attach it:

```bash
CALL GET  "/api/v1/spaces/<space_id>/" --select embedding_models --fields id,name,can_access,is_deprecated
CALL POST "/api/v1/spaces/<space_id>/knowledge/groups/" --json '{"name": "Riktlinjer för upphandling", "embedding_model": {"id": "<embedding_model_id>"}}'
CALL POST "/api/v1/groups/<collection_id>/info-blobs/upload/" --form file=riktlinjer.pdf
CALL GET  "/api/v1/jobs/<job_id>/" --fields status,failure_code
CALL POST "/api/v1/assistants/<assistant_id>/" --json '{"groups": [{"id": "<collection_id>"}]}'
```

The upload returns a job. Wait until its `status` is `complete` before testing;
`failed` comes with a `failure_code` such as `no_extractable_text` for a scanned
PDF without a text layer. `groups` replaces the assistant's list of collections,
so include the ones it should keep.

## 7. Test and improve

Ask the assistant realistic questions and read the answers critically:

```bash
CALL POST "/api/v1/assistants/<assistant_id>/sessions/" --json-file question.json --fields answer,session_id,references
```

Use three or four cases that differ: a typical one, a hard one, and one the
assistant should decline or pass on. To test with a document, upload it with
`POST /api/v1/files/` (form field `upload_file`) and send its id in `files`;
see `api.md`.

Show the user each question with the answer, and say plainly what worked and
what did not. Fix problems in the prompt or the knowledge, not by rephrasing
the test question until it passes. Typical fixes:

| Observed | Change |
| --- | --- |
| Invents rules or details | State the basis more firmly and require references to it |
| Answers too long or unstructured | Specify the answer format |
| Misses parts of long documents | A model with a larger input, or ask for a pass per section |
| `references` is empty although knowledge is attached | Check that the upload job completed and the collection is attached |

Two or three rounds are usually enough. Stop when the user is satisfied; a
prompt is never finished in the abstract.

## 8. Hand over

Tell the user what now exists and where:

- The assistant's name and a link:
  `ENEO_BASE_URL/spaces/<space_id>/assistants/<assistant_id>/edit`
- Which model and why, what the prompt covers, what was tested and what was not.
- That it is a draft until published. Publish only when they ask:

  ```bash
  CALL POST "/api/v1/assistants/<assistant_id>/publish/" --query published=true
  ```

Offer the natural next step: more test cases, knowledge, or a way for others to
reach it (`chat-ui.md`).

## Other changes

- **Rename or re-describe**: `POST /api/v1/assistants/<id>/` with `name` or
  `description`.
- **Model settings** such as `temperature`: `completion_model_kwargs` in the same
  update. Not every model accepts every setting; the model's
  `supported_model_kwargs` says which.
- **Delete**: `DELETE /api/v1/assistants/<id>/` needs permission **Admin** on the
  key. Ask first.
- **Anything else**: find the operation with `eneo_spec.py search`.
