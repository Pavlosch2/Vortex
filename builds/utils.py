import hashlib
import os
import bencodepy
from django.conf import settings

def generate_torrent(instance):
    """
    Генерація торент файлу на основі завантаженого файлу
    """

    file_path = instance.source_file.path
    file_name = os.path.basename(file_path)
    file_size = os.path.getsize(file_path)

    # Pieces
    piece_lenght = 512*1024
    pieces = []

    with open(file_path, 'rb') as f:
        while True:
            data = f.read(piece_lenght)
            if not data:
                break
            pieces.append(hashlib.sha1(data).digest())

    # Структура торенту
    info = {
        'name': file_name,
        'piece length': piece_lenght,
        'pieces': b''.join(pieces),
        'length': file_size
    }

    # info hash
    info_encoded = hashlib.bencopedy.encode(info)
    info_hash = hashlib.sha1(info_encoded).hexdigest()

    torrent_data = {
        'announce': instance.trackers.split(',')[0],
        'announce-list': [[t.strip()] for t in instance.trackers.split(',')],
        'info': info,
        'creation date': 123456789,
        'comment': f'Build: {instance.title}'
    }

    # Шлях для збереження торенту
    torrent_filename = f"{instance.title.replace(' ', '_')}.torrent"
    torrent_path = os.path.join(settings.TORRENT_FILES_ROOT, torrent_filename)
    
    with open(torrent_path, 'wb') as f:
        f.write(bencodepy.encode(torrent_data))

    return torrent_filename, info_hash, f"magnet:?xt=urn:btih:{info_hash}&dn={file_name}"


