#!/usr/bin/env python3
"""Generate a minimal commercial document export for JoathiVA.

The script receives a JSON payload with the document record and related
records, renders a human-readable summary, and writes traceable exports:
- HTML
- DOCX
- PDF

It only uses the Python standard library so it can run in the current
desktop/runtime without extra dependencies.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import mimetypes
import re
import textwrap
import unicodedata
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable
from xml.sax.saxutils import escape as xml_escape


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8-sig") as handle:
        return json.load(handle)


def now_utc_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def normalize_export_format(value: Any) -> str:
    text = normalize_text(value).strip().lower()
    if text in {"", "bundle"}:
        return "bundle"
    if text in {"editable", "html"}:
        return "editable"
    if text in {"word", "docx"}:
        return "word"
    if text in {"pdf"}:
        return "pdf"
    if text in {"all"}:
        return "all"
    return "bundle"


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "Si" if value else "No"
    if isinstance(value, (int, float)):
        if isinstance(value, float) and value.is_integer():
          return str(int(value))
        return str(value)
    if isinstance(value, dict):
        return json.dumps(value, ensure_ascii=False, indent=2)
    if isinstance(value, (list, tuple, set)):
        return ", ".join(normalize_text(item) for item in value if normalize_text(item))
    text = str(value).strip()
    return text


def normalize_filename(value: str, fallback: str = "documento-comercial") -> str:
    text = unicodedata.normalize("NFKD", normalize_text(value))
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or fallback


def safe_get(record: dict[str, Any] | None, *keys: str) -> str:
    if not record:
        return ""
    for key in keys:
        if key in record and normalize_text(record[key]):
            return normalize_text(record[key])
    return ""


def build_relation_context(payload: dict[str, Any]) -> dict[str, Any]:
    document = payload.get("document") or {}
    quote = payload.get("quote") or {}
    customer = payload.get("customer") or {}
    provider = payload.get("provider") or {}
    operation = payload.get("operation") or {}

    return {
        "documentId": safe_get(document, "id"),
        "quoteId": safe_get(quote, "id"),
        "customerId": safe_get(customer, "id"),
        "providerId": safe_get(provider, "id"),
        "operationId": safe_get(operation, "id"),
        "documentTitle": safe_get(document, "title", "nombre", "subject"),
        "quoteReference": safe_get(quote, "referencia", "id"),
        "customerName": safe_get(customer, "empresa", "nombre", "displayName"),
        "providerName": safe_get(provider, "nombre", "razonSocial", "displayName"),
        "providerType": safe_get(provider, "tipoUnidad"),
        "providerConfiguration": safe_get(provider, "configuracion"),
        "operationReference": safe_get(operation, "referencia", "id"),
    }


def flatten_sections(payload: dict[str, Any]) -> tuple[list[tuple[str, list[tuple[str, str]]]], list[str]]:
    document = payload.get("document") or {}
    customer = payload.get("customer") or {}
    quote = payload.get("quote") or {}
    provider = payload.get("provider") or {}
    operation = payload.get("operation") or {}

    title = safe_get(document, "title", "nombre", "subject") or "Documento comercial"
    sections: list[tuple[str, list[tuple[str, str]]]] = [
        (
            "Documento",
            [
                ("Titulo", title),
                ("Tipo", safe_get(document, "documentType", "type")),
                ("Formato", safe_get(document, "format", "exportFormat")),
                ("Estado", safe_get(document, "status")),
                ("Fecha", safe_get(document, "createdAt", "updatedAt", "exportedAt", "renderedAt")),
            ],
        ),
        (
            "Cliente",
            [
                ("Nombre", safe_get(customer, "nombre", "empresa", "displayName")),
                ("Contacto", safe_get(customer, "contactoPrincipal", "contacto")),
                ("Telefono", safe_get(customer, "telefono")),
                ("Email", safe_get(customer, "email")),
                ("Pais", safe_get(customer, "pais")),
            ],
        ),
        (
            "Cotizacion",
            [
                ("Referencia", safe_get(quote, "referencia", "id")),
                ("Origen", safe_get(quote, "origen")),
                ("Destino", safe_get(quote, "destino")),
                ("Pais origen", safe_get(quote, "paisOrigen")),
                ("Pais destino", safe_get(quote, "paisDestino")),
                ("Tipo de operacion", safe_get(quote, "tipoOperacion")),
                ("Modo de transporte", safe_get(quote, "modoTransporte")),
                ("Moneda", safe_get(quote, "moneda")),
                ("Costo proveedor", safe_get(quote, "costoProveedor")),
                ("Margen pct", safe_get(quote, "margenPct")),
                ("Observaciones", safe_get(quote, "observaciones")),
            ],
        ),
        (
            "Proveedor",
            [
                ("Nombre", safe_get(provider, "nombre", "razonSocial", "displayName")),
                ("Contacto", safe_get(provider, "contacto", "contactoPrincipal")),
                ("Telefono", safe_get(provider, "telefono")),
                ("Email", safe_get(provider, "email")),
                ("Tipo de unidad", safe_get(provider, "tipoUnidad")),
                ("Configuracion", safe_get(provider, "configuracion")),
                ("Cobertura", safe_get(provider, "coverageSummary", "routesSummary", "zona")),
                ("Disponibilidad", safe_get(provider, "disponibilidad")),
            ],
        ),
        (
            "Operacion",
            [
                ("Referencia", safe_get(operation, "referencia", "id")),
                ("Tipo", safe_get(operation, "tipoOperacion")),
                ("Estado", safe_get(operation, "estadoOperacion")),
                ("Chofer", safe_get(operation, "chofer", "driver")),
                ("Camion", safe_get(operation, "camion", "truck")),
                ("MIC", safe_get(operation, "mic")),
                ("DUA", safe_get(operation, "dua")),
                ("CRT", safe_get(operation, "crt")),
            ],
        ),
    ]

    lines: list[str] = []
    lines.append(title)
    lines.append("")
    for section_title, items in sections:
        lines.append(section_title)
        for label, value in items:
            if value:
                lines.append(f"{label}: {value}")
        lines.append("")

    if safe_get(document, "contentText"):
        lines.append("Contenido")
        lines.append(safe_get(document, "contentText"))
        lines.append("")

    if safe_get(document, "body"):
        lines.append("Cuerpo")
        lines.append(safe_get(document, "body"))
        lines.append("")

    return sections, lines


def build_capabilities(export_format: str) -> dict[str, Any]:
    requested = normalize_export_format(export_format)
    want_html = requested in {"bundle", "editable", "all"}
    want_docx = requested in {"bundle", "word", "all"}
    want_pdf = requested in {"bundle", "pdf", "all"}
    return {
        "requested": requested,
        "html": want_html,
        "docx": want_docx,
        "pdf": want_pdf,
        "bundle": requested == "bundle",
    }


def build_html(title: str, sections: list[tuple[str, list[tuple[str, str]]]], lines: list[str]) -> str:
    parts = [
        "<!doctype html>",
        "<html lang=\"es\">",
        "<head>",
        "<meta charset=\"utf-8\">",
        f"<title>{xml_escape(title)}</title>",
        "<style>",
        "body{font-family:Arial,Helvetica,sans-serif;margin:32px;color:#1b2430;}",
        "h1{font-size:28px;margin:0 0 18px;}",
        "h2{font-size:18px;margin:24px 0 10px;border-bottom:1px solid #d9e2ec;padding-bottom:6px;}",
        "dl{display:grid;grid-template-columns:max-content 1fr;gap:8px 16px;}",
        "dt{font-weight:700;}",
        "dd{margin:0;}",
        "p{margin:0 0 10px;white-space:pre-wrap;}",
        "</style>",
        "</head>",
        "<body>",
        f"<h1>{xml_escape(title)}</h1>",
    ]

    for section_title, items in sections:
        parts.append(f"<h2>{xml_escape(section_title)}</h2>")
        parts.append("<dl>")
        for label, value in items:
            if value:
                parts.append(f"<dt>{xml_escape(label)}</dt><dd>{xml_escape(value)}</dd>")
        parts.append("</dl>")

    content_lines = []
    current_heading = ""
    for line in lines:
        if not line:
            content_lines.append("")
            continue
        if line in {title, *[section[0] for section in sections], "Contenido", "Cuerpo"}:
            current_heading = line
            content_lines.append(f"<h2>{xml_escape(line)}</h2>")
            continue
        content_lines.append(f"<p>{xml_escape(line)}</p>")

    parts.extend(content_lines)
    parts.append("</body></html>")
    return "\n".join(parts)


def build_docx_paragraph(text: str, bold: bool = False) -> str:
    run_props = "<w:rPr><w:b/></w:rPr>" if bold else ""
    return f"<w:p><w:r>{run_props}<w:t xml:space=\"preserve\">{xml_escape(text)}</w:t></w:r></w:p>"


def build_docx_bytes(title: str, sections: list[tuple[str, list[tuple[str, str]]]], lines: list[str]) -> bytes:
    paragraphs = [
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>",
        "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">",
        "<w:body>",
        build_docx_paragraph(title, bold=True),
    ]
    for section_title, items in sections:
        paragraphs.append(build_docx_paragraph(section_title, bold=True))
        for label, value in items:
            if value:
                paragraphs.append(build_docx_paragraph(f"{label}: {value}"))
        paragraphs.append(build_docx_paragraph(""))

    for line in lines:
        if line and line not in {title, *[section[0] for section in sections], "Contenido", "Cuerpo"}:
            paragraphs.append(build_docx_paragraph(line))

    paragraphs.extend(
        [
            "<w:sectPr>",
            "<w:pgSz w:w=\"11906\" w:h=\"16838\"/>",
            "<w:pgMar w:top=\"1440\" w:right=\"1440\" w:bottom=\"1440\" w:left=\"1440\" w:header=\"708\" w:footer=\"708\" w:gutter=\"0\"/>",
            "</w:sectPr>",
            "</w:body>",
            "</w:document>",
        ]
    )

    document_xml = "\n".join(paragraphs)
    styles_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
</w:styles>
"""
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"""
    root_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"""
    document_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>
"""
    core_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>{xml_escape(title)}</dc:title>
  <dc:creator>JoathiVA</dc:creator>
  <cp:lastModifiedBy>JoathiVA</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now_utc_iso()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{now_utc_iso()}</dcterms:modified>
</cp:coreProperties>
"""
    app_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>JoathiVA</Application>
</Properties>
"""
    buffer = bytes()
    with Path(os.devnull).open("wb"):
        pass
    from io import BytesIO

    bio = BytesIO()
    with zipfile.ZipFile(bio, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", root_rels)
        zf.writestr("word/document.xml", document_xml)
        zf.writestr("word/styles.xml", styles_xml)
        zf.writestr("word/_rels/document.xml.rels", document_rels)
        zf.writestr("docProps/core.xml", core_xml)
        zf.writestr("docProps/app.xml", app_xml)
    return bio.getvalue()


def pdf_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_pdf_bytes(title: str, lines: list[str]) -> bytes:
    wrapped: list[str] = []
    for line in lines:
        if not line:
            wrapped.append("")
            continue
        wrapped.extend(textwrap.wrap(line, width=90, break_long_words=False, replace_whitespace=False) or [""])

    # Reserve a simple header line on the first page.
    header = [title, ""]
    content = header + wrapped
    lines_per_page = 44
    pages = [content[i : i + lines_per_page] for i in range(0, max(len(content), 1), lines_per_page)]
    if not pages:
        pages = [[]]

    objects: list[bytes] = []
    pages_kids: list[str] = []
    page_object_number = 4

    for page_lines in pages:
        content_lines = ["BT", "/F1 11 Tf", "50 790 Td", "14 TL"]
        first_line = True
        for line in page_lines:
            safe_line = pdf_escape(line)
            if first_line:
                content_lines.append(f"({safe_line}) Tj")
                first_line = False
            else:
                content_lines.append("T*")
                content_lines.append(f"({safe_line}) Tj")
        content_lines.append("ET")
        stream = "\n".join(content_lines).encode("latin-1", errors="replace")

        content_obj_num = page_object_number + 1
        page_obj = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 3 0 R >> >> /Contents {content_obj_num} 0 R >>"
        ).encode("ascii")
        content_obj = b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream"
        objects.append(page_obj)
        objects.append(content_obj)
        pages_kids.append(f"{page_object_number} 0 R")
        page_object_number += 2

    catalog = b"<< /Type /Catalog /Pages 2 0 R >>"
    pages_obj = ("<< /Type /Pages /Kids [%s] /Count %d >>" % (" ".join(pages_kids), len(pages_kids))).encode("ascii")
    font_obj = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"

    ordered_objects = [catalog, pages_obj, font_obj] + objects
    output = bytearray()
    output.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for idx, obj in enumerate(ordered_objects, start=1):
        offsets.append(len(output))
        output.extend(f"{idx} 0 obj\n".encode("ascii"))
        output.extend(obj)
        output.extend(b"\nendobj\n")

    xref_offset = len(output)
    output.extend(f"xref\n0 {len(ordered_objects) + 1}\n".encode("ascii"))
    output.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        output.extend(f"{off:010d} 00000 n \n".encode("ascii"))
    output.extend(
        (
            "trailer\n"
            f"<< /Size {len(ordered_objects) + 1} /Root 1 0 R >>\n"
            "startxref\n"
            f"{xref_offset}\n"
            "%%EOF\n"
        ).encode("ascii")
    )
    return bytes(output)


def guess_mime(path: Path, fallback: str = "application/octet-stream") -> str:
    guessed, _ = mimetypes.guess_type(str(path))
    return guessed or fallback


def write_export(base_path: Path, title: str, sections, lines: list[str], export_format: str) -> dict[str, Any]:
    base_path.parent.mkdir(parents=True, exist_ok=True)
    exported: dict[str, Any] = {}
    requested = normalize_export_format(export_format)
    capabilities = build_capabilities(requested)
    want_docx = capabilities["docx"]
    want_pdf = capabilities["pdf"]
    want_html = capabilities["html"]

    if want_html:
        html_path = base_path.with_suffix(".html")
        html_path.write_text(build_html(title, sections, lines), encoding="utf-8")
        exported["html"] = {
            "kind": "html",
            "path": str(html_path),
            "name": html_path.name,
            "mimeType": guess_mime(html_path, "text/html"),
            "exists": html_path.exists(),
        }

    if want_docx:
        docx_path = base_path.with_suffix(".docx")
        docx_path.write_bytes(build_docx_bytes(title, sections, lines))
        exported["docx"] = {
            "kind": "docx",
            "path": str(docx_path),
            "name": docx_path.name,
            "mimeType": guess_mime(docx_path, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            "exists": docx_path.exists(),
        }

    if want_pdf:
        pdf_path = base_path.with_suffix(".pdf")
        pdf_path.write_bytes(build_pdf_bytes(title, lines))
        exported["pdf"] = {
            "kind": "pdf",
            "path": str(pdf_path),
            "name": pdf_path.name,
            "mimeType": guess_mime(pdf_path, "application/pdf"),
            "exists": pdf_path.exists(),
        }

    manifest_path = base_path.with_suffix(".manifest.json")
    manifest_path.write_text(
        json.dumps(
            {
                "basePath": str(base_path),
                "title": title,
                "exportFormat": requested,
                "capabilities": capabilities,
                "files": exported,
                "createdAt": now_utc_iso(),
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    exported["manifest"] = {
        "kind": "manifest",
        "path": str(manifest_path),
        "name": manifest_path.name,
        "mimeType": guess_mime(manifest_path, "application/json"),
        "exists": manifest_path.exists(),
    }
    return exported


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate commercial document exports for JoathiVA.")
    parser.add_argument("payload", help="Path to JSON payload with document and related records.")
    args = parser.parse_args()

    payload_path = Path(args.payload)
    payload = load_json(payload_path)
    document = payload.get("document") or {}
    relations = build_relation_context(payload)
    title = safe_get(document, "title", "nombre", "subject") or "Documento comercial"
    sections, lines = flatten_sections(payload)

    export_root = Path(payload.get("outputDir") or (payload_path.parent / "generated-documents"))
    document_id = safe_get(document, "id") or normalize_filename(title)
    base_name = normalize_filename(document_id, fallback=normalize_filename(title))
    base_path = export_root / base_name / normalize_filename(title, fallback=base_name)

    requested_format = normalize_export_format(payload.get("exportFormat") or payload.get("format") or "bundle")
    capabilities = build_capabilities(requested_format)
    exported = write_export(base_path, title, sections, lines, requested_format)

    export_files = {}
    missing_files: list[str] = []
    for key, value in exported.items():
        path = Path(value)
        export_files[key] = {
            "path": str(path),
            "name": path.name,
            "mimeType": guess_mime(path),
            "exists": path.exists(),
        }
        if not path.exists():
            missing_files.append(key)

    result = {
        "ok": True,
        "documentId": safe_get(document, "id"),
        "title": title,
        "basePath": str(base_path),
        "relations": relations,
        "capabilities": capabilities,
        "files": export_files,
        "fileCount": len(export_files),
        "missingFiles": missing_files,
        "contentText": "\n".join(lines).strip(),
        "summary": {
            "customer": safe_get(payload.get("customer") or {}, "empresa", "nombre", "displayName"),
            "quote": safe_get(payload.get("quote") or {}, "referencia", "id"),
            "provider": safe_get(payload.get("provider") or {}, "nombre", "razonSocial", "displayName"),
            "operation": safe_get(payload.get("operation") or {}, "referencia", "id"),
        },
        "createdAt": now_utc_iso(),
        "exportFormat": requested_format,
        "warnings": [f"missing file: {item}" for item in missing_files],
    }
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
