#!/usr/bin/env python3
"""Look things up in an Eneo installation's OpenAPI document without reading it whole.

    python3 eneo_spec.py search <text>          operations whose path, summary or id match
                                                (their descriptions, when nothing else does)
    python3 eneo_spec.py show <METHOD> <path>   one operation with its schemas expanded
    python3 eneo_spec.py schema <Name>          one schema by name

Options: --base-url URL (default: ENEO_BASE_URL or .env), --file PATH (use a
local copy), --refresh (download again), --depth N (schema nesting, default 2).

The document is downloaded once and cached in the system temp folder.
"""

import argparse
import hashlib
import json
import socket
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

from eneo_env import api_path, base_url, load_dotenv, use_utf8_output

METHODS = ("get", "post", "put", "patch", "delete")
MAX_RESULTS = 40


def load_spec(args):
    if args.file:
        return json.loads(Path(args.file).read_text(encoding="utf-8"))
    base = (args.base_url or base_url(load_dotenv())).rstrip("/")
    digest = hashlib.sha256(base.encode()).hexdigest()[:12]
    cache = Path(tempfile.gettempdir()) / f"eneo-openapi-{digest}.json"
    if cache.is_file() and not args.refresh:
        return json.loads(cache.read_text(encoding="utf-8"))
    try:
        with urllib.request.urlopen(f"{base}/openapi.json", timeout=60) as response:
            raw = response.read()
    except (urllib.error.URLError, TimeoutError, socket.timeout) as error:
        sys.exit(
            f"Could not download {base}/openapi.json ({error}). Check the "
            "address, or save the document yourself and pass --file."
        )
    cache.write_bytes(raw)
    return json.loads(raw)


def type_of(schema):
    """One-line type summary for a schema node."""
    if "$ref" in schema:
        return schema["$ref"].rsplit("/", 1)[1]
    for keyword in ("anyOf", "oneOf", "allOf"):
        if keyword in schema:
            return " | ".join(type_of(part) for part in schema[keyword])
    if "enum" in schema:
        return "enum " + json.dumps(schema["enum"], ensure_ascii=False)
    kind = schema.get("type", "any")
    if kind == "array":
        return f"array of {type_of(schema.get('items', {}))}"
    if schema.get("format"):
        return f"{kind} ({schema['format']})"
    return kind


def ref_names(schema):
    names = []
    if "$ref" in schema:
        names.append(schema["$ref"].rsplit("/", 1)[1])
    for keyword in ("anyOf", "oneOf", "allOf"):
        for part in schema.get(keyword, []):
            names.extend(ref_names(part))
    if "items" in schema:
        names.extend(ref_names(schema["items"]))
    return names


def print_schema(spec, name, depth, indent="", seen=None):
    seen = set() if seen is None else seen
    schema = spec["components"]["schemas"].get(name)
    if schema is None:
        print(f"{indent}{name}: not found")
        return
    if "enum" in schema:
        print(f"{indent}{name}: enum {json.dumps(schema['enum'], ensure_ascii=False)}")
        return
    print(f"{indent}{name}:")
    required = set(schema.get("required", []))
    nested = []
    for field, node in schema.get("properties", {}).items():
        marker = " (required)" if field in required else ""
        default = f", default {json.dumps(node['default'])}" if "default" in node else ""
        note = " ".join((node.get("description") or "").split())
        note = f" - {note[:200]}" if note else ""
        print(f"{indent}  {field}: {type_of(node)}{marker}{default}{note}")
        nested.extend(ref_names(node))
    if not schema.get("properties"):
        print(f"{indent}  {type_of(schema)}")
        nested.extend(ref_names(schema))
    if depth <= 0:
        return
    for child in dict.fromkeys(nested):
        if child not in seen:
            seen.add(child)
            print_schema(spec, child, depth - 1, indent + "  ", seen)


def find(spec, needle):
    """Operations that match in path, summary or id, and those that only mention it."""
    named, described = [], []
    for path, operations in spec["paths"].items():
        for method in METHODS:
            operation = operations.get(method)
            if not operation:
                continue
            line = f"{method.upper():6} {path}  - {operation.get('summary', '')}"
            haystack = " ".join(
                [path, operation.get("summary", ""), operation.get("operationId", "")]
            ).lower()
            if needle in haystack:
                named.append(line)
            elif needle in (operation.get("description") or "").lower():
                described.append(line)
    return named, described


def search(spec, text):
    needle = text.lower()
    hits, described = find(spec, needle)
    if not hits and not described and len(needle) > 3 and needle.endswith("s"):
        hits, described = find(spec, needle[:-1])  # "collections" -> "collection"
    if not hits and described:
        print(f"No path or summary matches '{text}'. These mention it in their description:")
        hits = described
    for line in hits[:MAX_RESULTS]:
        print(line)
    if len(hits) > MAX_RESULTS:
        print(f"... {len(hits) - MAX_RESULTS} more; narrow the search.")
    if not hits:
        print(
            f"No operation matches '{text}'. The API has its own names for some "
            "things: a collection is a 'group', a document in a collection an "
            "'info-blob'. Try one of those, or a shorter word."
        )


def show(spec, method, path, depth):
    path = api_path(path)
    operations = spec["paths"].get(path) or spec["paths"].get(path.rstrip("/") + "/")
    operation = (operations or {}).get(method.lower())
    if not operation:
        sys.exit(f"No operation {method.upper()} {path}. Use 'search' to find the exact path.")
    print(f"{method.upper()} {path}")
    description = operation.get("description") or operation.get("summary") or ""
    if description:
        print(description.strip())
    for parameter in operation.get("parameters", []):
        marker = " (required)" if parameter.get("required") else ""
        note = " ".join((parameter.get("description") or "").split())[:200]
        print(
            f"  parameter {parameter['name']} in {parameter['in']}: "
            f"{type_of(parameter.get('schema', {}))}{marker} {note}".rstrip()
        )
    for content_type, media in (operation.get("requestBody", {}).get("content") or {}).items():
        print(f"\nRequest body ({content_type}): {type_of(media.get('schema', {}))}")
        for name in ref_names(media.get("schema", {})):
            print_schema(spec, name, depth, "  ")
    print("\nResponses:")
    for status, response in operation.get("responses", {}).items():
        schema = (response.get("content") or {}).get("application/json", {}).get("schema", {})
        note = " ".join((response.get("description") or "").split())[:200]
        print(f"  {status}: {type_of(schema) if schema else '-'}  {note}".rstrip())
        if status.startswith("2"):
            for name in ref_names(schema):
                print_schema(spec, name, depth, "    ")


def main():
    use_utf8_output()
    # Options are accepted before or after the command. SUPPRESS keeps a
    # subparser from resetting a value given before the command.
    options = argparse.ArgumentParser(add_help=False, argument_default=argparse.SUPPRESS)
    options.add_argument("--base-url")
    options.add_argument("--file")
    options.add_argument("--refresh", action="store_true")
    options.add_argument("--depth", type=int)
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
        parents=[options],
    )
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("search", parents=[options]).add_argument("text")
    show_parser = commands.add_parser("show", parents=[options])
    show_parser.add_argument("method")
    show_parser.add_argument("path")
    commands.add_parser("schema", parents=[options]).add_argument("name")
    args = parser.parse_args(namespace=argparse.Namespace(base_url=None, file=None, refresh=False, depth=2))

    spec = load_spec(args)
    if args.command == "search":
        search(spec, args.text)
    elif args.command == "show":
        show(spec, args.method, args.path, args.depth)
    else:
        print_schema(spec, args.name, args.depth)


if __name__ == "__main__":
    main()
