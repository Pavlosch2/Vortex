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
Ти - аналітичний модуль платформи Vortex. Платформа призначена ВИКЛЮЧНО для збірок
модифікацій до гри GTA San Andreas (2004) для онлайн-сервера Arizona RP (на базі SAMP).

ТЕХНІЧНИЙ КОНТЕКСТ GTA SAN ANDREAS:

Движок: RenderWare (2004), 32-розрядний
- Гра ОДНОПОТОКОВА: весь ігровий цикл виконується в одному потоці CPU.
  Кількість ядер НЕ ВПЛИВАЄ на FPS. Важлива тактова частота ОДНОГО ядра.
- Ліміт RAM: 32-розрядний процес адресує max ~3.5 ГБ ОЗП. Понад це - краш.
- Ліміт VRAM текстур: GTA SA стабільна до ~1.5-2 ГБ текстур. Понад це - фризи і вильоти.
- SSD суттєво покращує стримінг моделей порівняно з HDD.

Типи компонентів модифікацій:
- СКРИПТ (CLEO .cs, MoonLoader .lua): виконуються В ІГРОВОМУ ПОТОЦІ.
  Кожен важкий скрипт знижує FPS. Понад 10 скриптів одночасно = відчутне просідання.
- ТЕКСТУРА (HD pack, retexture): навантажують VRAM. Розміри 2K/4K критичні для карт до 2 ГБ VRAM.
- ГРАФІКА (ENB, ReShade, SweetFX): постпроцесинг, навантажує GPU. ENB Series - найважчий.
- АУДІО: мінімальний вплив на продуктивність.

Arizona RP специфіка:
- SAMP клієнт: синхронізація гравців/транспорту знижує FPS ще на 10-20% проти офлайн.
- Деякі клієнтські скрипти несумісні з SAMP і можуть спричинити дисконект.

ПРАВИЛА АНАЛІЗУ:
1. Аналізуй ТІЛЬКИ в контексті GTA SA + Arizona RP. Ніколи не згадуй GTA 5 або інші ігри.
2. CPU: оцінюй тактову частоту ОДНОГО ядра, не загальну кількість ядер.
3. GPU: оцінюй VRAM в першу чергу для збірок з текстурами та ENB.
4. Скрипти: >5 = помірне навантаження, >10 = висока.
5. Конфлікти компонентів - КРИТИЧНИЙ ризик, завжди виноси першими у risks.
6. Теги: "Low-PC" = оптимізована збірка, "ENB"/"Realistic"/"High-PC" = вимоглива.
7. FPS: вказуй ТІЛЬКИ для Arizona RP онлайн, конкретним діапазоном.
8. Вердикт - рівно одне: "Сумісно" / "Частково сумісно" / "Не сумісно"
9. Ризики і рекомендації: конкретні, прив'язані до компонентів і заліза. Не загальні фрази.
""".strip()


def _call_with_retry(client, prompt, temperature=1, max_retries=3) -> str:
    """
    Викликає Gemini API з автоматичним retry при 503/429.
    Затримки: 5s → 15s → 30s (exponential backoff).
    """
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
                    print(
                        f"[Gemini] {e.__class__.__name__} на спробі {attempt+1}, чекаємо {wait}s..."
                    )
                    time.sleep(wait)
                    continue
            raise
    raise last_err


def _build_context(build) -> str:
    from collections import Counter

    from django.db.models import Avg

    rating = build.reviews.aggregate(avg=Avg("score"))["avg"]
    rating_str = f"{rating:.1f}" if rating else "немає оцінок"

    components = list(build.components.prefetch_related("conflicts_with").all())

    comp_lines = []
    conflicts_found = []
    for c in components:
        line = f"  [{c.get_category_display().upper()}] {c.name} | {c.get_complexity_level_display()}"
        if c.description:
            line += f"\n    -> {c.description[:100]}"
        comp_lines.append(line)
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
        lines = [
            f"  [!] КОНФЛІКТ: '{a}' несумісний з '{b}'" for a, b in conflicts_found
        ]
        conflict_block = "\n\nКонфлікти між компонентами:\n" + "\n".join(lines)

    comp_text = "\n".join(comp_lines) if comp_lines else "  (не вказано)"

    return (
        f"Збірка: '{build.title}'\n"
        f"Тип: {build.get_build_type_display()} | Рейтинг: {rating_str}/5.0\n"
        f"Теги: {tag_str}\n"
        f"Опис: {build.description[:400] if build.description else '(без опису)'}\n\n"
        f"Компоненти ({stats}):\n{comp_text}"
        f"{conflict_block}"
    )


def get_compatibility_analysis(pc_specs, build) -> dict:
    client, err = _get_client()
    if err:
        return err
    try:
        build_ctx = _build_context(build)

        prompt = (
            f"{_SYSTEM_CONTEXT}\n\n"
            f"{'='*10}\n\n"
            f"АПАРАТНЕ ЗАБЕЗПЕЧЕННЯ:\n"
            f"  CPU: {pc_specs.cpu_model}\n"
            f"  GPU: {pc_specs.gpu_model}\n"
            f"  RAM: {pc_specs.ram_gb} GB\n\n"
            f"{'='*10}\n\n"
            f"{build_ctx}\n\n"
            f"{'='*10}\n\n"
            "Завдання: проаналізуй сумісність цієї збірки з вказаним ПК для Arizona RP (GTA SA онлайн).\n"
            "Якщо є конфлікти компонентів - виноси їх першими у risks.\n\n"
            "Відповідай ВИКЛЮЧНО валідним JSON без markdown:\n"
            "{\n"
            '  "verdict": "Сумісно | Частково сумісно | Не сумісно",\n'
            '  "fps_prediction": "X-Y FPS в Arizona RP онлайн",\n'
            '  "risks": ["Конкретний ризик (яке залізо або який компонент)", "..."],\n'
            '  "recommendations": ["Конкретна дія", "..."]\n'
            "}"
        )

        raw = _call_with_retry(client, prompt, temperature=0.1)
        return _extract_json(raw)
    except json.JSONDecodeError as e:
        return {"error": f"Помилка парсингу JSON від Gemini: {e}"}
    except Exception as e:
        return {"error": f"Помилка ШІ: {e}"}


def _catalog_context(builds_data: list) -> str:
    """
    Компактний контекст каталогу для пошукового промпту.
    Для пошуку важливі: ID, назва, теги, тип, короткий опис, назви компонентів.
    Деталі компонентів (складність, опис) - тільки для аналізу конкретної збірки.
    """
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
                f"  RAM: {pc_specs.ram_gb} GB\n"
                f"(враховуй теги Low-PC/High-PC щодо сумісності з цим залізом)\n"
            )

        prompt = (
            f"{_SYSTEM_CONTEXT}\n\n"
            f"{'='*10}\n\n"
            "Ти виконуєш роль пошукового модуля каталогу збірок.\n"
            f"{specs_block}\n"
            f"ЗАПИТ КОРИСТУВАЧА: '{query}'\n\n"
            f"{'='*10}\n"
            f"КАТАЛОГ ЗБІРОК:\n\n"
            f"{catalog_text}\n\n"
            f"{'='*10}\n\n"
            "Завдання:\n"
            "1. Уважно прочитай запит - може бути тематика, вимоги до ПК, стиль або конкретний контент.\n"
            "2. Знайди збірки що найкраще відповідають запиту - по назві, опису, тегам, компонентам.\n"
            "3. Якщо вказано ПК - враховуй Low-PC/High-PC теги щодо потужності заліза.\n"
            "4. Збірки що не відповідають запиту - постав у кінець, але не виключай.\n\n"
            "Відповідай ВИКЛЮЧНО JSON-масивом id від найрелевантнішої до найменш релевантної.\n"
            "Приклад: [3, 1, 5, 2, 4]\n"
            "Жодних пояснень поза масивом."
        )

        raw = _call_with_retry(client, prompt, temperature=0.2)
        sorted_ids = _extract_json(raw)

        if isinstance(sorted_ids, list):
            all_ids = [b["id"] for b in builds_data]
            missing_ids = [i for i in all_ids if i not in sorted_ids]
            return sorted_ids + missing_ids

        return [b["id"] for b in builds_data]

    except Exception as e:
        print(f"[ai_search_builds] Помилка: {e}")
        return [b["id"] for b in builds_data]
