# Getting a working API key

Give the user the whole walkthrough in one numbered message, with the choices
already made for their task, and then wait until they say the key is in place.
They do the clicking; you explain in a few words what each choice means. The
interface labels below are the Swedish ones.

If **Mina API-nycklar** is missing from the user's menu, their role does not
allow API keys. That is for their Eneo administrator to change; say so instead
of looking for a way around it.

## 1. Log in

Open `ENEO_BASE_URL` in a browser, for example
`https://eneo-modules.sundsvall.dev`, and log in.

At the Eneo user meeting, a test account is created at
`https://eneo-anvandartraff.sundsvall.dev/#testkonto` with the code the
instructor shows.

## 2. Open "Mina API-nycklar"

Open the profile menu and choose **Mina API-nycklar**, or go straight to
`ENEO_BASE_URL/account/api-keys`. Click **Skapa API-nyckel**. The dialog has
three steps.

### Step 1: "Grundläggande info"

- **Namn**: something that says what the key is for, such as
  "Upphandlingsassistent, test".
- **Nyckeltyp**:
  - **Hemlig nyckel** (starts with `sk_`): for servers, scripts and for you as
    a coding agent. Choose this.
  - **Publik nyckel** (starts with `pk_`): for code that runs in a browser. It
    is limited to read access and only works from the web addresses it lists,
    so it is rarely what the user needs.

### Step 2: "Omfång & behörigheter"

- **Nyckelägande** is shown to administrators only:
  - **Användarnyckel**: tied to the user's own account. The right choice for
    creating things.
  - **Tjänstenyckel**: independent of any person, for long-lived integrations.
    Administrators only, and it cannot create new assistants, spaces,
    collections or files.
- **Omfång** decides where the key works:
  - **Organisation**: all resources. A user key with this scope works only
    while its owner is an administrator.
  - **Yta**: one space and everything in it.
  - **Assistent**: one assistant and its conversations.
  - **App**: one app and its runs.
- **Behörighetsnivå** decides what the key may do there:
  - **Läs**: look at things.
  - **Skriv**: create and change, which includes asking an assistant.
  - **Admin**: also delete.

The dialog starts on Organisation and Läs. Both usually need to be changed.

Recommend the narrowest choice that covers the task:

| The user wants to | Omfång | Behörighetsnivå |
| --- | --- | --- |
| Have you create and configure assistants | **Yta**: the space to work in. Their personal space ("Personlig yta") is fine for trying things out; a shared space when colleagues should use the result. | **Skriv** |
| The same, and let you remove what you create | **Yta** | **Admin** |
| Call one finished assistant from a program | **Assistent** | **Skriv** |
| Work across the whole organisation (administrators) | **Organisation** | as needed |

A key scoped to a space cannot create new spaces. If the user wants a new
shared space and is not an administrator, they create it in the interface first
(**Skapa yta**) and then make the key for that space.

### Step 3: "Säkerhet"

Set an **Utgångsdatum**. For a workshop or an experiment, 7 days is enough. A
key that never expires is a standing risk if it leaks.

## 3. Save the key

After **Skapa** the key is shown once, with the warning that it cannot be shown
again. The user copies it (**Kopiera till urklipp**).

Have the `.env` file ready before they click, then ask them to paste the key
into it themselves:

```bash
cp <this-skill-folder>/assets/env.example .env
```

```
ENEO_BASE_URL=https://eneo-modules.sundsvall.dev
ENEO_API_KEY=sk_...
```

Files whose names start with a dot are hidden in Finder and in the Windows file
explorer, so do not leave the user to find `.env` on their own. Open it for
them in a text editor (`open -e .env` on macOS, `notepad .env` on Windows), or
point to it in the editor they already have open. Say in your message which
window has opened and what to do there: paste the key directly after
`ENEO_API_KEY=` and save. A window that opens without a word is easy to miss,
and the key then ends up in the chat.

Check that `.env` is in `.gitignore` (create the file if the project has none).
If the user pastes the key into the chat anyway, write it to `.env`, do not
repeat it, and suggest they replace it with a new key afterwards if the
conversation is shared or logged.

## 4. Verify

```bash
python3 <this-skill-folder>/scripts/check_connection.py
```

Without `ENEO_ASSISTANT_ID` it lists the spaces the key can see, which confirms
the key and the address. The ids it prints are the ones to use as `<space_id>`.

It also prints the key's scope, permission and expiry date. Compare them with
what you recommended. If the key is wider than the task needs, for example
Organisation where Yta was enough, say so and let the user decide whether to
keep it or create a narrower one.

## If the key stops working

- A lost key cannot be recovered. Create a new one and revoke the old.
- Keys can be rotated, paused and revoked on the same page.
- A user key stops working when its owner loses access to the space, or, for
  Organisation scope, is no longer an administrator.
