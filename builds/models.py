from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from .utils import generate_torrent


class Profile(models.Model):
    ROLES = [
        ("user", "Користувач"),
        ("manager", "Менеджер контенту"),
        ("admin", "Адміністратор"),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    age = models.IntegerField(default=18)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    role = models.CharField(max_length=10, choices=ROLES, default="user")
    ai_credits = models.IntegerField(default=5, verbose_name="Баланс AI-аналізів")
    is_premium = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(user=instance)


class PCSpecs(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="saved_specs")
    label = models.CharField(max_length=100, default="Мій ПК")
    pc_name = models.CharField(max_length=255, blank=True, verbose_name="Назва ПК")
    cpu_model = models.CharField(max_length=255, verbose_name="Процесор")
    gpu_model = models.CharField(max_length=255, verbose_name="Відеокарта")
    ram_gb = models.IntegerField(default=0, verbose_name="ОЗП (ГБ)")
    ram_mhz = models.IntegerField(null=True, blank=True, verbose_name="Швидкість ОЗП (МГц)")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.label} ({self.gpu_model})"


class Component(models.Model):
    CATEGORIES = [
        ("script", "Скрипт"),
        ("texture", "Текстура"),
        ("audio", "Аудіо"),
        ("graphic", "Графіка"),
    ]
    COMPLEXITY = [
        ("low", "Низька"),
        ("med", "Середня"),
        ("high", "Висока"),
    ]
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORIES)
    complexity_level = models.CharField(
        max_length=10, choices=COMPLEXITY, default="low"
    )
    description = models.TextField(blank=True)
    conflicts_with = models.ManyToManyField("self", symmetrical=True, blank=True)

    def __str__(self):
        return self.name


class Build(models.Model):
    TYPE_CHOICES = [
        ("build", "Збірка"),
        ("script", "Скрипт"),
    ]
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    build_type = models.CharField(
        max_length=10, choices=TYPE_CHOICES, default="build", verbose_name="Тип"
    )
    author = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_builds"
    )
    components = models.ManyToManyField(Component, related_name="builds", blank=True)
    video_url = models.URLField(blank=True, null=True)
    tags = models.CharField(
        max_length=255, blank=True, help_text="Через кому: Low-PC, Winter, Realistic"
    )
    source_file = models.FileField(upload_to="build_archives/")
    torrent_file = models.FileField(upload_to="torrents/", null=True, blank=True)
    magnet_link = models.TextField(blank=True, null=True)
    info_hash = models.CharField(max_length=64, blank=True, null=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archive_url = models.URLField(blank=True, null=True)
    archive_identifier = models.CharField(max_length=255, blank=True, null=True)
    download_count = models.PositiveIntegerField(default=0, verbose_name="Завантажень")

    def save(self, *args, **kwargs):
        is_new = not self.pk
        super().save(*args, **kwargs)
        if self.source_file and (is_new or not self.torrent_file):
            try:
                t_name, t_hash, m_link = generate_torrent(self)
                Build.objects.filter(pk=self.pk).update(
                    torrent_file=f"torrents/{t_name}",
                    info_hash=t_hash,
                    magnet_link=m_link,
                )
                self.torrent_file = f"torrents/{t_name}"
                self.info_hash = t_hash
                self.magnet_link = m_link
            except Exception as e:
                print(f"[Build.save] Torrent error: {e}")

    def __str__(self):
        return self.title


class BuildImage(models.Model):
    build = models.ForeignKey(Build, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="build_gallery/")
    is_cover = models.BooleanField(default=False)


class Favorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="favorites")
    build = models.ForeignKey(
        Build, on_delete=models.CASCADE, related_name="favorited_by"
    )
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "build")

    def __str__(self):
        return f"{self.user.username} → {self.build.title}"


class BuildSubmission(models.Model):
    STATUS_CHOICES = [
        ("pending", "На розгляді"),
        ("approved", "Схвалено"),
        ("rejected", "Відхилено"),
    ]
    TYPE_CHOICES = [
        ("build", "Збірка"),
        ("script", "Скрипт"),
    ]

    submitted_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="submissions"
    )
    title = models.CharField(max_length=255, verbose_name="Назва")
    description = models.TextField(blank=True, verbose_name="Опис")
    build_type = models.CharField(
        max_length=10, choices=TYPE_CHOICES, default="build", verbose_name="Тип"
    )
    tags = models.CharField(
        max_length=255, blank=True, help_text="Через кому: Low-PC, Winter"
    )
    video_url = models.URLField(blank=True, null=True, verbose_name="YouTube посилання")
    source_file = models.FileField(
        upload_to="submission_archives/", verbose_name="Архів збірки"
    )
    cover_image = models.ImageField(
        upload_to="submission_covers/", null=True, blank=True, verbose_name="Обкладинка"
    )

    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="pending", verbose_name="Статус"
    )
    rejection_reason = models.TextField(blank=True, verbose_name="Причина відхилення")
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_submissions",
        verbose_name="Перевірив",
    )
    published_build = models.OneToOneField(
        Build,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="from_submission",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Заявка на публікацію"
        verbose_name_plural = "Заявки на публікацію"

    def __str__(self):
        return f"[{self.get_status_display()}] {self.title} від {self.submitted_by.username}"


class AnalysisTask(models.Model):
    STATUS_CHOICES = [
        ("pending", "Очікує"),
        ("running", "Виконується"),
        ("done", "Готово"),
        ("error", "Помилка"),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="analysis_tasks"
    )
    build = models.ForeignKey(
        Build, on_delete=models.CASCADE, related_name="analysis_tasks"
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    result = models.JSONField(null=True, blank=True)
    error_msg = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Task #{self.pk} — {self.user.username} / {self.build.title} [{self.status}]"


class AIAnalysisLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    build = models.ForeignKey(Build, on_delete=models.CASCADE)
    specs = models.ForeignKey(PCSpecs, on_delete=models.SET_NULL, null=True)
    verdict = models.TextField()
    predicted_fps = models.CharField(max_length=255)
    risks = models.JSONField(default=list, blank=True)
    recommendations = models.JSONField(default=list, blank=True)
    task = models.OneToOneField(
        AnalysisTask,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="log",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} → {self.build.title} ({self.verdict})"


class SupportTicket(models.Model):
    STATUS_CHOICES = [
        ("open", "Відкрито"),
        ("in_progress", "В обробці"),
        ("closed", "Закрито"),
    ]
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="tickets",
        verbose_name="Користувач",
    )
    subject = models.CharField(max_length=255, verbose_name="Тема")
    message = models.TextField(verbose_name="Повідомлення")
    status = models.CharField(
        max_length=15, choices=STATUS_CHOICES, default="open", verbose_name="Статус"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Звернення"
        verbose_name_plural = "Звернення"

    def __str__(self):
        return f"[{self.get_status_display()}] {self.subject} — {self.user.username}"


class TicketScreenshot(models.Model):
    ticket = models.ForeignKey(
        SupportTicket, on_delete=models.CASCADE, related_name="screenshots"
    )
    image = models.ImageField(upload_to="support_screenshots/")


class TicketReply(models.Model):
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='replies')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField(blank=True)
    image = models.ImageField(upload_to='support_reply_images/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

class BuildReview(models.Model):
    build = models.ForeignKey(Build, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="build_reviews"
    )
    score = models.PositiveSmallIntegerField()
    text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("build", "user")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} → {self.build.title} ({self.score}★)"


class BuildPost(models.Model):
    build = models.ForeignKey(Build, on_delete=models.CASCADE, related_name="posts")
    author = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="build_posts"
    )
    text = models.TextField()
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_pinned", "-created_at"]

    def __str__(self):
        return f"{self.author.username} on {self.build.title}"


class BuildPostReply(models.Model):
    post = models.ForeignKey(
        BuildPost, on_delete=models.CASCADE, related_name="replies"
    )
    author = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="build_post_replies"
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.author.username} reply on post {self.post.id}"


class Notification(models.Model):
    TYPE_CHOICES = [
        ("post_reply", "Відповідь на пост"),
        ("ticket_reply", "Відповідь у зверненні"),
        ("ai_done", "Результат AI-аналізу"),
        ("moderation_warning", "Попередження модерації"),
        ("submission_status", "Зміна статусу заявки"),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    is_read = models.BooleanField(default=False)
    actor_name = models.CharField(max_length=150, blank=True)
    title = models.CharField(max_length=255, blank=True)
    body = models.TextField(blank=True)
    link_type = models.CharField(max_length=50, blank=True)
    link_params = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Сповіщення"
        verbose_name_plural = "Сповіщення"

    def __str__(self):
        return f"[{self.type}] {self.user.username}: {self.body[:60]}"
    
class UserWarning(models.Model):
    STATUS_CHOICES = [
        ("active", "Активне"),
        ("expired", "Прострочене"),
        ("executed", "Виконане"),
    ]
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="warnings"
    )
    issued_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="issued_warnings"
    )
    reason = models.TextField(verbose_name="Причина порушення")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Попередження"
        verbose_name_plural = "Попередження"

    def __str__(self):
        return f"Warning({self.user.username}, {self.status})"

    def refresh_status(self):
        from django.utils import timezone
        if self.status == "active" and timezone.now() > self.expires_at:
            self.status = "expired"
            self.save(update_fields=["status"])


class UserBlock(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="block"
    )
    blocked_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="issued_blocks"
    )
    reason = models.TextField(verbose_name="Причина блокування")
    is_permanent = models.BooleanField(default=False)
    blocked_until = models.DateTimeField(null=True, blank=True)
    warning = models.ForeignKey(
        UserWarning, on_delete=models.SET_NULL, null=True, blank=True, related_name="block"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Блокування"
        verbose_name_plural = "Блокування"

    def __str__(self):
        return f"Block({self.user.username}, permanent={self.is_permanent})"

    def is_active(self):
        from django.utils import timezone
        if self.is_permanent:
            return True
        return self.blocked_until and timezone.now() < self.blocked_until


class AppealChat(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="appeal"
    )
    block = models.ForeignKey(
        UserBlock, on_delete=models.CASCADE, related_name="appeal"
    )
    is_closed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Апеляція"
        verbose_name_plural = "Апеляції"

    def __str__(self):
        return f"Appeal({self.user.username})"


class AppealMessage(models.Model):
    chat = models.ForeignKey(AppealChat, on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"AppealMsg({self.author.username})"