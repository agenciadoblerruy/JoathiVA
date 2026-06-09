#!/usr/bin/env python3
"""Build a Lucía smart search index from the local JS reference datasets."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_REFERENCE = ROOT / "version-24" / "V" / "lucia-reference-data.js"
DEFAULT_OUTPUT = ROOT / "version-24" / "V" / "lucia-smart-search-data.js"


def load_js_json(path: Path, marker: str) -> Any:
    text = path.read_text(encoding="utf-8")
    match = re.search(rf"{re.escape(marker)}\s*=\s*(\{{[\s\S]*\}})\s*;\s*$", text)
    if not match:
        raise ValueError(f"No se pudo leer JSON de {path}")
    return json.loads(match.group(1))


def normalize(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def build_entries(reference: dict[str, Any]) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    tables = reference.get("tables", [])
    for table in tables:
        table_title = normalize(table.get("title"))
        table_id = normalize(table.get("id"))
        source_file = normalize(table.get("sourceFile"))
        for row in table.get("rows", []) or []:
            values = [normalize(v) for v in row.values() if normalize(v)]
            label = values[0] if values else table_title
            aliases = [table_title, source_file, *values]
            entries.append({
                "key": f"{table_id}:{label[:80]}:{len(entries)}",
                "kind": "table-row",
                "label": label,
                "value": " | ".join(values[:4]),
                "aliases": aliases,
                "tableId": table_id,
                "tableTitle": table_title,
                "source": source_file,
            })
    return entries


def write_js(payload: dict[str, Any], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        "window.JOATHIVA_LUCIA_SMART_SEARCH_DATA = "
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reference", default=str(DEFAULT_REFERENCE))
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()

    reference = load_js_json(Path(args.reference), "window.JOATHIVA_LUCIA_REFERENCE_DATA")
    payload = {
        "generatedAt": "2026-05-02",
        "entryCount": 0,
        "entries": build_entries(reference),
    }
    payload["entryCount"] = len(payload["entries"])
    write_js(payload, Path(args.output))
    print(f"Entradas: {payload['entryCount']}. Salida: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
