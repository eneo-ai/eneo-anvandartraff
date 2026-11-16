#!/usr/bin/env python3
"""Check that the Eneo settings in .env work, and explain what is wrong if not.

Run from the project folder that holds .env:

    python3 check_connection.py ["optional question"]

With ENEO_ASSISTANT_ID set it asks that assistant one question. Without it, it
lists the spaces the key can see, which is enough to confirm the key works.
It also prints the key's scope, permission and expiry date when Eneo lets the
key read them. Never prints the key.
"""

import sys
import uuid

from eneo_env import EneoError, base_url, call, load_dotenv, use_utf8_output


def fail(message):
    print(f"FAILED: {message}")
    sys.exit(1)


def space_kind(space):
    if space.get("personal"):
        return "personal"
    return "organization" if space.get("organization") else "shared"


SCOPES = {"tenant": "Organisation", "space": "Yta", "assistant": "Assistent", "app": "App"}


def describe_key(values):
    """Print what the key may do, so a key wider than intended is noticed.

    Looks the key up in the owner's key list by its last characters. Says
    nothing when the key may not read that list or is not found in it.
    """
    key = values["ENEO_API_KEY"].strip()
    try:
        listing = call("GET", "/api/v1/api-keys", values=values)
        match = next(
            item
            for item in listing["items"]
            if item.get("state") == "active" and item.get("key_suffix") and key.endswith(item["key_suffix"])
        )
    except (EneoError, SystemExit, StopIteration, KeyError, TypeError, AttributeError):
        return
    scope = match.get("scope_type")
    expires = (match.get("expires_at") or "")[:10] or "never"
    print(
        f"Key: scope {SCOPES.get(scope, scope)}, permission {match.get('permission')}, "
        f"expires {expires}"
    )
    if scope == "tenant":
        print(
            "  This key covers the whole organisation. To create and test "
            "assistants, a key scoped to one space (Yta) is enough."
        )


def main():
    use_utf8_output()
    values = load_dotenv()
    if not (values.get("ENEO_API_KEY") or "").strip():
        fail(
            "ENEO_API_KEY is not set. Add it to .env in this folder. "
            "references/getting-started.md explains how to create a key."
        )
    assistant_id = (values.get("ENEO_ASSISTANT_ID") or "").strip()
    print(f"Eneo: {base_url(values)}")
    describe_key(values)

    try:
        if not assistant_id:
            spaces = call("GET", "/api/v1/spaces/", values=values, query={"include_personal": "true"})
            print("OK - the key works. Spaces it can see:")
            for space in spaces.get("items", []):
                name = space.get("name") or "(personal space)"
                print(f"  {space['id']}  {name}  [{space_kind(space)}]")
            print("No ENEO_ASSISTANT_ID is set, so no assistant was asked.")
            return
        try:
            uuid.UUID(assistant_id)
        except ValueError:
            fail(
                "ENEO_ASSISTANT_ID is not a UUID. It should look like "
                "123e4567-e89b-12d3-a456-426614174000."
            )
        question = sys.argv[1] if len(sys.argv) > 1 else "Hej! Svara med en mening."
        reply = call(
            "POST",
            f"/api/v1/assistants/{assistant_id}/sessions/",
            values=values,
            json_body={"question": question},
        )
    except EneoError as error:
        print(error.explain())
        sys.exit(1)

    print("OK - the assistant answered.")
    print(f"  session_id: {reply.get('session_id')}")
    print(f"  answer: {reply.get('answer')}")


if __name__ == "__main__":
    main()
