# How Eneo works

Use this to explain Eneo to the user and to decide where something belongs.
Swedish interface names are in parentheses.

## The building blocks

**Space (yta).** Everything lives in a space. A space decides who has access,
which models may be used and which knowledge is available.

- **Personal space (Personlig yta)**: private to one user. Good for trying
  things out.
- **Shared space** (listed under "Delat", created with "Skapa yta"): a team's
  workplace with members and roles.
- **Organisation space (Organisationsyta)**: resources offered to everyone.

Inside a space the menu has **Assistenter**, **Appar**, **Kunskap**,
**Medlemmar** and **Inställningar**.

**Assistant (assistent).** What people chat with. An assistant is:

- a **prompt**: the standing instruction that tells the model its role, what to
  do and how to answer;
- a **model** and its settings;
- optionally **knowledge**: document collections or websites it searches before
  answering;
- optionally **capabilities** such as file analysis, web search, charts and
  file creation, and tools from connected MCP servers.

An assistant starts as a draft only its creator and the space's editors see.
**Publishing** (Publicera) makes it available to the other members of the space.

**Knowledge (kunskap).** Documents the organisation supplies so the assistant
answers from them instead of from the model's general training:

- **Collections (samlingar)**: uploaded files. Eneo extracts the text, splits it
  and indexes it with an embedding model.
- **Websites (webbplatser)**: pages Eneo crawls and keeps updated.
- **Integrations**: sources such as SharePoint or Confluence, when the
  organisation has connected them.

When a user asks something, Eneo retrieves the most relevant passages and gives
them to the model together with the question. The answer lists its sources in
`references`.

**Model (modell).** Administrators decide which language models the
organisation may use, and each space has its own selection. Models differ in
how much text they can take in, whether they read images, whether they reason
step by step, where they are hosted and what they cost. Spaces can have a
security classification that limits which models are allowed.

**App.** A single-purpose tool: fixed input, such as a file or a recording,
and one result. Use an assistant for dialogue and an app for "put this in, get
that out".

**Flow (flöde).** Several steps in sequence, for example transcribe, then
summarise, then fill in a document template. A preview feature, not present in
every installation.

**Widget.** An assistant embedded as a chat window on another website, for
visitors who do not log in to Eneo.

## Who may do what

- A user's **role in a space** decides whether they may only use assistants,
  also edit them, or also administer the space.
- **Organisation roles** decide the larger things: administering users, models
  and security settings.
- An **API key** never gives more than its owner has. Its scope and permission
  level narrow that further. See `getting-started.md`.

## How this maps to the API

The web interface is a client of the same API you use. Each building block has
its own group of operations:

| Building block | API paths start with |
| --- | --- |
| Spaces | `/api/v1/spaces/` |
| Assistants and their conversations | `/api/v1/assistants/` |
| Collections and their documents | `/api/v1/groups/`, `/api/v1/info-blobs/` |
| Files attached to a question | `/api/v1/files/` |
| Apps | `/api/v1/apps/` |
| Flows | `/api/v1/flows/` |
| Widgets | `/api/v1/widgets/` |

Collections are called `groups` in the API for historical reasons.

## Choosing the right construction

| The need | Build |
| --- | --- |
| Answer questions in a subject area, in dialogue | An assistant with a prompt |
| Answer from the organisation's own documents | An assistant with a collection as knowledge |
| Review a document the user brings each time | An assistant with file analysis; the user attaches the file to the question |
| Same input and output every time | An app |
| Several steps, possibly with human review between them | A flow |
| Reach visitors on a public website | A widget |
| Put AI inside another system | That system calls an assistant through the API |
