import hashlib
import os
import time

from django.conf import settings

import bencodepy

# Public trackers — вшиті в код, щоб не зберігати в БД
DEFAULT_TRACKERS = [
    "udp://tracker.opentrackr.org:1337/announce",
    "udp://open.tracker.cl:1337/announce",
    "udp://tracker.openbittorrent.com:6969/announce",
]


def generate_torrent(instance):
    """
    Генерація .torrent файлу та magnet-посилання на основі завантаженого source_file.
    Повертає: (torrent_filename, info_hash_hex, magnet_link)
    """
    file_path = instance.source_file.path
    file_name = os.path.basename(file_path)
    file_size = os.path.getsize(file_path)

    # ── Piece hashing ────────────────────────────────────────────────
    _length = 512 * 1024  # 512 KB (виправлено typo: piece_lenght → piece_length)
    pieces = []

    with open(file_path, "rb") as f:
        while True:
            data = f.read(piece_length)
            if not data:
                break
            pieces.append(hashlib.sha1(data, usedforsecurity=False).digest())

    # ── Info dict ────────────────────────────────────────────────────
    info = {
        b"name": file_name.encode(),
        b"piece length": piece_length,
        b"pieces": b"".join(pieces),
        b"length": file_size,
    }

    # ── Info hash  (виправлено: було hashlib.bencopedy.encode — не існує) ──
    info_encoded = bencodepy.encode(info)
    info_hash = hashlib.sha1(info_encoded, usedforsecurity=False).hexdigest()

    # ── Full torrent dict ────────────────────────────────────────────
    trackers = DEFAULT_TRACKERS  # виправлено: instance.trackers не існує в моделі
    torrent_data = {
        b"announce": trackers[0].encode(),
        b"announce-list": [[t.encode()] for t in trackers],
        b"info": info,
        b"creation date": int(time.time()),  # виправлено: було хардкод 123456789
        b"comment": f"Build: {instance.title}".encode(),
    }

    # ── Зберігаємо файл ─────────────────────────────────────────────
    safe_title = "".join(
        c if c.isalnum() or c in ("-", "_") else "_" for c in instance.title
    )
    torrent_filename = f"{safe_title}.torrent"
    torrent_path = os.path.join(settings.TORRENT_FILES_ROOT, torrent_filename)

    os.makedirs(settings.TORRENT_FILES_ROOT, exist_ok=True)

    with open(torrent_path, "wb") as f:
        f.write(bencodepy.encode(torrent_data))

    # ── Magnet link (з трекерами) ────────────────────────────────────
    tracker_params = "".join(f"&tr={t}" for t in trackers)
    magnet_link = f"magnet:?xt=urn:btih:{info_hash}&dn={file_name}{tracker_params}"

    return torrent_filename, info_hash, magnet_link
