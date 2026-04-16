from .models import Notification


def notify_post_reply(user, actor, build_id, post_id, reply_id):
    Notification.objects.create(
        user=user,
        type="post_reply",
        actor_name=actor.username,
        body=f"{actor.username} відповів(-ла) на ваш пост.",
        link_type="build_post_reply",
        link_params={"build_id": build_id, "post_id": post_id, "reply_id": reply_id},
    )


def notify_ticket_reply(user, actor, ticket_id):
    Notification.objects.create(
        user=user,
        type="ticket_reply",
        actor_name=actor.username,
        body=f"{actor.username} відповів(-ла) на ваше звернення.",
        link_type="support_ticket",
        link_params={"ticket_id": ticket_id},
    )


def notify_ai_done(user, build_id, build_title, task_id):
    Notification.objects.create(
        user=user,
        type="ai_done",
        body="ШІ-аналіз: сумісність успішно перевірено.",
        link_type="ai_result",
        link_params={"task_id": task_id, "build_id": build_id},
    )


def notify_moderation_warning(user, actor, warning_text):
    Notification.objects.create(
        user=user,
        type="moderation_warning",
        actor_name=actor.username,
        body=f"Модератор/адміністратор {actor.username} надіслав(-ла) вам попередження.",
        link_type="warning_detail",
        link_params={"warning_text": warning_text},
    )


def notify_submission_status(user, submission_title, new_status, submission_id, rejection_reason=""):
    STATUS_LABELS = {
        "approved": "схвалено",
        "rejected": "відхилено",
        "pending": "повернуто на розгляд",
    }
    label = STATUS_LABELS.get(new_status, new_status)

    if new_status in ("approved", "rejected"):
        body = f"Вашу збірку \"{submission_title}\" {label}."
        link_type = "submission_detail"
    else:
        body = f"Статус вашої збірки \"{submission_title}\" змінено на {label}."
        link_type = "submission_detail"

    Notification.objects.create(
        user=user,
        type="submission_status",
        body=body,
        link_type=link_type,
        link_params={
            "submission_id": submission_id,
            "status": new_status,
            "rejection_reason": rejection_reason,
        },
    )