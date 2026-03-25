from django.contrib import admin
from django.utils.html import mark_safe

from .models import (
    AIAnalysisLog,
    Build,
    BuildImage,
    Component,
    SupportTicket,
    TicketReply,
    TicketScreenshot,
)


class BuildImageInline(admin.TabularInline):
    model = BuildImage
    extra = 1
    fields = ["image", "is_cover"]


@admin.register(Build)
class BuildAdmin(admin.ModelAdmin):
    list_display = ["title", "build_type", "is_public", "created_at"]
    list_filter = ["build_type", "is_public"]
    list_editable = ["is_public"]
    search_fields = ["title", "tags"]
    inlines = [BuildImageInline]


@admin.register(Component)
class ComponentAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "complexity_level"]
    list_filter = ["category", "complexity_level"]
    search_fields = ["name"]


class TicketScreenshotInline(admin.TabularInline):
    model = TicketScreenshot
    extra = 0
    readonly_fields = ["screenshot_preview"]
    fields = ["screenshot_preview"]
    can_delete = False
    verbose_name = "Скріншот"

    def screenshot_preview(self, obj):
        if obj.image:
            return mark_safe(
                f'<a href="{obj.image.url}" target="_blank">'
                f'<img src="{obj.image.url}" style="max-height:80px;border-radius:6px;" />'
                f"</a>"
            )
        return "—"

    screenshot_preview.short_description = "Зображення"


class TicketReplyInline(admin.StackedInline):
    model = TicketReply
    extra = 1
    fields = ["author", "message"]
    can_delete = False
    verbose_name = "Відповідь"
    verbose_name_plural = "Відповіді"

    def get_extra(self, request, obj=None, **kwargs):
        if obj and obj.status == "closed":
            return 0
        return 1


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "subject",
        "colored_user",
        "status_badge",
        "reply_count",
        "created_at",
    ]
    list_filter = ["status", "created_at"]
    search_fields = ["subject", "user__username", "message"]
    readonly_fields = ["user", "subject", "message_display", "created_at", "updated_at"]
    ordering = ["-created_at"]
    inlines = [TicketScreenshotInline, TicketReplyInline]
    actions = ["mark_in_progress", "mark_closed"]

    fieldsets = (
        (
            "Звернення",
            {
                "fields": (
                    "user",
                    "subject",
                    "message_display",
                    "status",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    def colored_user(self, obj):
        return mark_safe(f"<strong>{obj.user.username}</strong>")

    colored_user.short_description = "Користувач"

    def status_badge(self, obj):
        colors = {
            "open": ("#6c9bcf", "rgba(108,155,207,0.15)", "Відкрито"),
            "in_progress": ("#f7d060", "rgba(247,208,96,0.15)", "В обробці"),
            "closed": ("#1B9c85", "rgba(27,156,133,0.15)", "Закрито"),
        }
        c, bg, label = colors.get(obj.status, ("#999", "#eee", obj.status))
        return mark_safe(
            f'<span style="display:inline-flex;align-items:center;gap:5px;'
            f"padding:3px 10px;border-radius:999px;font-size:0.75rem;font-weight:600;"
            f'background:{bg};color:{c}">'
            f'<span style="width:7px;height:7px;border-radius:50%;'
            f'background:{c};display:inline-block"></span>{label}</span>'
        )

    status_badge.short_description = "Статус"

    def reply_count(self, obj):
        count = obj.replies.count()
        if count == 0:
            return mark_safe('<span style="color:#aaa">0</span>')
        return mark_safe(f'<strong style="color:#6c9bcf">{count}</strong>')

    reply_count.short_description = "Відповідей"

    def message_display(self, obj):
        return mark_safe(
            f'<div style="white-space:pre-wrap;padding:10px;background:#f5f5f5;'
            f'border-radius:6px;font-size:0.9rem;max-width:700px">{obj.message}</div>'
        )

    message_display.short_description = "Повідомлення"

    @admin.action(description="Позначити як «В обробці»")
    def mark_in_progress(self, request, queryset):
        updated = queryset.exclude(status="closed").update(status="in_progress")
        self.message_user(request, f"{updated} звернень переведено в «В обробці».")

    @admin.action(description="Закрити вибрані звернення")
    def mark_closed(self, request, queryset):
        updated = queryset.update(status="closed")
        self.message_user(request, f"{updated} звернень закрито.")


@admin.register(AIAnalysisLog)
class AIAnalysisLogAdmin(admin.ModelAdmin):
    list_display = ["user", "build", "verdict", "predicted_fps", "created_at"]
    list_filter = ["verdict"]
    search_fields = ["user__username", "build__title"]
    readonly_fields = [
        "user",
        "build",
        "specs",
        "verdict",
        "predicted_fps",
        "created_at",
    ]

    def has_add_permission(self, request):
        return False
