#!/usr/bin/env python3
"""Export public data published by Uruguay DNA Sistema Lucia.

The tool mirrors public/anonymously accessible sources only:
- FTP: DUA Diarios XML published by DNA.
- CKAN: DNA datasets in catalogodatos.gub.uy tagged as DNA.

It preserves source files as published and writes CSV manifests for traceability.
"""

from __future__ import annotations

import argparse
import csv
import ftplib
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


FTP_HOST = "ftp.aduanas.gub.uy"
FTP_BASE_DIR = "DUA Diarios XML"
FTP_PUBLIC_URL = f"ftp://{FTP_HOST}/{urllib.parse.quote(FTP_BASE_DIR)}/"
CKAN_PACKAGE_SEARCH = "https://catalogodatos.gub.uy/api/3/action/package_search"
CKAN_QUERY = "organization:dna tags:DNA"


@dataclass(frozen=True)
class FtpEntry:
    name: str
    is_dir: bool
    size: int | None
    raw: str


def parse_ftp_list_line(line: str) -> FtpEntry | None:
    """Parse common Windows/IIS and Unix FTP LIST output."""
    windows = re.match(
        r"^(?P<date>\d{2}-\d{2}-\d{2})\s+"
        r"(?P<time>\d{2}:\d{2}[AP]M)\s+"
        r"(?:(?P<dir><DIR>)|(?P<size>\d+))\s+"
        r"(?P<name>.+)$",
        line,
    )
    if windows:
        return FtpEntry(
            name=windows.group("name").strip(),
            is_dir=bool(windows.group("dir")),
            size=int(windows.group("size")) if windows.group("size") else None,
            raw=line,
        )

    unix = re.match(
        r"^(?P<mode>[dl-][rwx-]{9})\s+\S+\s+\S+\s+\S+\s+"
        r"(?P<size>\d+)\s+\S+\s+\S+\s+\S+\s+(?P<name>.+)$",
        line,
    )
    if unix:
        return FtpEntry(
            name=unix.group("name").strip(),
            is_dir=unix.group("mode").startswith("d"),
            size=int(unix.group("size")),
            raw=line,
        )

    return None


def ftp_connect() -> ftplib.FTP:
    ftp = ftplib.FTP(FTP_HOST, timeout=60)
    ftp.login()
    ftp.cwd(FTP_BASE_DIR)
    return ftp


def ftp_list(ftp: ftplib.FTP, path: str | None = None) -> list[FtpEntry]:
    current = ftp.pwd()
    if path:
        ftp.cwd(path)
    lines: list[str] = []
    ftp.dir(lines.append)
    if path:
        ftp.cwd(current)

    entries = []
    for line in lines:
        entry = parse_ftp_list_line(line)
        if entry:
            entries.append(entry)
    return entries


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def write_csv(path: Path, rows: Iterable[dict[str, object]], fieldnames: list[str]) -> int:
    ensure_parent(path)
    count = 0
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
            count += 1
    return count


def selected_years(all_years: list[str], years: str) -> list[str]:
    if years == "all":
        return all_years

    selected: set[str] = set()
    for part in years.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            start_raw, end_raw = part.split("-", 1)
            start, end = int(start_raw), int(end_raw)
            selected.update(str(year) for year in range(start, end + 1))
        else:
            selected.add(part)
    return [year for year in all_years if year in selected]


def download_ftp_file(
    ftp: ftplib.FTP,
    remote_path: str,
    target: Path,
    size: int | None,
    force: bool,
) -> str:
    if target.exists() and not force:
        if size is None or target.stat().st_size == size:
            return "skipped"

    ensure_parent(target)
    tmp_target = target.with_suffix(target.suffix + ".part")
    with tmp_target.open("wb") as handle:
        ftp.retrbinary(f"RETR {remote_path}", handle.write)
    os.replace(tmp_target, target)
    return "downloaded"


def export_ftp(args: argparse.Namespace) -> None:
    output_dir = Path(args.output).resolve()
    raw_dir = output_dir / "raw" / "ftp_dua_diarios_xml"
    manifest_dir = output_dir / "manifests"

    with ftp_connect() as ftp:
        root_entries = ftp_list(ftp)
        year_dirs = sorted(entry.name for entry in root_entries if entry.is_dir and entry.name.isdigit())
        years = selected_years(year_dirs, args.years)

        root_rows = [
            {
                "source": "ftp_dua_diarios_xml",
                "path": entry.name,
                "is_dir": entry.is_dir,
                "size_bytes": entry.size or "",
                "source_url": FTP_PUBLIC_URL + urllib.parse.quote(entry.name),
                "raw_listing": entry.raw,
            }
            for entry in root_entries
        ]
        write_csv(
            manifest_dir / "ftp_root_manifest.csv",
            root_rows,
            ["source", "path", "is_dir", "size_bytes", "source_url", "raw_listing"],
        )

        file_rows: list[dict[str, object]] = []
        downloaded = skipped = 0
        processed = 0

        for year in years:
            entries = ftp_list(ftp, year)
            files = [entry for entry in entries if not entry.is_dir]
            for entry in files:
                if args.max_files and processed >= args.max_files:
                    break
                remote_path = f"{year}/{entry.name}"
                target = raw_dir / year / entry.name
                status = "dry-run"
                if not args.dry_run:
                    status = download_ftp_file(ftp, remote_path, target, entry.size, args.force)
                    downloaded += int(status == "downloaded")
                    skipped += int(status == "skipped")
                    if args.delay:
                        time.sleep(args.delay)

                file_rows.append(
                    {
                        "source": "ftp_dua_diarios_xml",
                        "year": year,
                        "filename": entry.name,
                        "size_bytes": entry.size or "",
                        "status": status,
                        "local_path": str(target),
                        "source_url": FTP_PUBLIC_URL
                        + urllib.parse.quote(year)
                        + "/"
                        + urllib.parse.quote(entry.name),
                        "raw_listing": entry.raw,
                    }
                )
                processed += 1
            if args.max_files and processed >= args.max_files:
                break

        count = write_csv(
            manifest_dir / "ftp_files_manifest.csv",
            file_rows,
            [
                "source",
                "year",
                "filename",
                "size_bytes",
                "status",
                "local_path",
                "source_url",
                "raw_listing",
            ],
        )

        print(
            f"FTP DUA: {count} archivos inventariados. "
            f"Descargados={downloaded}, omitidos={skipped}, dry_run={args.dry_run}."
        )


def http_get_json(url: str) -> dict[str, object]:
    request = urllib.request.Request(url, headers={"User-Agent": "JoathiVA Lucia Public Data Exporter/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def download_http_file(url: str, target: Path, force: bool) -> str:
    if target.exists() and not force:
        return "skipped"
    ensure_parent(target)
    tmp_target = target.with_suffix(target.suffix + ".part")
    request = urllib.request.Request(url, headers={"User-Agent": "JoathiVA Lucia Public Data Exporter/1.0"})
    with urllib.request.urlopen(request, timeout=120) as response, tmp_target.open("wb") as handle:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            handle.write(chunk)
    os.replace(tmp_target, target)
    return "downloaded"


def safe_name(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip())
    return value.strip("-") or "resource"


def export_ckan(args: argparse.Namespace) -> None:
    output_dir = Path(args.output).resolve()
    raw_dir = output_dir / "raw" / "catalogodatos_dna"
    manifest_dir = output_dir / "manifests"

    query = urllib.parse.urlencode({"fq": CKAN_QUERY, "rows": 100})
    payload = http_get_json(f"{CKAN_PACKAGE_SEARCH}?{query}")
    if not payload.get("success"):
        raise RuntimeError("CKAN package_search did not return success=true")

    result = payload.get("result", {})
    packages = result.get("results", []) if isinstance(result, dict) else []
    package_rows: list[dict[str, object]] = []
    resource_rows: list[dict[str, object]] = []
    downloaded = skipped = 0

    for package in packages:
        if not isinstance(package, dict):
            continue
        package_name = str(package.get("name", "dataset"))
        package_rows.append(
            {
                "name": package_name,
                "title": package.get("title", ""),
                "license": package.get("license_title", ""),
                "metadata_modified": package.get("metadata_modified", ""),
                "source_url": package.get("url", ""),
                "notes": package.get("notes", ""),
            }
        )

        package_dir = raw_dir / safe_name(package_name)
        ensure_parent(package_dir / "package.json")
        (package_dir / "package.json").write_text(
            json.dumps(package, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        for resource in package.get("resources", []):
            if not isinstance(resource, dict):
                continue
            url = str(resource.get("url", "")).strip()
            resource_id = str(resource.get("id", "resource"))
            resource_name = safe_name(str(resource.get("name") or resource_id))
            extension = Path(urllib.parse.urlparse(url).path).suffix
            target = package_dir / f"{resource_name}-{resource_id}{extension}"
            status = "not-downloadable"
            if url.startswith(("http://", "https://")):
                status = "dry-run"
                if not args.dry_run:
                    status = download_http_file(url, target, args.force)
                    downloaded += int(status == "downloaded")
                    skipped += int(status == "skipped")

            resource_rows.append(
                {
                    "dataset": package_name,
                    "resource_id": resource_id,
                    "name": resource.get("name", ""),
                    "format": resource.get("format", ""),
                    "status": status,
                    "local_path": str(target),
                    "source_url": url,
                    "last_modified": resource.get("last_modified", ""),
                }
            )

    write_csv(
        manifest_dir / "catalogodatos_packages_manifest.csv",
        package_rows,
        ["name", "title", "license", "metadata_modified", "source_url", "notes"],
    )
    count = write_csv(
        manifest_dir / "catalogodatos_resources_manifest.csv",
        resource_rows,
        ["dataset", "resource_id", "name", "format", "status", "local_path", "source_url", "last_modified"],
    )
    print(
        f"Catalogo DNA: {len(package_rows)} datasets, {count} recursos inventariados. "
        f"Descargados={downloaded}, omitidos={skipped}, dry_run={args.dry_run}."
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Exporta datos publicos de Sistema Lucia/DNA desde fuentes oficiales.",
    )
    parser.add_argument("--output", default="data/lucia_public_export", help="Directorio destino.")
    parser.add_argument("--source", choices=["all", "ftp", "catalog"], default="all")
    parser.add_argument(
        "--years",
        default="2016-2026",
        help="Anios FTP a exportar: all, 2024, 2023-2026, 2020,2022. Default: 2016-2026.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Solo inventaria, no descarga archivos.")
    parser.add_argument("--force", action="store_true", help="Redescarga aunque el archivo exista.")
    parser.add_argument("--max-files", type=int, default=0, help="Limite de archivos FTP para pruebas.")
    parser.add_argument("--delay", type=float, default=0.0, help="Pausa entre descargas FTP, en segundos.")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.source in {"all", "ftp"}:
            export_ftp(args)
        if args.source in {"all", "catalog"}:
            export_ckan(args)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
