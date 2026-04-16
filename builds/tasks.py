"""
Async AI analysis using Python threading.
No external worker process needed — runs inside Django.
"""

import logging
import threading
import traceback

logger = logging.getLogger(__name__)


def run_analysis_task(task_id: int):
    """Spawns a background thread to run AI analysis."""
    thread = threading.Thread(target=_execute, args=(task_id,), daemon=True)
    thread.start()


def _execute(task_id: int):
    """Actual work — runs in background thread."""
    from django.db import connection

    try:
        from .ai_logic import get_compatibility_analysis
        from .models import AIAnalysisLog, AnalysisTask, PCSpecs

        logger.info(f"[Task {task_id}] Thread started")

        try:
            task = AnalysisTask.objects.select_related("user", "build").get(pk=task_id)
        except AnalysisTask.DoesNotExist:
            logger.error(f"[Task {task_id}] Task not found in DB")
            return

        if task.status == "cancelled":
            logger.info(f"[Task {task_id}] Already cancelled, aborting")
            return

        task.status = "running"
        task.save(update_fields=["status", "updated_at"])
        logger.info(f"[Task {task_id}] Status → running")

        specs = PCSpecs.objects.filter(user=task.user, is_active=True).first()
        if not specs:
            task.status = "error"
            task.error_msg = (
                "Характеристики ПК не знайдено. Збережіть їх у Налаштуваннях."
            )
            task.save(update_fields=["status", "error_msg", "updated_at"])
            logger.error(f"[Task {task_id}] No PC specs for user {task.user.username}")
            return

        logger.info(
            f"[Task {task_id}] Calling AI for build '{task.build.title}' specs '{specs.label}'"
        )

        task.refresh_from_db()
        if task.status == "cancelled":
            logger.info(f"[Task {task_id}] Cancelled before AI call")
            return

        result = get_compatibility_analysis(specs, task.build)
        logger.info(
            f"[Task {task_id}] AI returned: {list(result.keys()) if isinstance(result, dict) else result}"
        )

        task.refresh_from_db()
        if task.status == "cancelled":
            logger.info(f"[Task {task_id}] Cancelled after AI call — not saving result")
            return

        if "error" in result:
            task.status = "error"
            task.error_msg = result["error"]
            task.save(update_fields=["status", "error_msg", "updated_at"])
            logger.error(f"[Task {task_id}] AI returned error: {result['error']}")
            return

        task.status = "done"
        task.result = result
        task.save(update_fields=["status", "result", "updated_at"])
        logger.info(f"[Task {task_id}] Status → done")

        profile = task.user.profile
        if not profile.is_premium and profile.ai_credits > 0:
            profile.ai_credits -= 1
            profile.save(update_fields=["ai_credits"])
            logger.info(
                f"[Task {task_id}] Deducted 1 credit from {task.user.username}, remaining: {profile.ai_credits}"
            )

        AIAnalysisLog.objects.create(
            user=task.user,
            build=task.build,
            specs=specs,
            verdict=result.get("verdict", ""),
            predicted_fps=result.get("fps_prediction", ""),
            risks=result.get("risks", []),
            recommendations=result.get("recommendations", []),
            task=task,
        )
        logger.info(f"[Task {task_id}] Analysis log saved ✓")

    except Exception as e:
        logger.error(f"[Task {task_id}] Unhandled exception:\n{traceback.format_exc()}")
        try:
            from .models import AnalysisTask

            task = AnalysisTask.objects.get(pk=task_id)
            if task.status not in ("cancelled", "done"):
                task.status = "error"
                task.error_msg = f"Внутрішня помилка: {str(e)}"
                task.save(update_fields=["status", "error_msg", "updated_at"])
        except Exception:
            pass
    finally:
        try:
            connection.close()
        except Exception:
            pass
