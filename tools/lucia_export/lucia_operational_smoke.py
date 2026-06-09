#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "version-24" / "V" / "lucia-operational-data.js"


def main() -> int:
    text = SOURCE.read_text(encoding="utf-8")
    match = re.search(r"window\.JOATHIVA_LUCIA_OPERATIONAL_DATA\s*=\s*(\{[\s\S]*\})\s*;\s*$", text)
    if not match:
        raise SystemExit("No se pudo leer el dataset operativo")
    payload = json.loads(match.group(1))
    ok = bool(payload.get("itemCount")) and bool(payload.get("ftp")) and bool(payload.get("catalog"))
    print(json.dumps({
        "ok": ok,
        "itemCount": payload.get("itemCount", 0),
        "ftpFileCount": payload.get("ftp", {}).get("fileCount", 0),
        "catalogResourceCount": payload.get("catalog", {}).get("resourceCount", 0),
    }, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
