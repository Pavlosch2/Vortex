import os
import json
from dotenv import load_dotenv

load_dotenv()

def get_compatibility_analysis(pc_specs, build):

    try:
        from google import genai
    except ImportError:
        import google.genai as genai
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        return {"error": "API Key не знайдено"}

    try:
        client = genai.Client(api_key=api_key)
        
        mod_list = ", ".join([f"{c.name} ({c.get_complexity_level_display()})" for c in build.components.all()])

        prompt = f"""
        Ти - аналітичний модуль системи Vortex ArizonaAI.
        Проаналізуй сумісність ігрової збірки Arizona RP із апаратним забезпеченням користувача.
        

        Апаратне забезпечення користувача:
        - CPU: {pc_specs.cpu_model}
        - GPU: {pc_specs.gpu_model}
        - RAM: {pc_specs.ram_gb}GB

        Збірка: "{build.title}"
        Компоненти: {mod_list}

        Надай відповідь ВИКЛЮЧНО у форматі JSON (без зайвого тексту):
        {{
        "verdict": "короткий вердикт (Сумісно/Частково/Не сумісно)",
        "fps_prediction": "діапазон FPS для Arizona RP",
        "risks": ["ризик 1", "ризик 2"],
        "recommendations": ["порада 1", "порада 2"]
        }}
        """
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )

        clean_json = response.text.replace('```json', '').replace('```', '').strip()
        return json.loads(clean_json)
    except Exception as er:
        return {"error": f"Помилка ШІ: {str(er)}"}