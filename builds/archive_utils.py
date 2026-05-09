import logging
import os
import re

logger = logging.getLogger(__name__)


def _get_ia_session():
    access = os.getenv("ARCHIVE_ACCESS_KEY", "")
    secret = os.getenv("ARCHIVE_SECRET_KEY", "")
    if not access or not secret:
        raise RuntimeError("ARCHIVE_ACCESS_KEY або ARCHIVE_SECRET_KEY не задані в .env")
    import internetarchive as ia

    return ia.get_session(config={"s3": {"access": access, "secret": secret}})


def _make_identifier(build):
    slug = re.sub(r"[^a-z0-9]+", "-", build.title.lower()).strip("-")[:40]
    return f"Vortex-{build.build_type}-{build.id}-{slug}"


def upload_to_archive(build):
    try:
        import internetarchive as ia
    except ImportError:
        raise RuntimeError("Встановіть: pip install internetarchive")

    if not build.source_file:
        raise RuntimeError("У збірки немає source_file")

    identifier = _make_identifier(build)
    file_name = os.path.basename(build.source_file.name)

    metadata = {
        "title": f"{build.title} — Vortex Arizona RP",
        "description": build.description or f"Збірка для Arizona RP: {build.title}",
        "subject": ["Arizona RP", "GTA SA", "Vortex", build.build_type]
        + [t.strip() for t in (build.tags or "").split(",") if t.strip()],
        "creator": "Vortex",
        "mediatype": "software",
    }

    # Спочатку прибираємо B2 credentials щоб boto3 не плутав їх з Archive.org S3
    env_backup = {}
    for key in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_STORAGE_BUCKET_NAME",
                "AWS_S3_ENDPOINT_URL", "AWS_S3_CUSTOM_DOMAIN"):
        val = os.environ.pop(key, None)
        if val is not None:
            env_backup[key] = val

    import tempfile
    tmp_path = None
    try:
        # Читаємо файл через requests по публічному URL (обходимо boto3 повністю)
        import requests as req_lib
        file_url = build.source_file.url
        r = req_lib.get(file_url, stream=True, timeout=60)
        r.raise_for_status()
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file_name)[1]) as tmp:
            tmp_path = tmp.name
            for chunk in r.iter_content(chunk_size=8 * 1024 * 1024):
                tmp.write(chunk)
    except Exception as e:
        os.environ.update(env_backup)
        raise RuntimeError(f"Не вдалося завантажити файл з B2: {e}")

    try:
        try:
            session = _get_ia_session()
            item = session.get_item(identifier)
            item.upload(
                {file_name: tmp_path},
                metadata=metadata,
                access_key=os.getenv("ARCHIVE_ACCESS_KEY"),
                secret_key=os.getenv("ARCHIVE_SECRET_KEY"),
                verbose=True,
                retries=3,
                retries_sleep=10,
            )
        finally:
            os.environ.update(env_backup)
    finally:
        os.environ.update(env_backup)
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    archive_url = f"https://archive.org/download/{identifier}/{file_name}"
    logger.info(f"[Archive.org] Завантажено: {archive_url}")
    return archive_url, identifier


def delete_from_archive(identifier):
    """Видаляє item з Archive.org повністю."""
    try:
        import internetarchive as ia
        env_backup = {}
        for key in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_STORAGE_BUCKET_NAME",
                    "AWS_S3_ENDPOINT_URL", "AWS_S3_CUSTOM_DOMAIN"):
            val = os.environ.pop(key, None)
            if val is not None:
                env_backup[key] = val
        try:
            session = _get_ia_session()
            item = session.get_item(identifier)
            if not item.exists:
                logger.info(f"[Archive.org] Item не існує, нічого видаляти: {identifier}")
                return
            # Видаляємо всі файли item через S3 API
            files = list(item.get_files())
            for f in files:
                try:
                    ia.delete(identifier, files=f.name,
                              access_key=os.getenv("ARCHIVE_ACCESS_KEY"),
                              secret_key=os.getenv("ARCHIVE_SECRET_KEY"),
                              cascade_delete=True)
                    logger.info(f"[Archive.org] Видалено файл: {f.name}")
                except Exception as fe:
                    logger.warning(f"[Archive.org] Не вдалося видалити файл {f.name}: {fe}")
        finally:
            os.environ.update(env_backup)
        logger.info(f"[Archive.org] Item видалено: {identifier}")
    except Exception as e:
        logger.error(f"[Archive.org] Помилка видалення {identifier}: {e}")


def hide_from_archive(identifier):
    """Залишено для сумісності — тепер просто видаляє."""
    delete_from_archive(identifier)


def unhide_from_archive(identifier):
    try:
        session = _get_ia_session()
        item = session.get_item(identifier)
        item.modify_metadata(
            {"dark": "false"},
            access_key=os.getenv("ARCHIVE_ACCESS_KEY"),
            secret_key=os.getenv("ARCHIVE_SECRET_KEY"),
        )
        logger.info(f"[Archive.org] Відновлено: {identifier}")
    except Exception as e:
        logger.error(f"[Archive.org] Помилка відновлення {identifier}: {e}")


def check_exists(identifier):
    try:
        session = _get_ia_session()
        item = session.get_item(identifier)
        return item.exists
    except Exception as e:
        logger.error(f"[Archive.org] Помилка перевірки {identifier}: {e}")
        return None