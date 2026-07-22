"""Build browser-ready song embeddings from locally licensed source material.

Audio and lyrics stay on the maintainer's machine. Only normalized, reduced
vectors are written to song-vectors.js.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate DAN_ISLAND song vectors")
    parser.add_argument("manifest", type=Path, help="JSON list containing id/audio/lyrics or lyrics_file")
    parser.add_argument("--output", type=Path, default=Path("song-vectors.js"))
    parser.add_argument("--clap-checkpoint", type=Path, required=True, help="LAION-CLAP music checkpoint")
    parser.add_argument("--dimensions", type=int, default=64, help="PCA dimensions per embedding modality")
    return parser.parse_args()


def acoustic_features(librosa, audio_path: Path) -> list[float]:
    import numpy as np

    y, sample_rate = librosa.load(audio_path, sr=22050, mono=True)
    harmonic, percussive = librosa.effects.hpss(y)
    tempo = float(librosa.feature.tempo(y=y, sr=sample_rate)[0])
    rms = librosa.feature.rms(y=y)
    centroid = librosa.feature.spectral_centroid(y=y, sr=sample_rate)
    bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sample_rate)
    contrast = librosa.feature.spectral_contrast(y=y, sr=sample_rate)
    zcr = librosa.feature.zero_crossing_rate(y)
    chroma = librosa.feature.chroma_cqt(y=harmonic, sr=sample_rate)
    onset = librosa.onset.onset_strength(y=percussive, sr=sample_rate)
    return [
        tempo,
        float(np.mean(rms)),
        float(np.std(rms)),
        float(np.mean(centroid)),
        float(np.mean(bandwidth)),
        float(np.mean(contrast)),
        float(np.mean(zcr)),
        float(np.std(chroma)),
        float(np.mean(onset)),
        float(np.std(onset)),
    ]


def reduced_normalized(values, dimensions: int):
    import numpy as np
    from sklearn.decomposition import PCA
    from sklearn.preprocessing import normalize

    matrix = np.asarray(values, dtype=np.float32)
    if matrix.shape[0] > 1 and matrix.shape[1] > dimensions:
        component_count = min(dimensions, matrix.shape[0] - 1, matrix.shape[1])
        matrix = PCA(n_components=component_count, random_state=42).fit_transform(matrix)
    return normalize(matrix).astype(np.float32)


def read_lyrics(item: dict, manifest_dir: Path) -> str:
    if item.get("lyrics"):
        return str(item["lyrics"])
    if item.get("lyrics_file"):
        path = Path(item["lyrics_file"])
        if not path.is_absolute():
            path = manifest_dir / path
        return path.read_text(encoding="utf-8")
    return ""


def main() -> None:
    args = parse_args()
    try:
        import laion_clap
        import librosa
        import numpy as np
        from sentence_transformers import SentenceTransformer
        from sklearn.preprocessing import StandardScaler
    except ImportError as error:
        raise SystemExit(
            "Missing analysis packages. Install laion-clap, librosa, "
            "sentence-transformers and scikit-learn in a dedicated Python environment."
        ) from error

    manifest_path = args.manifest.resolve()
    items = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(items, list) or not items:
        raise SystemExit("Manifest must be a non-empty JSON list")

    seen = set()
    rows = []
    for item in items:
        song_id = str(item.get("id", "")).strip()
        if not song_id or song_id in seen:
            raise SystemExit(f"Missing or duplicate song id: {song_id!r}")
        audio_path = Path(item.get("audio", ""))
        if not audio_path.is_absolute():
            audio_path = manifest_path.parent / audio_path
        if not audio_path.is_file():
            raise SystemExit(f"Audio file does not exist for {song_id}: {audio_path}")
        seen.add(song_id)
        rows.append({"id": song_id, "audio": audio_path.resolve(), "lyrics": read_lyrics(item, manifest_path.parent)})

    clap = laion_clap.CLAP_Module(enable_fusion=False, amodel="HTSAT-base")
    clap.load_ckpt(str(args.clap_checkpoint.resolve()))
    audio_vectors = clap.get_audio_embedding_from_filelist(
        x=[str(row["audio"]) for row in rows], use_tensor=False
    )

    lyric_model = SentenceTransformer("BAAI/bge-m3")
    lyric_vectors = lyric_model.encode(
        [row["lyrics"] or "无歌词文本" for row in rows],
        normalize_embeddings=True,
        show_progress_bar=True,
    )
    acoustic = np.asarray([acoustic_features(librosa, row["audio"]) for row in rows], dtype=np.float32)
    acoustic = StandardScaler().fit_transform(acoustic)

    audio_vectors = reduced_normalized(audio_vectors, args.dimensions)
    lyric_vectors = reduced_normalized(lyric_vectors, args.dimensions)
    acoustic = reduced_normalized(acoustic, acoustic.shape[1])

    output = {
        row["id"]: {
            "audio": [round(float(value), 6) for value in audio_vectors[index]],
            "lyrics": [round(float(value), 6) for value in lyric_vectors[index]],
            "features": [round(float(value), 6) for value in acoustic[index]],
        }
        for index, row in enumerate(rows)
    }
    args.output.write_text(
        "// Generated by scripts/analyze_song_vectors.py; source audio and lyrics are not included.\n"
        f"window.SONG_VECTOR_DATA = {json.dumps(output, ensure_ascii=False, separators=(',', ':'))};\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(output)} song vectors to {args.output}")


if __name__ == "__main__":
    main()
