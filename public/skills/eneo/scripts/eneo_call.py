#!/usr/bin/env python3
"""Make one call to the Eneo API with the key from .env, and print the JSON.

    python3 eneo_call.py GET  "/api/v1/spaces/" --query include_personal=true
    python3 eneo_call.py POST "/api/v1/spaces/<space_id>/applications/assistants/" --json '{"name": "My assistant"}'
    python3 eneo_call.py POST "/api/v1/assistants/<id>/" --json-file update.json
    python3 eneo_call.py POST "/api/v1/files/" --form upload_file=notes.pdf

Trimming large responses:
    --select completion_models          keep one part of the response (dotted path)
    --fields id,name,vision,reasoning   keep these keys of each item
    --max-chars 6000                    cut the printed output (0 = no limit)

The key is read from ENEO_API_KEY and is never printed. Use --json-file for
bodies with long text, such as a prompt, to avoid shell quoting problems.
"""

import argparse
import json
import sys
from pathlib import Path

from eneo_env import EneoError, call, use_utf8_output


def pairs(items, flag):
    result = {}
    for item in items or []:
        if "=" not in item:
            sys.exit(f"{flag} expects name=value, got '{item}'.")
        name, _, value = item.partition("=")
        result[name] = value
    return result


def select(data, path):
    for part in path.split("."):
        if isinstance(data, dict) and part in data:
            data = data[part]
        else:
            sys.exit(f"--select: no '{part}' in the response.")
    return data


def keep_fields(data, fields):
    if isinstance(data, dict) and isinstance(data.get("items"), list):
        data = data["items"]
    if isinstance(data, list):
        return [{f: item.get(f) for f in fields} for item in data if isinstance(item, dict)]
    if isinstance(data, dict):
        return {f: data.get(f) for f in fields}
    return data


def main():
    use_utf8_output()
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("method")
    parser.add_argument("path", help='Path starting with /api/v1/, in quotes')
    parser.add_argument("--json", dest="json_text", help="Request body as JSON text")
    parser.add_argument("--json-file", help="Read the request body from a JSON file")
    parser.add_argument("--form", action="append", help="Multipart file part: field=path")
    parser.add_argument("--query", action="append", help="Query parameter: name=value")
    parser.add_argument("--select")
    parser.add_argument("--fields")
    parser.add_argument("--max-chars", type=int, default=6000)
    args = parser.parse_args()

    body = None
    try:
        if args.json_file:
            body = json.loads(Path(args.json_file).read_text(encoding="utf-8"))
        elif args.json_text:
            body = json.loads(args.json_text)
    except ValueError as error:
        sys.exit(
            f"The request body is not valid JSON: {error}\n"
            "In PowerShell the quotes inside --json are lost on the way here. "
            "Put the body in a file and use --json-file."
        )

    try:
        data = call(
            args.method,
            args.path,
            json_body=body,
            files=pairs(args.form, "--form") or None,
            query=pairs(args.query, "--query") or None,
        )
    except EneoError as error:
        print(error.explain())
        sys.exit(1)

    if data is None:
        print("OK (empty response)")
        return
    if args.select:
        data = select(data, args.select)
    if args.fields:
        data = keep_fields(data, [f.strip() for f in args.fields.split(",")])
    text = json.dumps(data, ensure_ascii=False, indent=2)
    if args.max_chars and len(text) > args.max_chars:
        text = text[: args.max_chars] + (
            f"\n... cut at {args.max_chars} of {len(text)} characters. "
            "Narrow with --select/--fields or raise --max-chars."
        )
    print(text)


if __name__ == "__main__":
    main()
