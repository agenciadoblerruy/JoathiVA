#!/usr/bin/env python3
"""Build an operational Lucía dataset from the local public export package."""

from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_EXPORT_DIR = ROOT / "tools" / "lucia_export" / "data" / "lucia_public_export"
DEFAULT_OUTPUT = ROOT / "version-24" / "V" / "lucia-operational-data.js"


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def normalize_text(value: object) -> str:
    return " ".join(str(value or "").strip().split())


def load_package_metadata(raw_dir: Path) -> list[dict[str, object]]:
    packages = []
    for package_json in raw_dir.glob("catalogodatos_dna/*/package.json"):
        data = json.loads(package_json.read_text(encoding="utf-8"))
        packages.append({
            "dataset": normalize_text(data.get("name")),
            "title": normalize_text(data.get("title")),
            "sourceUrl": normalize_text(data.get("url")),
            "notes": normalize_text(data.get("notes")),
            "resourceCount": len(data.get("resources") or []),
        })
    return packages


def build_payload(export_dir: Path) -> dict[str, object]:
    manifests = export_dir / "manifests"
    raw_dir = export_dir / "raw"
    ftp_files = read_csv_rows(manifests / "ftp_files_manifest.csv")
    ftp_root = read_csv_rows(manifests / "ftp_root_manifest.csv")
    catalog_packages = read_csv_rows(manifests / "catalogodatos_packages_manifest.csv")
    catalog_resources = read_csv_rows(manifests / "catalogodatos_resources_manifest.csv")
    package_metadata = load_package_metadata(raw_dir)

    operational_items = []
    for row in ftp_files:
        operational_items.append({
            "kind": "ftp-file",
            "label": normalize_text(row.get("filename")),
            "value": normalize_text(row.get("source_url")),
            "status": normalize_text(row.get("status")),
            "source": "ftp_dua_diarios_xml",
            "year": normalize_text(row.get("year")),
            "localPath": normalize_text(row.get("local_path")),
        })
    for row in catalog_packages:
        operational_items.append({
            "kind": "catalog-package",
            "label": normalize_text(row.get("title") or row.get("name")),
            "value": normalize_text(row.get("source_url")),
            "status": "available",
            "source": "catalogodatos_dna",
            "dataset": normalize_text(row.get("name")),
            "notes": normalize_text(row.get("notes")),
        })
    for row in catalog_resources:
        operational_items.append({
            "kind": "catalog-resource",
            "label": normalize_text(row.get("name")),
            "value": normalize_text(row.get("source_url")),
            "status": normalize_text(row.get("status")),
            "source": normalize_text(row.get("dataset")),
            "format": normalize_text(row.get("format")),
            "localPath": normalize_text(row.get("local_path")),
        })

    return {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "exportDir": str(export_dir),
        "ftp": {
            "rootCount": len(ftp_root),
            "fileCount": len(ftp_files),
        },
        "catalog": {
            "packageCount": len(catalog_packages),
            "resourceCount": len(catalog_resources),
        },
        "packageMetadata": package_metadata,
        "items": operational_items,
        "itemCount": len(operational_items),
    }


def write_js(payload: dict[str, object], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        "window.JOATHIVA_LUCIA_OPERATIONAL_DATA = "
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )


def append_run_history(payload: dict[str, object]) -> None:
    history_path = ROOT / "tools" / "lucia_export" / "data" / "lucia_operational_runs.json"
    history_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        history = json.loads(history_path.read_text(encoding="utf-8"))
        runs = history if isinstance(history, list) else []
    except FileNotFoundError:
        runs = []
    except json.JSONDecodeError:
        runs = []

    runs.insert(0, {
        "generatedAt": payload["generatedAt"],
        "exportDir": payload["exportDir"],
        "itemCount": payload["itemCount"],
        "ftp": payload["ftp"],
        "catalog": payload["catalog"],
    })
    history_path.write_text(json.dumps(runs[:20], ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    export_dir = DEFAULT_EXPORT_DIR
    output = DEFAULT_OUTPUT
    payload = build_payload(export_dir)
    write_js(payload, output)
    append_run_history(payload)
    print(f"Items: {payload['itemCount']}. Salida: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
