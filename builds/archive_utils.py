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

    import tempfile
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file_name)[1]) as tmp:
        tmp_path = tmp.name
        with build.source_file.open("rb") as src:
            for chunk in iter(lambda: src.read(8 * 1024 * 1024), b""):
                tmp.write(chunk)

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
        os.unlink(tmp_path)

    archive_url = f"https://archive.org/download/{identifier}/{file_name}"
    logger.info(f"[Archive.org] Завантажено: {archive_url}")
    return archive_url, identifier


def hide_from_archive(identifier):
    try:
        session = _get_ia_session()
        item = session.get_item(identifier)

        item.modify_metadata(
            {"dark": "true"},
            access_key=os.getenv("ARCHIVE_ACCESS_KEY"),
            secret_key=os.getenv("ARCHIVE_SECRET_KEY"),
        )
        logger.info(f"[Archive.org] Приховано: {identifier}")

        try:
            item.delete(
                cascade_delete=True,
                access_key=os.getenv("ARCHIVE_ACCESS_KEY"),
                secret_key=os.getenv("ARCHIVE_SECRET_KEY"),
            )
            logger.info(f"[Archive.org] Запит на видалення відправлено: {identifier}")
        except Exception as del_err:
            logger.warning(
                f"[Archive.org] Приховано але не видалено {identifier}: {del_err}"
            )

    except Exception as e:
        logger.error(f"[Archive.org] Помилка приховування {identifier}: {e}")


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