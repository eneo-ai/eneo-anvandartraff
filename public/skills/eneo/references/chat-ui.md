# A chat page or an embedded assistant

Start with the least that solves the need. Most requests for "a chat" are
covered by something that already exists.

| The need | Solution |
| --- | --- |
| Colleagues should be able to use the assistant | Publish it in a shared space. They chat with it in Eneo. No code. |
| A chat window on a website for visitors | Eneo's own widget, if the installation has it. No code beyond pasting a snippet. |
| A page of your own, with your own look or extra fields | The small example below. |
| A larger application | Start from the example and grow it; see `api.md` for the design decisions. |

## Eneo's own widget

Open the assistant in Eneo and go to its widget page:
`ENEO_BASE_URL/spaces/<space_id>/assistants/<assistant_id>/widget`. If the page
exists, the user configures the widget there and gets a snippet to paste into
their website. Visitors do not log in, so an administrator may have to allow
widgets first, and the assistant should only hold information that is meant to
be public.

Not every installation or version has widgets. If the page is missing, say so
and use the example below instead.

## A small chat page of your own

`assets/chat-example/chat_server.py` is a complete chat in one file with no
packages to install: a page with a message list and an input field, and a
server that forwards questions to the assistant so the key stays out of the
browser.

```bash
cp <this-skill-folder>/assets/chat-example/chat_server.py .
python3 chat_server.py
```

It reads `ENEO_BASE_URL`, `ENEO_API_KEY` and `ENEO_ASSISTANT_ID` from `.env` and
serves `http://127.0.0.1:8000`. Make sure `ENEO_ASSISTANT_ID` holds the
assistant's id before you start it, then open the address in a browser. Stop
the server with Ctrl+C.

Adapt it instead of rewriting it:

- **Text and look**: the HTML and CSS are at the top of the file.
- **Extra input**, such as a choice of document type: add the field to the form
  and include its value in the question the server sends.
- **Another stack**: if the user already has a web project in Node, .NET or
  something else, keep the same two parts, a server route that holds the key and
  a page that calls the route, and write them in that stack.

Keep what makes the example safe and usable when you change it:

- The key is only read on the server.
- The answer is shown as text, never inserted as HTML.
- The page says when it is waiting and when something failed.
- The input has a label, and new messages are announced to screen readers.
- The server listens on `127.0.0.1`, reachable from this computer only.

Putting the page where other people can reach it is a separate step that
involves the organisation's own hosting, login and information security. Say
that plainly instead of exposing the page from the user's computer.

Resist adding more before the user has tried it: login, saved history,
streaming and file upload are each worth doing when asked for, and each makes
the first version later.
