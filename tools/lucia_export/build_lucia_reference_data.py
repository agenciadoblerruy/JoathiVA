#!/usr/bin/env python3
"""Build JoathiVA web reference data from Lucia XLSX tables.

The generated JavaScript file is static reference data. It does not include
credentials and does not call authenticated Lucia endpoints.
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any

from repo_paths import default_downloads_dir, lucia_reference_output


DEFAULT_SOURCE_DIR = default_downloads_dir()
DEFAULT_OUTPUT = lucia_reference_output()

SOURCE_PATTERNS = [
    "Tablas_Generales_excel*.XLSX",
    "Equivalencia_del_tipo_de_bultos_excel.XLSX",
    "Unidad_Reajustable_Indexada_excel.XLSX",
    "Medida_contenedores_excel.XLSX",
    "Observaciones_excel.XLSX",
]


def slugify(value: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower())
    return text.strip("-") or "tabla"


def normalize_cell(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, date):
        return value.isoformat()
    if value is None:
        return ""
    if isinstance(value, (int, float)):
        return value
    return re.sub(r"\s+", " ", str(value).strip())


def normalize_header(value: Any, index: int) -> str:
    text = normalize_cell(value)
    if not text:
        return f"Columna {index + 1}"
    return str(text)


def build_table_title(path: Path, sheet_name: str, headers: list[str], rows: list[dict[str, Any]]) -> str:
    if path.name == "Equivalencia_del_tipo_de_bultos_excel.XLSX":
        return "Equivalencia del tipo de bultos"
    if path.name == "Unidad_Reajustable_Indexada_excel.XLSX":
        return "Unidad Reajustable / Indexada"
    if path.name == "Medida_contenedores_excel.XLSX":
        return "Medida de contenedores"
    if path.name == "Observaciones_excel.XLSX":
        return f"Observaciones - {sheet_name}"

    first_description = ""
    if rows:
        for key, value in rows[0].items():
            if "descrip" in key.lower() and value:
                first_description = str(value)
                break

    number_match = re.search(r"\((\d+)\)", path.name)
    table_number = number_match.group(1) if number_match else "base"
    suffix = f": {first_description}" if first_description else ""
    return f"Tabla general {table_number}{suffix}"


def iter_source_files(source_dir: Path) -> list[Path]:
    files: list[Path] = []
    seen: set[Path] = set()
    for pattern in SOURCE_PATTERNS:
        for path in sorted(source_dir.glob(pattern)):
            if path.exists() and path not in seen:
                files.append(path)
                seen.add(path)
    return files


def read_workbook_tables(path: Path) -> list[dict[str, Any]]:
    try:
        import openpyxl
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Falta la dependencia openpyxl. Instala los requisitos de Lucía para generar la referencia."
        ) from exc

    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    tables: list[dict[str, Any]] = []

    for sheet in workbook.worksheets:
        raw_rows = list(sheet.iter_rows(values_only=True))
        raw_rows = [row for row in raw_rows if any(cell is not None and str(cell).strip() for cell in row)]
        if not raw_rows:
            continue

        headers = [normalize_header(value, index) for index, value in enumerate(raw_rows[0])]
        records: list[dict[str, Any]] = []
        for raw_row in raw_rows[1:]:
            record = {
                headers[index]: normalize_cell(raw_row[index] if index < len(raw_row) else "")
                for index in range(len(headers))
            }
            if any(value != "" for value in record.values()):
                records.append(record)

        table_id = slugify(f"{path.stem}-{sheet.title}")
        title = build_table_title(path, sheet.title, headers, records)
        tables.append(
            {
                "id": table_id,
                "title": title,
                "sourceFile": path.name,
                "sheet": sheet.title,
                "columns": headers,
                "rowCount": len(records),
                "rows": records,
            }
        )

    return tables


def build_payload(source_dir: Path) -> dict[str, Any]:
    tables: list[dict[str, Any]] = []
    for path in iter_source_files(source_dir):
        tables.extend(read_workbook_tables(path))

    return {
        "source": {
            "name": "Tablas generales publicas de Sistema Lucia",
            "sourceDir": str(source_dir),
            "generatedAt": datetime.now().isoformat(timespec="seconds"),
            "note": "Datos importados desde archivos XLSX aportados localmente. No incluye credenciales ni automatiza acceso autenticado.",
        },
        "tables": tables,
        "tableCount": len(tables),
        "rowCount": sum(table["rowCount"] for table in tables),
    }


def write_js(payload: dict[str, Any], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    text = (
        "window.JOATHIVA_LUCIA_REFERENCE_DATA = "
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ";\n"
    )
    output.write_text(text, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Genera datos JS de referencia Lucia desde XLSX.")
    parser.add_argument("--source-dir", default=str(DEFAULT_SOURCE_DIR))
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()

    payload = build_payload(Path(args.source_dir))
    write_js(payload, Path(args.output))
    print(f"Tablas: {payload['tableCount']}. Filas: {payload['rowCount']}. Salida: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
