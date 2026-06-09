from __future__ import annotations

import os
from pathlib import Path


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def version24_root() -> Path:
    return repo_root() / "version-24"


def lucia_reference_output() -> Path:
    return version24_root() / "V" / "lucia-reference-data.js"


def default_downloads_dir() -> Path:
    override = os.environ.get("JOATHIVA_LUCIA_DOWNLOADS_DIR")
    if override:
        return Path(override).expanduser()
    return Path.home() / "Downloads"

