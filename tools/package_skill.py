#!/usr/bin/env python3
"""Build public/skills/eneo.zip from public/skills/eneo/.

Run after every change to the skill folder:

    python3 tools/package_skill.py

The archive is reproducible: sorted entries and fixed timestamps, so an
unchanged folder gives an identical file. `--check` exits non-zero when the
committed archive does not match the folder.
"""

import io
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public" / "skills" / "eneo"
ARCHIVE = ROOT / "public" / "skills" / "eneo.zip"
SKIPPED = {"__pycache__", ".DS_Store"}


def build():
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(SOURCE.rglob("*")):
            if not file.is_file() or SKIPPED & set(file.parts):
                continue
            name = "eneo/" + file.relative_to(SOURCE).as_posix()
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o755 if file.suffix == ".py" else 0o644) << 16
            archive.writestr(info, file.read_bytes())
    return buffer.getvalue()


def main():
    data = build()
    if "--check" in sys.argv:
        if not ARCHIVE.is_file() or ARCHIVE.read_bytes() != data:
            sys.exit("public/skills/eneo.zip is out of date. Run: python3 tools/package_skill.py")
        print("eneo.zip matches the skill folder.")
        return
    ARCHIVE.write_bytes(data)
    print(f"Wrote {ARCHIVE.relative_to(ROOT)} ({len(data)} bytes)")


if __name__ == "__main__":
    main()
