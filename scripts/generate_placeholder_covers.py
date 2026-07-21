"""Generate deterministic JPG placeholders for unresolved catalog cover paths.

Existing artwork is never overwritten. Shared PROGRAM_COVER_IDS mappings remain
unchanged; their placeholder names the shared collection instead of one song.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SONGS_JS = ROOT / "songs.js"
COVERS = ROOT / "assets" / "covers"
INDEX = COVERS / "placeholder-covers.json"
SIZE = 600

ROW = re.compile(
    r'^\s*\["([^"]+)",\s*"([^"]+)",\s*"(album|single|ost|live|variety|other)",'
    r'\s*"(?:solo|collab)",\s*"[^"]+",\s*"([^"]+)"',
    re.M,
)
PROGRAM_BLOCK = re.compile(r"const PROGRAM_COVER_IDS = \{(.*?)\n\};", re.S)
PROGRAM_ROW = re.compile(r'^\s*"([^"]+)":\s*"([^"]+)"', re.M)

PALETTES = {
    "album": ("#7664b8", "#e5dff8", "#f8f6ff"),
    "single": ("#4778b8", "#dce9f7", "#f7fbff"),
    "ost": ("#378aa3", "#d8eef2", "#f5fcfc"),
    "variety": ("#5a936f", "#deeedf", "#f7fcf6"),
    "live": ("#bd627b", "#f3dce3", "#fff8fa"),
    "other": ("#a7794e", "#f1e2d2", "#fffaf4"),
}


def font_path() -> Path:
    candidates = [
        Path(r"C:\Windows\Fonts\msyhbd.ttc"),
        Path(r"C:\Windows\Fonts\msyh.ttc"),
        Path(r"C:\Windows\Fonts\simhei.ttf"),
    ]
    return next((path for path in candidates if path.exists()), candidates[-1])


FONT = font_path()


def load_catalog() -> tuple[list[dict], dict[str, str]]:
    source = SONGS_JS.read_text(encoding="utf-8")
    songs = [
        {"id": song_id, "title": title, "source": kind, "release": release}
        for song_id, title, kind, release in ROW.findall(source)
    ]
    block = PROGRAM_BLOCK.search(source)
    mappings = dict(PROGRAM_ROW.findall(block.group(1))) if block else {}
    return songs, mappings


def rgb(hex_color: str) -> tuple[int, int, int]:
    return tuple(int(hex_color[index:index + 2], 16) for index in (1, 3, 5))


def text_width(draw: ImageDraw.ImageDraw, value: str, font: ImageFont.FreeTypeFont) -> float:
    box = draw.textbbox((0, 0), value, font=font)
    return box[2] - box[0]


def wrap_title(draw: ImageDraw.ImageDraw, title: str) -> tuple[list[str], ImageFont.FreeTypeFont]:
    for size in range(88, 47, -2):
        font = ImageFont.truetype(str(FONT), size)
        lines: list[str] = []
        current = ""
        for character in title:
            candidate = current + character
            if current and text_width(draw, candidate, font) > 480:
                lines.append(current.strip())
                current = character.lstrip()
            else:
                current = candidate
        if current:
            lines.append(current.strip())
        if len(lines) <= 2:
            return lines, font
    return [title], ImageFont.truetype(str(FONT), 48)


def clean_release(release: str) -> str:
    match = re.search(r"《([^》]+)》", release)
    return match.group(1) if match else release


def draw_placeholder(target: Path, label: str, source: str, shared: bool, song_count: int) -> None:
    accent_hex, soft_hex, paper_hex = PALETTES.get(source, PALETTES["other"])
    accent, soft, paper = rgb(accent_hex), rgb(soft_hex), rgb(paper_hex)
    image = Image.new("RGB", (SIZE, SIZE), paper)
    draw = ImageDraw.Draw(image)

    # Quiet editorial texture; deterministic so regenerated files stay stable.
    seed = int(hashlib.sha1(target.stem.encode("utf-8")).hexdigest()[:8], 16)
    for offset in range(-420, 780, 38):
        draw.line((offset, 600, offset + 430, 0), fill=soft, width=2)
    draw.ellipse((-110, -95, 250, 265), fill=soft)
    draw.ellipse((430, 410, 700, 680), fill=soft)
    draw.rounded_rectangle((32, 32, 568, 568), radius=28, outline=accent, width=3)
    draw.rounded_rectangle((48, 48, 552, 552), radius=22, outline=(255, 255, 255), width=2)

    eyebrow = ImageFont.truetype(str(FONT), 18)
    small = ImageFont.truetype(str(FONT), 21)
    meta = ImageFont.truetype(str(FONT), 17)
    draw.text((64, 74), "EGG ISLAND · PLACEHOLDER", font=eyebrow, fill=accent)
    draw.rounded_rectangle((64, 112, 190 if not shared else 238, 150), radius=19, fill=accent)
    badge = "待替换封面" if not shared else "节目共用封面"
    draw.text((127 if not shared else 151, 131), badge, font=meta, fill=(255, 255, 255), anchor="mm")

    lines, title_font = wrap_title(draw, label)
    line_height = title_font.size + 12
    start_y = 280 - (len(lines) - 1) * line_height / 2
    for index, line in enumerate(lines):
        draw.text((300, start_y + index * line_height), line, font=title_font, fill=(35, 48, 40), anchor="mm")

    if shared:
        detail = f"当前供 {song_count} 首歌曲共用"
    else:
        detail = "将真实封面覆盖到这个同名文件"
    draw.text((300, 418), detail, font=small, fill=accent, anchor="mm")
    draw.line((120, 458, 480, 458), fill=accent, width=2)
    draw.text((300, 493), f"文件：{target.name}", font=meta, fill=(84, 98, 89), anchor="mm")
    draw.text((300, 526), "600 × 600 JPG · 可直接替换", font=meta, fill=(105, 116, 108), anchor="mm")

    # A tiny unique mark helps distinguish placeholders at thumbnail size.
    dot_x = 510 + seed % 13
    draw.ellipse((dot_x, 75, dot_x + 14, 89), fill=accent)
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, "JPEG", quality=92, optimize=True, progressive=True)


def main() -> None:
    songs, mappings = load_catalog()
    try:
        index_data = json.loads(INDEX.read_text(encoding="utf-8"))
        previous = index_data.get("generated", [])
        use_default = set(index_data.get("useDefault", []))
    except (FileNotFoundError, json.JSONDecodeError):
        previous = []
        use_default = set()
    indexed = {
        entry["file"]: entry
        for entry in previous
        if isinstance(entry, dict) and entry.get("file") and (COVERS / entry["file"]).exists()
    }
    by_cover: dict[str, list[dict]] = {}
    for song in songs:
        cover_id = mappings.get(song["release"], song["id"])
        by_cover.setdefault(cover_id, []).append(song)

    created: list[dict] = []
    for cover_id, users in sorted(by_cover.items()):
        if cover_id in use_default:
            continue
        target = COVERS / f"{cover_id}.jpg"
        if target.exists():
            continue
        shared = len(users) > 1
        label = clean_release(users[0]["release"]) if shared else users[0]["title"]
        draw_placeholder(target, label, users[0]["source"], shared, len(users))
        created.append({
            "file": target.name,
            "label": label,
            "shared": shared,
            "songs": [song["title"] for song in users],
        })
        indexed[target.name] = created[-1]
        print(f"CREATED {target.name}: {label}")

    entries = [indexed[name] for name in sorted(indexed)]
    INDEX.write_text(json.dumps({"generated": entries, "useDefault": sorted(use_default)}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {len(created)} new placeholders; {len(entries)} placeholders indexed. Existing artwork was not changed.")


if __name__ == "__main__":
    main()
