from __future__ import annotations

import mimetypes
import re
import sys
import shutil
from dataclasses import dataclass
from email.message import EmailMessage
from datetime import datetime
from pathlib import Path

from PIL import Image
from pypdf import PdfReader
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


DEFAULT_INPUT_DIR = (
    Path.home()
    / "Downloads"
    / "Joathi_descargas"
    / "Administración"
    / "Sistema Lucia"
    / "capturas"
)
DEFAULT_FACTURAS_DIR = DEFAULT_INPUT_DIR / "Facturas" / "03 - Marzo"
DEFAULT_CRT_DIR = DEFAULT_INPUT_DIR / "CRT"
DEFAULT_OUTPUT_DIR = DEFAULT_INPUT_DIR / "ZC"

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}
GROUP_RE = re.compile(r"^(?P<char>.)\1{0,2}$")
ZC_RE = re.compile(r"\bZC\s*([0-9]{1,8})\b", re.IGNORECASE)
DUA_RE = re.compile(r"\bDUA\s*([0-9]{3,12})\b", re.IGNORECASE)
CRT_RE = re.compile(r"\bCRT\b\s*[:\-]?\s*((?:\d{0,3}\s*)?[A-Z]{2}\s*\d{5,})", re.IGNORECASE)
YEAR_RE = re.compile(r"\b20([0-9]{2})\b")
MIC_YEAR_RE = re.compile(r"\bMIC\s+([0-9]{2})[A-Z]{2}", re.IGNORECASE)
PROFILE_BONJOUR = "bonjour"
PROFILE_OLAVERRY = "olaverry"
DEFAULT_PROFILE = PROFILE_BONJOUR

PROFILE_LABELS = {
    PROFILE_BONJOUR: "Bonjour",
    PROFILE_OLAVERRY: "OLAVERRY",
}

PROFILE_FOLDER_PREFIX = {
    PROFILE_BONJOUR: "BT",
    PROFILE_OLAVERRY: "Olaverry",
}

PROFILE_DESCRIPTIONS = {
    PROFILE_BONJOUR: "Flujo actual estable",
    PROFILE_OLAVERRY: "Factura + CRT con normalizacion especial",
}

EMAIL_RECIPIENTS = (
    "gabriel.ferraro@petrocuyo.com",
    "mauro.saez@petrocuyo.com",
)

EMAIL_SUBJECTS = {
    PROFILE_BONJOUR: "Documentación BT",
    PROFILE_OLAVERRY: "Documentación Olaverry",
}

EMAIL_BODY = "Adjunto la documentación correspondiente a los fletes realizados."
ASSET_DIR = Path(__file__).resolve().with_name("assets")
STARTUP_ART_PATH = Path.home() / "Downloads" / "pantala inicio generador de zc.png"
STARTUP_ART_SIZE = (1920, 1080)
STARTUP_ART_HOTSPOTS = {
    PROFILE_OLAVERRY: (0, 610, 1019, 1005),
    PROFILE_BONJOUR: (944, 239, 1919, 622),
}


@dataclass(frozen=True)
class FacturaInfo:
    path: Path
    zc_raw: str
    dua: str
    crt: str
    year_suffix: str
    document_stem: str


@dataclass(frozen=True)
class ImageGroup:
    label: str
    images: list[Path]
    source: str


def normalize_profile(profile: str | None) -> str:
    value = (profile or DEFAULT_PROFILE).strip().lower()
    return value if value in PROFILE_LABELS else DEFAULT_PROFILE


def build_run_folder_name(profile: str, when: datetime | None = None) -> str:
    profile = normalize_profile(profile)
    prefix = PROFILE_FOLDER_PREFIX[profile]
    return f"{prefix}_{(when or datetime.now()).strftime('%d%m%y')}"


def safe_filename_stem(value: str) -> str:
    cleaned = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", value)
    cleaned = re.sub(r"\s+", "_", cleaned).strip(" ._")
    return cleaned or "documento"


def normalize_char_for_filename(char: str) -> str:
    if char.isalnum():
        return char
    if len(char) > 1:
        return safe_filename_stem(char)
    return f"caracter_{ord(char):04x}"


def is_image_file(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS


def is_pattern_named_image(path: Path) -> bool:
    stem = path.stem
    return bool(GROUP_RE.match(stem)) and len(stem) in {1, 2, 3}


def image_sort_key(path: Path) -> tuple[int, str]:
    return path.stat().st_mtime_ns, path.name.lower()


def pdf_sort_key(path: Path) -> tuple[int, str]:
    stem_digits = re.sub(r"\D", "", path.stem)
    numeric = int(stem_digits) if stem_digits else 10**12
    return numeric, path.name.lower()


def collect_pattern_image_groups(input_dir: Path) -> tuple[list[ImageGroup], list[str]]:
    groups: dict[str, dict[int, Path]] = {}
    warnings: list[str] = []

    for image_path in sorted(input_dir.iterdir(), key=lambda p: p.name.lower()):
        if not is_image_file(image_path):
            continue

        stem = image_path.stem
        match = GROUP_RE.match(stem)
        if not match or len(stem) not in {1, 2, 3}:
            continue

        char = match.group("char")
        length = len(stem)
        groups.setdefault(char, {})
        if length in groups[char]:
            warnings.append(
                f"Duplicada para el grupo {char!r} longitud {length}: {image_path.name}"
            )
            continue

        groups[char][length] = image_path

    image_groups = [
        ImageGroup(label=char, images=[by_length[1], by_length[2], by_length[3]], source="nombres 1/11/111")
        for char, by_length in sorted(groups.items())
        if all(length in by_length for length in (1, 2, 3))
    ]
    return image_groups, warnings


def collect_date_image_groups(input_dir: Path) -> tuple[list[ImageGroup], list[str]]:
    warnings: list[str] = []
    image_paths = sorted((p for p in input_dir.iterdir() if is_image_file(p) and not is_pattern_named_image(p)), key=image_sort_key)
    if not image_paths:
        return [], warnings

    image_groups: list[ImageGroup] = []
    full_count = len(image_paths) - (len(image_paths) % 3)
    for index in range(0, full_count, 3):
        triplet = image_paths[index : index + 3]
        image_groups.append(
            ImageGroup(
                label=f"fecha_{(index // 3) + 1:03d}",
                images=triplet,
                source="capturas sin renombrar por fecha",
            )
        )

    leftover = image_paths[full_count:]
    if leftover:
        warnings.append(
            "Quedaron imagenes sin agrupar porque no completan un bloque de 3: "
            + ", ".join(path.name for path in leftover)
        )

    return image_groups, warnings


def collect_image_groups(input_dir: Path) -> tuple[list[ImageGroup], list[str], str]:
    date_groups, date_warnings = collect_date_image_groups(input_dir)
    if date_groups:
        return date_groups, date_warnings, "Modo automatico: capturas sin renombrar ordenadas por fecha"

    pattern_groups, pattern_warnings = collect_pattern_image_groups(input_dir)
    return pattern_groups, pattern_warnings, "Modo automatico: nombres 1/11/111"


def infer_year_suffix(text: str) -> str:
    year_match = YEAR_RE.search(text)
    if year_match:
        return year_match.group(1)

    mic_match = MIC_YEAR_RE.search(text)
    if mic_match:
        return mic_match.group(1)

    return datetime.now().strftime("%y")


def normalize_crt_for_filename(value: str, profile: str = DEFAULT_PROFILE) -> str:
    compact = re.sub(r"[^A-Za-z0-9]", "", value).upper()
    if not compact:
        return "CRT"

    profile = normalize_profile(profile)
    if profile == PROFILE_OLAVERRY:
        stripped = re.sub(r"^\d+", "", compact)
        if stripped:
            compact = stripped
        return safe_filename_stem(compact)

    if compact[0].isdigit():
        digits = re.sub(r"\D", "", compact)
        if len(digits) >= 5:
            return digits[-5:]

    return safe_filename_stem(compact)


def normalize_zc_for_filename(zc_raw: str, year_suffix: str) -> str:
    digits = re.sub(r"[^0-9]", "", zc_raw)
    year_prefix = year_suffix[-2:]
    if not digits:
        return f"{year_prefix}000000"

    if len(digits) <= 6:
        return f"{year_prefix}{digits.zfill(6)}"

    if digits.startswith(year_prefix):
        if len(digits) == 7:
            return f"{year_prefix}{digits[2:].zfill(6)}"
        if len(digits) >= 8:
            return digits[:8]

    if len(digits) == 7:
        return f"{year_prefix}{digits[-6:].zfill(6)}"

    if len(digits) >= 8:
        return digits[-8:]

    return f"{year_prefix}{digits.zfill(6)}"


def build_document_stem(zc_raw: str, dua: str, crt: str, year_suffix: str, profile: str = DEFAULT_PROFILE) -> str:
    zc_code = normalize_zc_for_filename(zc_raw, year_suffix)
    crt_code = normalize_crt_for_filename(crt, profile=profile)
    return safe_filename_stem(f"ZC{zc_code}_DUA_{dua}_CRT_{crt_code}")


def extract_text_from_pdf(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def extract_factura_info(pdf_path: Path, profile: str = DEFAULT_PROFILE) -> FacturaInfo:
    text = extract_text_from_pdf(pdf_path)
    zc_match = ZC_RE.search(text)
    dua_match = DUA_RE.search(text)
    crt_match = CRT_RE.search(text)
    if not zc_match or not dua_match or not crt_match:
        missing = []
        if not zc_match:
            missing.append("ZC")
        if not dua_match:
            missing.append("DUA")
        if not crt_match:
            missing.append("CRT")
        raise ValueError(f"No se encontro {' y '.join(missing)}")

    zc_raw = zc_match.group(1)
    dua = dua_match.group(1)
    crt = crt_match.group(1)
    year_suffix = infer_year_suffix(text)
    return FacturaInfo(
        path=pdf_path,
        zc_raw=zc_raw,
        dua=dua,
        crt=crt,
        year_suffix=year_suffix,
        document_stem=build_document_stem(zc_raw, dua, crt, year_suffix, profile=profile),
    )


def is_factura_pdf(path: Path, profile: str) -> bool:
    del profile
    return path.is_file() and path.suffix.lower() == ".pdf" and not path.stem.upper().startswith("ZC")


def collect_facturas(facturas_dir: Path, profile: str = DEFAULT_PROFILE) -> tuple[list[FacturaInfo], list[str]]:
    warnings: list[str] = []
    if not facturas_dir.exists() or not facturas_dir.is_dir():
        warnings.append(f"Carpeta de facturas no encontrada: {facturas_dir}")
        return [], warnings

    factura_paths = sorted(
        (
            path
            for path in facturas_dir.iterdir()
            if path.is_file()
            and path.suffix.lower() == ".pdf"
            and is_factura_pdf(path, profile)
        ),
        key=lambda path: path.name.lower(),
    )

    facturas: list[FacturaInfo] = []
    for factura_path in factura_paths:
        try:
            facturas.append(extract_factura_info(factura_path, profile=profile))
        except Exception as exc:
            warnings.append(f"No pude leer datos de {factura_path.name}: {exc}")

    return facturas, warnings


def collect_crt_pdfs(crt_dir: Path) -> tuple[list[Path], list[str]]:
    warnings: list[str] = []
    if not crt_dir.exists() or not crt_dir.is_dir():
        warnings.append(f"Carpeta de CRT no encontrada: {crt_dir}")
        return [], warnings

    crt_paths = sorted(
        (
            path
            for path in crt_dir.iterdir()
            if path.is_file() and path.suffix.lower() == ".pdf"
        ),
        key=pdf_sort_key,
    )
    return crt_paths, warnings


def build_email_draft(output_dir: Path, generated_paths: list[Path], profile: str) -> tuple[Path, str]:
    profile = normalize_profile(profile)
    subject = EMAIL_SUBJECTS[profile]
    attachment_dirs = [output_dir / "CRT", output_dir / "FACTURAS", output_dir / "ZC"]
    attachment_paths: list[Path] = []
    for attachment_dir in attachment_dirs:
        if not attachment_dir.exists() or not attachment_dir.is_dir():
            continue
        attachment_paths.extend(
            path
            for path in sorted(attachment_dir.iterdir(), key=lambda item: item.name.lower())
            if path.is_file() and path.suffix.lower() == ".pdf"
        )

    if not attachment_paths:
        raise ValueError("No hay archivos CRT, FACTURAS o ZC para adjuntar al borrador del correo.")

    message = EmailMessage()
    message["To"] = ", ".join(EMAIL_RECIPIENTS)
    message["Subject"] = subject
    message.set_content(EMAIL_BODY)

    for pdf_path in attachment_paths:
        mime_type, _ = mimetypes.guess_type(pdf_path.name)
        maintype, subtype = (mime_type or "application/pdf").split("/", 1)
        message.add_attachment(
            pdf_path.read_bytes(),
            maintype=maintype,
            subtype=subtype,
            filename=pdf_path.name,
        )

    eml_path = output_dir / f"{safe_filename_stem(subject)}.eml"
    eml_path.write_bytes(message.as_bytes())
    return eml_path, subject


def prepare_run_directories(output_root: Path, profile: str) -> tuple[Path, Path, Path, Path]:
    run_root = output_root / build_run_folder_name(profile)
    crt_dir = run_root / "CRT"
    facturas_out_dir = run_root / "FACTURAS"
    zc_dir = run_root / "ZC"

    for path in (crt_dir, facturas_out_dir, zc_dir):
        path.mkdir(parents=True, exist_ok=True)

    return run_root, crt_dir, facturas_out_dir, zc_dir


def stage_files(source_paths: list[Path], target_dir: Path) -> list[Path]:
    staged_paths: list[Path] = []
    for source_path in source_paths:
        target_path = target_dir / source_path.name
        shutil.copy2(source_path, target_path)
        staged_paths.append(target_path)
    return staged_paths


def cleanup_output_root(output_root: Path, keep_dir: Path) -> list[str]:
    actions: list[str] = []
    if not output_root.exists() or not output_root.is_dir():
        return actions

    keep_resolved = keep_dir.resolve()
    for entry in sorted(output_root.iterdir(), key=lambda path: path.name.lower()):
        try:
            if entry.resolve() == keep_resolved:
                continue
        except FileNotFoundError:
            continue

        if entry.is_dir():
            shutil.rmtree(entry)
            actions.append(f"Eliminada carpeta: {entry}")
        else:
            entry.unlink()
            actions.append(f"Eliminado archivo: {entry}")

    return actions


def scale_hotspot(bounds: tuple[int, int, int, int], width: int, height: int) -> tuple[int, int, int, int]:
    src_width, src_height = STARTUP_ART_SIZE
    left, top, right, bottom = bounds
    return (
        round(left * width / src_width),
        round(top * height / src_height),
        round(right * width / src_width),
        round(bottom * height / src_height),
    )


def create_pdf(images: list[Path], output_path: Path) -> None:
    pdf = canvas.Canvas(str(output_path), pagesize=A4)
    page_width, page_height = A4
    margin = 28.35
    gap = 8
    max_width = page_width - (margin * 2)
    y = page_height - margin

    for image_path in images:
        with Image.open(image_path) as image:
            image_width, image_height = image.size

        max_height = y - margin
        scale = min(max_width / image_width, max_height / image_height)
        display_width = image_width * scale
        display_height = image_height * scale

        if display_height > max_height:
            pdf.showPage()
            y = page_height - margin
            max_height = y - margin
            scale = min(max_width / image_width, max_height / image_height)
            display_width = image_width * scale
            display_height = image_height * scale

        x = (page_width - display_width) / 2
        pdf.drawImage(
            ImageReader(str(image_path)),
            x,
            y - display_height,
            width=display_width,
            height=display_height,
            preserveAspectRatio=True,
            mask="auto",
        )
        y -= display_height + gap

    pdf.save()


def generate_documents(
    input_dir: Path,
    facturas_dir: Path,
    crt_dir: Path,
    output_dir: Path,
    max_groups: int,
    profile: str = DEFAULT_PROFILE,
) -> tuple[int, list[str], list[Path], Path | None]:
    logs: list[str] = []
    generated_paths: list[Path] = []
    profile = normalize_profile(profile)

    if not input_dir.exists() or not input_dir.is_dir():
        return 1, [f"ERROR: La carpeta de capturas no existe: {input_dir}"], [], None

    image_groups, warnings, mode_detail = collect_image_groups(input_dir)
    logs.append(f"Perfil activo: {PROFILE_LABELS[profile]} — {PROFILE_DESCRIPTIONS[profile]}")
    logs.append(mode_detail)

    if not image_groups:
        return 1, ["ERROR: No encontre grupos completos de tres imagenes."], [], None

    if max_groups > 0:
        image_groups = image_groups[:max_groups]
        logs.append(f"Limite aplicado: {len(image_groups)} ZC.")

    facturas, factura_warnings = collect_facturas(facturas_dir, profile=profile)
    warnings.extend(factura_warnings)
    crt_pdfs, crt_warnings = collect_crt_pdfs(crt_dir)
    warnings.extend(crt_warnings)
    if facturas and len(facturas) < len(image_groups):
        warnings.append(
            f"Hay menos facturas que grupos de capturas: {len(image_groups)} grupos, {len(facturas)} facturas."
        )
    if not crt_pdfs:
        warnings.append("No encontre PDFs CRT para copiar a la corrida.")
    elif len(crt_pdfs) < len(image_groups):
        warnings.append(
            f"Hay menos PDFs CRT que grupos de capturas: {len(image_groups)} grupos, {len(crt_pdfs)} CRT."
        )

    run_root, crt_dir, facturas_out_dir, zc_dir = prepare_run_directories(output_dir, profile)
    stage_files([factura.path for factura in facturas[: len(image_groups)]], facturas_out_dir)
    stage_files(crt_pdfs[: len(image_groups)], crt_dir)

    logs.append(f"Carpeta de corrida: {run_root}")
    logs.append(f"CRT: {crt_dir}")
    logs.append(f"FACTURAS: {facturas_out_dir}")
    logs.append(f"ZC: {zc_dir}")

    generated = 0
    for index, image_group in enumerate(image_groups):
        images = image_group.images
        factura = facturas[index] if index < len(facturas) else None
        if factura:
            output_stem = factura.document_stem
            source_detail = f"{factura.path.name} | ZC {factura.zc_raw} | DUA {factura.dua} | CRT {factura.crt}"
        else:
            output_stem = f"ZC_{normalize_char_for_filename(image_group.label)}"
            source_detail = "sin factura asociada"

        pdf_path = zc_dir / f"{output_stem}.pdf"
        create_pdf(images, pdf_path)
        generated_paths.append(pdf_path)
        generated += 1
        logs.append(
            f"OK: {pdf_path.name} <- "
            + ", ".join(image.name for image in images)
            + f" ({image_group.source} | {source_detail})"
        )

    if warnings:
        logs.append("")
        logs.append("Advertencias:")
        logs.extend(f"- {warning}" for warning in warnings)

    cleanup_actions = cleanup_output_root(output_dir, run_root)
    if cleanup_actions:
        logs.append("")
        logs.append("Limpieza de carpeta base:")
        logs.extend(f"- {action}" for action in cleanup_actions)

    logs.append("")
    logs.append(f"Documentos generados: {generated}")
    logs.append(f"Carpeta de salida: {run_root}")
    return 0, logs, generated_paths, run_root


def launch_gui() -> int:
    import os
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk
    from PIL import ImageTk

    root = tk.Tk()
    root.title("Generar ZC PDF")
    root.minsize(1200, 720)
    try:
        root.state("zoomed")
    except tk.TclError:
        root.geometry("1600x900")

    root.columnconfigure(0, weight=1)
    root.rowconfigure(0, weight=1)

    style = ttk.Style(root)
    try:
        style.theme_use("clam")
    except tk.TclError:
        pass

    style.configure("Title.TLabel", font=("Segoe UI", 18, "bold"))
    style.configure("Subtitle.TLabel", font=("Segoe UI", 10))
    style.configure("Mode.TLabel", font=("Segoe UI", 12, "bold"))

    current_profile = {"value": DEFAULT_PROFILE}
    last_generated_paths = {"value": [], "run_root": None}
    input_var = tk.StringVar(value=str(DEFAULT_INPUT_DIR))
    facturas_var = tk.StringVar(value=str(DEFAULT_FACTURAS_DIR))
    crt_var = tk.StringVar(value=str(DEFAULT_CRT_DIR))
    output_var = tk.StringVar(value=str(DEFAULT_OUTPUT_DIR))
    max_groups_var = tk.StringVar(value="1")
    logo_images: dict[str, object] = {}

    splash_frame = ttk.Frame(root, padding=28)
    splash_frame.grid(row=0, column=0, sticky="nsew")
    splash_frame.columnconfigure(0, weight=1)
    splash_frame.columnconfigure(1, weight=1)
    splash_frame.rowconfigure(2, weight=1)

    main_frame = ttk.Frame(root, padding=18)
    main_frame.columnconfigure(0, weight=1)
    main_frame.rowconfigure(2, weight=1)

    def browse_folder(variable: tk.StringVar, title: str) -> None:
        initial = variable.get()
        selected = filedialog.askdirectory(
            title=title,
            initialdir=initial if initial and Path(initial).exists() else str(Path.home()),
        )
        if selected:
            variable.set(selected)

    def clear_frame(frame: ttk.Frame) -> None:
        for child in frame.winfo_children():
            child.destroy()

    splash_canvas_state = {
        "background": None,
        "photo": None,
        "background_id": None,
        "hotspots": {},
    }

    def find_logo(profile: str) -> Path | None:
        profile = normalize_profile(profile)
        candidates = {
            PROFILE_OLAVERRY: [
                ASSET_DIR / "olaverry.png",
                ASSET_DIR / "olaverry.jpg",
                ASSET_DIR / "olaverry.jpeg",
                ASSET_DIR / "logo_olaverry.png",
            ],
            PROFILE_BONJOUR: [
                ASSET_DIR / "bt.png",
                ASSET_DIR / "bt.jpg",
                ASSET_DIR / "bt.jpeg",
                ASSET_DIR / "bonjour.png",
                ASSET_DIR / "logo_bt.png",
            ],
        }
        for candidate in candidates[profile]:
            if candidate.exists():
                return candidate
        return None

    def render_splash_art() -> None:
        clear_frame(splash_frame)
        clear_frame(main_frame)
        main_frame.grid_remove()
        splash_frame.grid()

        splash_canvas_state["background_id"] = None
        splash_canvas_state["hotspots"] = {}

        canvas = tk.Canvas(splash_frame, highlightthickness=0, bd=0, bg="#c6c6c6")
        canvas.pack(fill="both", expand=True)

        if splash_canvas_state["background"] is None:
            splash_canvas_state["background"] = Image.open(STARTUP_ART_PATH).convert("RGBA")

        def ensure_hotspot(profile: str) -> None:
            hotspot_id = splash_canvas_state["hotspots"].get(profile)
            if hotspot_id is None:
                x1, y1, x2, y2 = STARTUP_ART_HOTSPOTS[profile]
                hotspot_id = canvas.create_rectangle(
                    x1,
                    y1,
                    x2,
                    y2,
                    outline="",
                    fill="",
                    tags=(f"hotspot-{profile}",),
                )
                splash_canvas_state["hotspots"][profile] = hotspot_id

            canvas.coords(hotspot_id, *scale_hotspot(STARTUP_ART_HOTSPOTS[profile], canvas.winfo_width(), canvas.winfo_height()))

        def profile_at(x: int, y: int) -> str | None:
            for profile, bounds in STARTUP_ART_HOTSPOTS.items():
                left, top, right, bottom = scale_hotspot(bounds, canvas.winfo_width(), canvas.winfo_height())
                if left <= x <= right and top <= y <= bottom:
                    return profile
            return None

        def on_motion(event: tk.Event) -> None:
            canvas.config(cursor="hand2" if profile_at(event.x, event.y) else "")

        def on_click(event: tk.Event) -> None:
            profile = profile_at(event.x, event.y)
            if profile:
                activate_profile(profile)

        def redraw(_event: tk.Event | None = None) -> None:
            width = max(1, canvas.winfo_width())
            height = max(1, canvas.winfo_height())
            background = splash_canvas_state["background"]
            if background is None:
                return

            resized = background.resize((width, height), Image.Resampling.LANCZOS)
            photo = ImageTk.PhotoImage(resized)
            splash_canvas_state["photo"] = photo

            if splash_canvas_state["background_id"] is None:
                splash_canvas_state["background_id"] = canvas.create_image(0, 0, anchor="nw", image=photo)
                canvas.tag_lower(splash_canvas_state["background_id"])
            else:
                canvas.itemconfig(splash_canvas_state["background_id"], image=photo)
                canvas.coords(splash_canvas_state["background_id"], 0, 0)
                canvas.tag_lower(splash_canvas_state["background_id"])

            for profile in (PROFILE_OLAVERRY, PROFILE_BONJOUR):
                ensure_hotspot(profile)

        canvas.bind("<Configure>", redraw)
        canvas.bind("<Motion>", on_motion)
        canvas.bind("<Leave>", lambda _event: canvas.config(cursor=""))
        canvas.bind("<Button-1>", on_click)
        canvas.after(0, redraw)

    def render_splash() -> None:
        if STARTUP_ART_PATH.exists():
            render_splash_art()
            return

        clear_frame(splash_frame)
        clear_frame(main_frame)
        main_frame.grid_remove()
        splash_frame.grid()

        ttk.Label(splash_frame, text="Generador de ZC", style="Title.TLabel").grid(row=0, column=0, columnspan=2, sticky="w")
        ttk.Label(
            splash_frame,
            text="Elegí el flujo inicial. OLAVERRY normaliza el CRT para el nombre compuesto; Bonjour conserva el flujo estable.",
            style="Subtitle.TLabel",
        ).grid(row=1, column=0, columnspan=2, sticky="w", pady=(6, 18))

        cards = ttk.Frame(splash_frame)
        cards.grid(row=2, column=0, columnspan=2, sticky="nsew")
        cards.columnconfigure(0, weight=1, uniform="mode")
        cards.columnconfigure(1, weight=1, uniform="mode")
        cards.rowconfigure(0, weight=1)

        def make_card(col: int, profile: str, accent: str, headline: str, description: str) -> None:
            logo_path = find_logo(profile)
            if logo_path:
                with Image.open(logo_path) as image:
                    image.thumbnail((320, 160))
                    logo = ImageTk.PhotoImage(image)
                logo_images[profile] = logo
                card = tk.Button(
                    cards,
                    image=logo,
                    compound="top",
                    text=f"{headline}\n\n{description}",
                    command=lambda p=profile: activate_profile(p),
                    font=("Segoe UI", 13, "bold"),
                    justify="center",
                    wraplength=280,
                    bg=accent,
                    fg="white",
                    activebackground=accent,
                    activeforeground="white",
                    relief="raised",
                    bd=2,
                    padx=18,
                    pady=18,
                )
            else:
                card = tk.Button(
                    cards,
                    text=f"{headline}\n\n{description}",
                    command=lambda p=profile: activate_profile(p),
                    font=("Segoe UI", 15, "bold"),
                    justify="center",
                    wraplength=280,
                    bg=accent,
                    fg="white",
                    activebackground=accent,
                    activeforeground="white",
                    relief="raised",
                    bd=2,
                    padx=18,
                    pady=28,
                )
            card.grid(row=0, column=col, sticky="nsew", padx=12, pady=12, ipadx=10, ipady=12)

        make_card(
            0,
            PROFILE_OLAVERRY,
            "#165a95",
            "OLAVERRY",
            "Factura + CRT\nNombre compuesto corregido\nZC26000398_DUA_784702_CRT_AR148726497",
        )
        make_card(
            1,
            PROFILE_BONJOUR,
            "#1d7a4a",
            "Bonjour",
            "Flujo que ya funciona bien\nMantiene la lógica actual\nIdeal para seguir operando",
        )

        ttk.Label(
            splash_frame,
            text="Si luego querés cambiar el flujo, podés volver desde la pantalla principal.",
            style="Subtitle.TLabel",
        ).grid(row=3, column=0, columnspan=2, sticky="w", pady=(12, 0))

    def render_main(profile: str) -> None:
        clear_frame(main_frame)
        splash_frame.grid_remove()
        main_frame.grid(row=0, column=0, sticky="nsew")
        current_profile["value"] = normalize_profile(profile)

        header = ttk.Frame(main_frame)
        header.grid(row=0, column=0, sticky="ew")
        header.columnconfigure(0, weight=1)
        header.columnconfigure(1, weight=0)

        ttk.Label(header, text=f"Modo activo: {PROFILE_LABELS[current_profile['value']]}", style="Title.TLabel").grid(
            row=0, column=0, sticky="w"
        )
        ttk.Label(
            header,
            text=PROFILE_DESCRIPTIONS[current_profile["value"]],
            style="Subtitle.TLabel",
        ).grid(row=1, column=0, sticky="w", pady=(2, 0))

        def back_to_modes() -> None:
            render_splash()

        ttk.Button(header, text="Cambiar modo", command=back_to_modes).grid(row=0, column=1, rowspan=2, sticky="e")

        form = ttk.Frame(main_frame, padding=(0, 18, 0, 14))
        form.grid(row=1, column=0, sticky="ew")
        form.columnconfigure(1, weight=1)

        rows = [
            ("Carpeta de capturas", input_var, "Seleccionar carpeta de capturas"),
            ("Carpeta de facturas", facturas_var, "Seleccionar carpeta de facturas"),
            ("Carpeta de CRT", crt_var, "Seleccionar carpeta de CRT"),
            ("Carpeta base de salida", output_var, "Seleccionar carpeta base de salida"),
        ]
        for row_index, (label, variable, dialog_title) in enumerate(rows):
            ttk.Label(form, text=label).grid(row=row_index, column=0, sticky="w", padx=(0, 10), pady=5)
            ttk.Entry(form, textvariable=variable).grid(row=row_index, column=1, sticky="ew", pady=5)
            ttk.Button(
                form,
                text="Seleccionar...",
                command=lambda var=variable, title=dialog_title: browse_folder(var, title),
            ).grid(row=row_index, column=2, sticky="e", padx=(10, 0), pady=5)

        ttk.Label(form, text="Cantidad de ZC").grid(row=3, column=0, sticky="w", padx=(0, 10), pady=(8, 0))
        group_frame = ttk.Frame(form)
        group_frame.grid(row=3, column=1, sticky="w", pady=(8, 0))
        ttk.Spinbox(group_frame, from_=0, to=999, width=8, textvariable=max_groups_var).grid(row=0, column=0, sticky="w")
        ttk.Label(group_frame, text="0 = todos").grid(row=0, column=1, sticky="w", padx=(10, 0))

        log_frame = ttk.Frame(main_frame)
        log_frame.grid(row=2, column=0, sticky="nsew")
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)

        log_text = tk.Text(log_frame, height=14, wrap="word")
        scrollbar = ttk.Scrollbar(log_frame, orient="vertical", command=log_text.yview)
        log_text.configure(yscrollcommand=scrollbar.set)
        log_text.grid(row=0, column=0, sticky="nsew")
        scrollbar.grid(row=0, column=1, sticky="ns")

        button_frame = ttk.Frame(main_frame, padding=(0, 14, 0, 0))
        button_frame.grid(row=3, column=0, sticky="ew")
        button_frame.columnconfigure(0, weight=1)

        def write_log(lines: list[str]) -> None:
            log_text.delete("1.0", tk.END)
            log_text.insert(tk.END, "\n".join(lines))
            log_text.see(tk.END)

        def create_email_draft() -> None:
            generated_paths = list(last_generated_paths["value"])
            if not generated_paths:
                messagebox.showwarning("Sin PDFs generados", "Primero generá al menos un ZC para preparar el correo.")
                return

            try:
                run_root = last_generated_paths["run_root"] or Path(output_var.get()).expanduser().resolve()
                eml_path, subject = build_email_draft(run_root, generated_paths, current_profile["value"])
                messagebox.showinfo(
                    "Correo preparado",
                    f"Se creó el borrador de correo:\n{eml_path}\n\nAsunto: {subject}\nDestinatarios: {', '.join(EMAIL_RECIPIENTS)}",
                )
                try:
                    os.startfile(str(eml_path))
                except Exception:
                    pass
            except Exception as exc:
                messagebox.showerror("Error al preparar correo", str(exc))

        def open_output_folder() -> None:
            output_path = last_generated_paths["run_root"]
            if output_path is None or not output_path.exists():
                messagebox.showwarning("Carpeta no disponible", "La carpeta de salida todavía no existe.")
                return
            os.startfile(str(output_path))

        def generate_from_ui() -> None:
            generate_button.configure(state="disabled")
            try:
                max_groups = int(max_groups_var.get().strip() or "0")
                if max_groups < 0:
                    raise ValueError("La cantidad de ZC no puede ser negativa.")

                status, logs, generated_paths, run_root = generate_documents(
                    input_dir=Path(input_var.get()).expanduser().resolve(),
                    facturas_dir=Path(facturas_var.get()).expanduser().resolve(),
                    crt_dir=Path(crt_var.get()).expanduser().resolve(),
                    output_dir=Path(output_var.get()).expanduser().resolve(),
                    max_groups=max_groups,
                    profile=current_profile["value"],
                )
                last_generated_paths["value"] = generated_paths
                last_generated_paths["run_root"] = run_root
                write_log(logs)
                if status == 0:
                    try:
                        eml_path, subject = build_email_draft(
                            run_root if run_root is not None else Path(output_var.get()).expanduser().resolve(),
                            generated_paths,
                            current_profile["value"],
                        )
                        logs.append("")
                        logs.append(f"Borrador de correo: {eml_path}")
                        logs.append(f"Asunto: {subject}")
                        write_log(logs)
                    except Exception as exc:
                        logs.append("")
                        logs.append(f"Advertencia al preparar correo: {exc}")
                        write_log(logs)
                    messagebox.showinfo("Generación completa", "Se generaron los ZC PDF correctamente.")
                else:
                    messagebox.showerror("Error", "\n".join(logs[:3]))
            except Exception as exc:
                write_log([f"ERROR: {exc}"])
                messagebox.showerror("Error inesperado", str(exc))
            finally:
                generate_button.configure(state="normal")

        ttk.Button(button_frame, text="Abrir carpeta de salida", command=open_output_folder).grid(row=0, column=0, sticky="w")
        generate_button = ttk.Button(button_frame, text="Generar PDF", command=generate_from_ui)
        generate_button.grid(row=0, column=1, sticky="e", padx=(10, 0))
        ttk.Button(button_frame, text="Preparar correo", command=create_email_draft).grid(row=0, column=2, sticky="e", padx=(10, 0))

        write_log(
            [
                f"Modo activo: {PROFILE_LABELS[current_profile['value']]}",
                f"{PROFILE_DESCRIPTIONS[current_profile['value']]}",
                "Listo para generar ZC PDF.",
                "De forma automática toma primero las capturas sin renombrar ordenadas por fecha.",
                "La cantidad de ZC por defecto es 1.",
                "Luego puede preparar un borrador de correo con destinatarios, asunto y adjuntos.",
            ]
        )

    def activate_profile(profile: str) -> None:
        render_main(profile)

    render_splash()
    root.mainloop()
    return 0


def main() -> int:
    if len(sys.argv) == 1:
        return launch_gui()

    import argparse

    parser = argparse.ArgumentParser(description="Genera PDF de ZC desde capturas y facturas.")
    parser.add_argument("--input", default=str(DEFAULT_INPUT_DIR))
    parser.add_argument("--facturas", default=str(DEFAULT_FACTURAS_DIR))
    parser.add_argument("--crt", default=str(DEFAULT_CRT_DIR))
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT_DIR))
    parser.add_argument("--max-groups", type=int, default=1)
    parser.add_argument("--profile", choices=sorted(PROFILE_LABELS.keys()), default=DEFAULT_PROFILE)
    args = parser.parse_args()

    status, logs, _generated_paths, _run_root = generate_documents(
        input_dir=Path(args.input).expanduser().resolve(),
        facturas_dir=Path(args.facturas).expanduser().resolve(),
        crt_dir=Path(args.crt).expanduser().resolve(),
        output_dir=Path(args.output).expanduser().resolve(),
        max_groups=args.max_groups,
        profile=args.profile,
    )
    for line in logs:
        print(line)
    return status


if __name__ == "__main__":
    raise SystemExit(main())
