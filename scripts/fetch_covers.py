"""Download public Apple Music artwork for the local static app.

Run from the SYC128 directory:
    python scripts/fetch_covers.py
The script never runs in the browser; downloaded covers are served locally.
"""
from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SONGS_JS = ROOT / "songs.js"
OUT = ROOT / "assets" / "covers"
OUT.mkdir(parents=True, exist_ok=True)

ROW = re.compile(r'^\s*\["([^"]+)",\s*"([^"]+)",\s*"(album|single|ost|live|variety|other)"', re.M)


def load_songs() -> list[tuple[str, str, str]]:
    return ROW.findall(SONGS_JS.read_text(encoding="utf-8"))


def artwork_for(title: str, source: str) -> tuple[str | None, dict | None]:
    clean_title = re.sub(r"（Live）$", "", title)
    if source == "album" and clean_title in {
        "雨后日记", "勇敢额度", "空耳", "另一种答案", "Tell Me", "匿名星", "失焦", "Forever In You", "Gray Turns To May", "你好快乐"
    }:
        term = "单依纯 勇敢额度"
    elif source == "album":
        term = "单依纯 纯妹妹"
    elif source == "live":
        term = f"单依纯 {clean_title} Live"
    else:
        term = f"单依纯 {clean_title}"
    params = urllib.parse.urlencode({"term": term, "country": "CN", "media": "music", "entity": "song", "limit": 20})
    request = urllib.request.Request(
        f"https://itunes.apple.com/search?{params}",
        headers={"User-Agent": "Dan-Island-Odyssey-Cover-Fetcher/1.0"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = json.load(response)
    results = payload.get("results", [])
    preferred = [item for item in results if "单依纯" in item.get("artistName", "") or "Shan Yi Chun" in item.get("artistName", "")]
    if source == "album":
        item = (preferred or results or [None])[0]
    else:
        def normalized(value: str) -> str:
            value = re.sub(r"\([^)]*\)|（[^）]*）", "", value).lower()
            return re.sub(r"[^0-9a-z\u4e00-\u9fff]", "", value)

        wanted = normalized(clean_title)
        matches = [item for item in preferred if wanted and (wanted in normalized(item.get("trackName", "")) or normalized(item.get("trackName", "")) in wanted)]
        item = (matches or [None])[0]
    if not item:
        return None, None
    url = item.get("artworkUrl100")
    if not url:
        return None, item
    return url.replace("100x100bb", "600x600bb"), item


def main() -> None:
    manifest_path = OUT / "manifest.json"
    try:
        previous: dict[str, dict] = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        previous = {}
    manifest: dict[str, dict] = {}
    for index, (song_id, title, source) in enumerate(load_songs(), 1):
        target = OUT / f"{song_id}.jpg"
        if target.exists() and song_id in previous and "error" not in previous[song_id]:
            manifest[song_id] = previous[song_id]
            print(f"[{index:03d}] KEEP {title}")
            continue
        try:
            url, item = artwork_for(title, source)
            if not url:
                raise RuntimeError("no artwork result")
            request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(request, timeout=25) as response:
                data = response.read()
            if len(data) < 4_000:
                raise RuntimeError("artwork response too small")
            target.write_bytes(data)
            manifest[song_id] = {
                "file": f"assets/covers/{song_id}.jpg",
                "source": "Apple Music / iTunes Search API",
                "track": item.get("trackName") if item else None,
                "collection": item.get("collectionName") if item else None,
                "artworkUrl": url,
            }
            print(f"[{index:02d}] OK   {title}")
        except Exception as exc:  # keep the build usable with vector fallback
            if target.exists():
                target.unlink()
            manifest[song_id] = {"file": "assets/cover-fallback.svg", "error": str(exc)}
            print(f"[{index:02d}] MISS {title}: {exc}")
        time.sleep(0.08)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    success = sum(1 for item in manifest.values() if "error" not in item)
    print(f"Downloaded {success}/{len(manifest)} covers")


if __name__ == "__main__":
    main()
