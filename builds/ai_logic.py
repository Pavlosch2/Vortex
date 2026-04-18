import json
import os
import re

from dotenv import load_dotenv

load_dotenv()


def _get_client():
    try:
        from google import genai
    except ImportError:
        return None, {
            "error": "Пакет google-genai не встановлено. Виконайте: pip install google-genai"
        }
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None, {"error": "GEMINI_API_KEY не знайдено в .env"}
    return genai.Client(api_key=api_key), None


def _extract_json(raw: str):
    match = re.search(r"(\[.*\]|\{.*\})", raw, re.DOTALL)
    if not match:
        raise ValueError(f"Gemini повернув неочікуваний формат: {raw[:200]}")
    return json.loads(match.group())


_SYSTEM_CONTEXT = """
Ти — детермінований аналітичний модуль платформи Vortex для збірок GTA San Andreas (Arizona RP / SAMP).

АБСОЛЮТНІ ПРАВИЛА (не порушувати ніколи):
- Відповідай ВИКЛЮЧНО валідним JSON. Жодного тексту поза JSON.
- Вердикт — рівно одне зі: "Сумісно" / "Частково сумісно" / "Не сумісно". Нічого іншого.
- FPS — тільки конкретний діапазон для Arizona RP онлайн. Формат: "X–Y FPS".
- Кожен ризик і рекомендація — прив'язані до КОНКРЕТНОГО файлу, компонента або характеристики заліза. Загальні фрази ЗАБОРОНЕНІ.
- Не згадуй GTA 5, GTA Online або інші ігри.
- Якщо одні і ті самі дані — відповідь ЗАВЖДИ однакова.

ТЕХНІЧНИЙ КОНТЕКСТ GTA SA + SAMP:

Движок RenderWare (2004), 32-розрядний:
- Гра ОДНОПОТОКОВА. FPS визначає тактова частота ОДНОГО ядра CPU, не кількість ядер.
- RAM: процес адресує max ~3.5 GB. Понад — краш.
- VRAM: стабільна робота до ~1.5–2 GB текстур. Понад — фризи і вильоти.
- SSD vs HDD: SSD прискорює стримінг (~15–20% менше фризів при телепортації).
- SAMP: синхронізація гравців/транспорту знижує FPS на 10–20% проти офлайн.

Порогові значення CPU (тактова частота 1 ядра):
- < 2.5 GHz → низька продуктивність, FPS просідає нижче 30 навіть без модів
- 2.5–3.2 GHz → задовільно для Low-PC збірок
- 3.2–4.0 GHz → стандарт, підходить для більшості збірок
- > 4.0 GHz → висока, ENB і важкі текстури без проблем

Порогові значення GPU (VRAM):
- < 1 GB VRAM → тільки ванільні текстури, ENB заборонений
- 1–2 GB VRAM → HD текстури 1K, легкий ENB (без SSAO/DOF)
- 2–4 GB VRAM → HD текстури 2K, більшість ENB пресетів
- > 4 GB VRAM → 4K текстури, будь-який ENB

Порогові значення RAM:
- < 4 GB → ризик краша з великою кількістю скриптів і HD текстур
- 4–8 GB → стандарт
- > 8 GB → запас, без обмежень з боку RAM

Типи файлів і їх вплив:
- .cs → CLEO скрипт, виконується в ігровому потоці, -2–5 FPS кожен
- .lua → MoonLoader скрипт, аналогічно до .cs
- .asi → ASI плагін, може конфліктувати з SAMP
- .txd / .dff → текстура/модель: розмір файлу визначає якість (>10 MB = HD, >50 MB = 4K)
- enbseries.ini / enb*.* → ENB Series, найважчий постпроцесинг (-20–40 FPS з SSAO)
- reshade*.ini / ReShade.ini → ReShade (-5–15 FPS)
- SweetFX*.* → SweetFX (-3–8 FPS)
- .mp3 / .wav / .ogg / .opus → аудіо, мінімальний вплив
- .cfg / .ini → конфіги, вплив залежить від того що конфігурують

Критичні правила підрахунку:
- >10 скриптів (.cs + .lua) і CPU < 3.2 GHz → обов'язково "Частково сумісно" або "Не сумісно"
- ENB + VRAM < 2 GB → обов'язково "Частково сумісно" або "Не сумісно"
- Загальний розмір .txd файлів: <500 MB = безпечно, 500 MB–1.5 GB = увага, >1.5 GB = критично для VRAM < 4 GB

ДОВІДКА ПО ПОПУЛЯРНОМУ ЗАЛІЗУ:

CPU — тактова частота одного ядра (boost):
- Ryzen 5 3600 → 4.2 GHz | Ryzen 5 5600 → 4.4 GHz | Ryzen 7 5800X → 4.7 GHz
- Ryzen 7 7800X3D → 5.0 GHz | Ryzen 7 9800X3D → 5.7 GHz
- Core i5-10400 → 4.3 GHz | Core i5-12400 → 4.4 GHz | Core i7-12700 → 4.9 GHz
- Core i5-13600K → 5.1 GHz | Core i7-13700K → 5.4 GHz | Core i9-13900K → 5.8 GHz
- FX-8350 → 4.0 GHz | i5-3570 → 3.8 GHz | i3-10100 → 4.3 GHz

GPU — VRAM:
- GT 1030 → 2 GB | GTX 1050 Ti → 4 GB | GTX 1060 3GB/6GB → 3/6 GB | GTX 1650 → 4 GB
- GTX 1070 → 8 GB | GTX 1080 Ti → 11 GB
- RTX 2060 → 6 GB | RTX 2070 → 8 GB | RTX 3060 → 12 GB | RTX 3070 → 8 GB
- RTX 3080 → 10 GB | RTX 4060 → 8 GB | RTX 4070 → 12 GB | RTX 4080 → 16 GB | RTX 4090 → 24 GB
- RX 580 → 8 GB | RX 6600 → 8 GB | RX 6700 XT → 12 GB | RX 7900 XTX → 24 GB

FPS орієнтири для GTA SA + Arizona RP онлайн (без модів):
- Слабке залізо (CPU <3.0 GHz, GPU <2 GB VRAM) → 30–50 FPS
- Середнє залізо (CPU 3.0–4.0 GHz, GPU 4–6 GB VRAM) → 60–100 FPS
- Потужне залізо (CPU >4.5 GHz, GPU >8 GB VRAM) → 120–180 FPS
- Топове залізо (CPU >5.0 GHz, GPU >12 GB VRAM) → 180–300 FPS
- GTA SA не має жорсткого ліміту FPS — на топовому залізі можливо 200–300+ FPS
- Low-PC збірка на топовому залізі → 200–300 FPS
- Важкий ENB на топовому залізі → 80–140 FPS залежно від пресету
- >15 скриптів навіть на топовому залізі → просідання до 80–120 FPS в онлайн

АЛГОРИТМ ВЕРДИКТУ:
1. Підрахуй кількість .cs + .lua файлів. Якщо >10 і CPU < 3.2 GHz → мінус до вердикту.
2. Перевір наявність ENB файлів і VRAM GPU. Якщо ENB є і VRAM < 2 GB → "Не сумісно" або "Частково сумісно".
3. Підрахуй загальний розмір .txd файлів. Якщо >1.5 GB і VRAM < 4 GB → ризик.
4. Перевір конфлікти з БД компонентів: якщо є → автоматично "Частково сумісно" або "Не сумісно".
5. "Сумісно" — залізо покриває всі вимоги з запасом.
6. "Частково сумісно" — залізо на межі або є незначні проблеми.
7. "Не сумісно" — залізо явно не тягне або є критичні конфлікти.
""".strip()


def _call_with_retry(client, prompt, temperature=0.0, max_retries=3) -> str:
    import time

    delays = [5, 15, 30]
    last_err = None
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={"temperature": temperature},
            )
            return response.text.strip()
        except Exception as e:
            err_str = str(e)
            if (
                "503" in err_str
                or "429" in err_str
                or "UNAVAILABLE" in err_str
                or "RESOURCE_EXHAUSTED" in err_str
            ):
                last_err = e
                if attempt < max_retries - 1:
                    wait = delays[attempt]
                    print(f"[Gemini] {e.__class__.__name__} на спробі {attempt+1}, чекаємо {wait}s...")
                    time.sleep(wait)
                    continue
            raise
    raise last_err


def _classify_file(name: str, size: int) -> str:
    n = name.lower()
    basename = os.path.basename(n)
    size_mb = size / (1024 * 1024)

    if n.endswith(".cs"):
        return f"CLEO скрипт: {basename}"
    if n.endswith(".lua"):
        return f"MoonLoader скрипт: {basename}"
    if n.endswith(".asi"):
        return f"ASI плагін: {basename}"
    if "enbseries" in n or (n.endswith(".ini") and "enb" in n) or basename.startswith("enb"):
        return f"ENB файл: {basename}"
    if "reshade" in n or basename == "reshade.ini":
        return f"ReShade: {basename}"
    if "sweetfx" in n:
        return f"SweetFX: {basename}"
    if n.endswith(".txd"):
        quality = "4K" if size_mb > 50 else "HD" if size_mb > 10 else "стандартна"
        return f"Текстура ({quality}, {size_mb:.1f} MB): {basename}"
    if n.endswith(".dff"):
        return f"Модель: {basename}"
    if n.endswith((".mp3", ".wav", ".ogg", ".opus")):
        return f"Аудіо: {basename}"
    if n.endswith((".cfg", ".ini")):
        return f"Конфіг: {basename}"
    return None


def _extract_archive_files(build) -> dict:
    import tempfile
    import zipfile

    import requests

    archive_url = build.archive_url
    if not archive_url:
        return {"error": "archive_url відсутній", "files": [], "stats": {}}

    try:
        r = requests.get(archive_url, stream=True, timeout=60)
        r.raise_for_status()
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
        for chunk in r.iter_content(chunk_size=8192):
            tmp.write(chunk)
        tmp.close()
        archive_path = tmp.name
    except Exception as e:
        return {"error": f"Не вдалося завантажити архів: {e}", "files": [], "stats": {}}

    try:
        archive_ext = os.path.splitext(archive_url.split("?")[0])[1].lower() or ".zip"

        all_entries = []
        if archive_ext == ".7z":
            try:
                import py7zr
                with py7zr.SevenZipFile(archive_path, mode="r") as z:
                    all_entries = [
                        (f.filename, getattr(f, "uncompressed", 0) or 0)
                        for f in z.list()
                        if not f.is_directory
                    ]
            except ImportError:
                return {"error": "py7zr не встановлено", "files": [], "stats": {}}
        elif archive_ext == ".rar":
            try:
                import rarfile
                with rarfile.RarFile(archive_path) as z:
                    all_entries = [
                        (f.filename, f.file_size)
                        for f in z.infolist()
                        if not f.is_dir()
                    ]
            except ImportError:
                return {"error": "rarfile не встановлено", "files": [], "stats": {}}
        else:
            with zipfile.ZipFile(archive_path, "r") as zf:
                all_entries = [
                    (i.filename, i.file_size)
                    for i in zf.infolist()
                    if not i.is_dir()
                ]

        classified = []
        stats = {
            "cleo_scripts": [],
            "lua_scripts": [],
            "asi_plugins": [],
            "enb_files": [],
            "reshade_files": [],
            "textures_mb": 0.0,
            "textures_count": 0,
            "models_count": 0,
            "audio_count": 0,
            "total_files": len(all_entries),
        }

        for name, size in all_entries:
            name = name.replace("\\", "/")
            label = _classify_file(name, size)
            if label:
                classified.append(label)

            n = name.lower()
            basename = os.path.basename(n)
            size_mb = size / (1024 * 1024)

            if n.endswith(".cs"):
                stats["cleo_scripts"].append(basename)
            elif n.endswith(".lua"):
                stats["lua_scripts"].append(basename)
            elif n.endswith(".asi"):
                stats["asi_plugins"].append(basename)
            elif "enbseries" in n or (n.endswith(".ini") and "enb" in n) or basename.startswith("enb"):
                stats["enb_files"].append(basename)
            elif "reshade" in n:
                stats["reshade_files"].append(basename)
            elif n.endswith(".txd"):
                stats["textures_mb"] += size_mb
                stats["textures_count"] += 1
            elif n.endswith(".dff"):
                stats["models_count"] += 1
            elif n.endswith((".mp3", ".wav", ".ogg", ".opus")):
                stats["audio_count"] += 1

        return {"error": None, "files": classified, "stats": stats}

    except zipfile.BadZipFile:
        return {"error": "Архів пошкоджений", "files": [], "stats": {}}
    except Exception as e:
        return {"error": str(e), "files": [], "stats": {}}
    finally:
        try:
            os.unlink(archive_path)
        except Exception:
            pass


def _format_archive_context(scan: dict) -> str:
    if scan.get("error"):
        return f"Сканування архіву недоступне: {scan['error']}"

    stats = scan["stats"]
    files = scan["files"]

    script_total = len(stats["cleo_scripts"]) + len(stats["lua_scripts"])
    has_enb = len(stats["enb_files"]) > 0
    has_reshade = len(stats["reshade_files"]) > 0

    lines = [
        f"Загалом файлів в архіві: {stats['total_files']}",
        f"CLEO скриптів (.cs): {len(stats['cleo_scripts'])} — {', '.join(stats['cleo_scripts'][:10]) or 'немає'}",
        f"MoonLoader скриптів (.lua): {len(stats['lua_scripts'])} — {', '.join(stats['lua_scripts'][:10]) or 'немає'}",
        f"ASI плагінів: {len(stats['asi_plugins'])} — {', '.join(stats['asi_plugins'][:5]) or 'немає'}",
        f"ENB файлів: {len(stats['enb_files'])} — {', '.join(stats['enb_files'][:5]) or 'немає'}",
        f"ReShade файлів: {len(stats['reshade_files'])} — {', '.join(stats['reshade_files'][:3]) or 'немає'}",
        f"Текстур (.txd): {stats['textures_count']} шт., загальний розмір: {stats['textures_mb']:.1f} MB",
        f"Моделей (.dff): {stats['models_count']}",
        f"Аудіо файлів: {stats['audio_count']}",
        f"",
        f"Підсумок: скриптів всього {script_total}, ENB {'присутній' if has_enb else 'відсутній'}, ReShade {'присутній' if has_reshade else 'відсутній'}",
    ]

    if files:
        lines.append("")
        lines.append("Класифіковані файли (перші 60):")
        for f in files[:60]:
            lines.append(f"  - {f}")

    return "\n".join(lines)


def _build_context(build) -> str:
    from collections import Counter
    from django.db.models import Avg

    rating = build.reviews.aggregate(avg=Avg("score"))["avg"]
    rating_str = f"{rating:.1f}" if rating else "немає оцінок"

    components = list(build.components.prefetch_related("conflicts_with").all())

    comp_lines = []
    conflicts_found = []
    script_count = 0
    for c in components:
        line = f"  [{c.get_category_display().upper()}] {c.name} | складність: {c.get_complexity_level_display()}"
        if c.description:
            line += f"\n    опис: {c.description[:120]}"
        comp_lines.append(line)
        if c.category == "script":
            script_count += 1
        for cf in c.conflicts_with.all():
            pair = tuple(sorted([c.name, cf.name]))
            if pair not in conflicts_found:
                conflicts_found.append(pair)

    cat_counts = Counter(c.get_category_display() for c in components)
    stats = (
        " | ".join(f"{v}x {k}" for k, v in cat_counts.items())
        if cat_counts
        else "немає компонентів"
    )

    tags = [t.strip() for t in build.tags.split(",") if t.strip()] if build.tags else []
    tag_str = ", ".join(f'"{t}"' for t in tags) if tags else "немає"

    conflict_block = ""
    if conflicts_found:
        lines = [f"  [КОНФЛІКТ] '{a}' несумісний з '{b}'" for a, b in conflicts_found]
        conflict_block = "\nКонфлікти компонентів з БД (КРИТИЧНО):\n" + "\n".join(lines)

    comp_text = "\n".join(comp_lines) if comp_lines else "  (компоненти не вказано в БД)"

    return (
        f"ЗБІРКА: '{build.title}'\n"
        f"Тип: {build.get_build_type_display()} | Рейтинг: {rating_str}/5.0\n"
        f"Теги: {tag_str}\n"
        f"Опис: {build.description[:400] if build.description else '(без опису)'}\n\n"
        f"Компоненти з БД ({stats}, скриптів: {script_count}):\n{comp_text}"
        f"{conflict_block}"
    )


def get_compatibility_analysis(pc_specs, build) -> dict:
    client, err = _get_client()
    if err:
        return err
    try:
        build_ctx = _build_context(build)

        print(f"[AI] Скануємо архів збірки '{build.title}'...")
        archive_scan = _extract_archive_files(build)
        archive_ctx = _format_archive_context(archive_scan)

        if archive_scan.get("error"):
            archive_note = (
                f"УВАГА: сканування архіву недоступне ({archive_scan['error']}).\n"
                "Аналіз базується на компонентах з БД, тегах та описі.\n\n"
            )
        else:
            archive_note = ""
            stats = archive_scan["stats"]
            print(
                f"[AI] Архів відскановано: {stats['total_files']} файлів, "
                f"{len(stats['cleo_scripts']) + len(stats['lua_scripts'])} скриптів, "
                f"ENB: {bool(stats['enb_files'])}"
            )

        prompt = (
            f"{_SYSTEM_CONTEXT}\n\n"
            f"{'='*12}\n\n"
            f"АПАРАТНЕ ЗАБЕЗПЕЧЕННЯ КОРИСТУВАЧА:\n"
            f"  CPU: {pc_specs.cpu_model}\n"
            f"  GPU: {pc_specs.gpu_model}\n"
            f"  RAM: {pc_specs.ram_gb} GB"
            + (f" @ {pc_specs.ram_mhz} MHz" if getattr(pc_specs, 'ram_mhz', None) else "")
            + "\n\n"
            f"{'='*12}\n\n"
            f"{build_ctx}\n\n"
            f"{'='*12}\n\n"
            f"ВМІСТ АРХІВУ ЗБІРКИ (основне джерело аналізу):\n"
            f"{archive_ctx}\n\n"
            f"{'='*12}\n\n"
            f"{archive_note}"
            "ЗАВДАННЯ:\n"
            "1. Визнач тактову частоту одного ядра CPU з назви моделі (використай довідку).\n"
            "2. Визнач обсяг VRAM GPU з назви моделі (використай довідку).\n"
            "3. Підрахуй CLEO + MoonLoader скрипти з вмісту архіву.\n"
            "4. Перевір наявність ENB/ReShade файлів і відповідність VRAM.\n"
            "5. Оціни загальний розмір текстур відносно VRAM.\n"
            "6. Якщо є конфлікти з БД — винеси їх першими у risks.\n"
            "7. Кожен ризик і рекомендація — з назвою КОНКРЕТНОГО файлу або характеристики.\n"
            "8. У risks та recommendations ЗАВЖДИ мінімум 2 пункти.\n\n"
            "Відповідай ВИКЛЮЧНО валідним JSON (без markdown, без пояснень поза JSON):\n"
            "{\n"
            '  "verdict": "Сумісно",\n'
            '  "fps_prediction": "180–250 FPS в Arizona RP онлайн",\n'
            '  "risks": [\n'
            '    "nevada.enb: потребує >2 GB VRAM, ваша RTX 4080 має 16 GB — без проблем, але SSAO/DOF знизять FPS на 20–40",\n'
            '    "SpeedoV2.cs + OdoV3.cs: потенційний конфлікт між спідометрами — можливий краш SAMP"\n'
            '  ],\n'
            '  "recommendations": [\n'
            '    "Увімкніть SSAO та DOF в налаштуваннях nevada.enb — ваша RTX 4080 це витримає",\n'
            '    "Перевірте сумісність SpeedoV2.cs і OdoV3.cs перед запуском SAMP"\n'
            '  ]\n'
            "}"
        )

        raw = _call_with_retry(client, prompt, temperature=0.0)
        return _extract_json(raw)
    except json.JSONDecodeError as e:
        return {"error": f"Помилка парсингу JSON від Gemini: {e}"}
    except Exception as e:
        return {"error": f"Помилка ШІ: {e}"}


def _catalog_context(builds_data: list) -> str:
    blocks = []
    for b in builds_data:
        comp_names = [c["name"] for c in b.get("components", [])]
        comp_str = ", ".join(comp_names) if comp_names else "-"

        tags = (
            [t.strip() for t in b["tags"].split(",") if t.strip()]
            if b.get("tags")
            else []
        )
        tag_str = " ".join(f"#{t}" for t in tags) if tags else "-"

        desc = (b.get("description") or "").strip()
        desc_short = (desc[:120] + "…") if len(desc) > 120 else desc or "-"

        block = (
            f"[{b['id']}] {b['title']} [{b['build_type']}] ★{b.get('rating','?')}\n"
            f"  Теги: {tag_str}\n"
            f"  {desc_short}\n"
            f"  Компоненти: {comp_str}"
        )
        blocks.append(block)
    return "\n".join(blocks)


def ai_search_builds(query: str, builds_data: list, pc_specs=None) -> list:
    client, err = _get_client()
    if err:
        return [b["id"] for b in builds_data]
    try:
        catalog_text = _catalog_context(builds_data)

        specs_block = ""
        if pc_specs:
            specs_block = (
                f"\nПК користувача:\n"
                f"  CPU: {pc_specs.cpu_model}\n"
                f"  GPU: {pc_specs.gpu_model}\n"
                f"  RAM: {pc_specs.ram_gb} GB"
                + (f" @ {pc_specs.ram_mhz} MHz" if getattr(pc_specs, 'ram_mhz', None) else "")
                + "\n\n"
                f"(враховуй теги Low-PC/High-PC щодо сумісності з цим залізом)\n"
            )

        prompt = (
            f"{_SYSTEM_CONTEXT}\n\n"
            f"{'='*12}\n\n"
            "Ти виконуєш роль пошукового модуля каталогу збірок.\n"
            f"{specs_block}\n"
            f"ЗАПИТ КОРИСТУВАЧА: '{query}'\n\n"
            f"{'='*12}\n"
            f"КАТАЛОГ ЗБІРОК:\n\n"
            f"{catalog_text}\n\n"
            f"{'='*12}\n\n"
            "Завдання:\n"
            "1. Уважно прочитай запит — тематика, вимоги до ПК, стиль або конкретний контент.\n"
            "2. Знайди збірки що найкраще відповідають запиту — по назві, опису, тегам, компонентам.\n"
            "3. Якщо вказано ПК — враховуй Low-PC/High-PC теги щодо потужності заліза.\n"
            "4. Збірки що не відповідають запиту — постав у кінець, але не виключай.\n\n"
            "Відповідай ВИКЛЮЧНО JSON-масивом id від найрелевантнішої до найменш релевантної.\n"
            "Приклад: [3, 1, 5, 2, 4]\n"
            "Жодних пояснень поза масивом."
        )

        raw = _call_with_retry(client, prompt, temperature=0.1)
        sorted_ids = _extract_json(raw)

        if isinstance(sorted_ids, list):
            all_ids = [b["id"] for b in builds_data]
            missing_ids = [i for i in all_ids if i not in sorted_ids]
            return sorted_ids + missing_ids

        return [b["id"] for b in builds_data]

    except Exception as e:
        print(f"[ai_search_builds] Помилка: {e}")
        return [b["id"] for b in builds_data]