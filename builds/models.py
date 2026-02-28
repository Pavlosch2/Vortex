from django.db import models
from django.contrib.auth.models import User
from .utils import generate_torrent

class Profile(models.Model):
    ROLES = [
        ('user', 'Користувач'),
        ('manager', 'Менеджер контенту'),
        ('admin', 'Адміністратор'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    age = models.IntegerField(default=18)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True, verbose_name="Про себе")
    role = models.CharField(max_length=10, choices=ROLES, default='user')
    ai_credits = models.IntegerField(default=5, verbose_name="Баланс AI-аналізів")
    is_premium = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"

class PCSpecs(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="saved_specs")
    label = models.CharField(max_length=100, default="Мій ПК", help_text="Напр: Домашній ПК")
    cpu_model = models.CharField(max_length=255, verbose_name="Процесор")
    gpu_model = models.CharField(max_length=255, verbose_name="Відеокарта")
    ram_gb = models.IntegerField(default=0, verbose_name="ОЗП (ГБ)")
    is_active = models.BooleanField(default=True, help_text="Використовувати для автоматичного аналізу")

    def __str__(self):
        return f"{self.label} ({self.gpu_model})"

class Component(models.Model):
    CATEGORIES = [
        ("script", "Скрипт"),
        ('texture', 'Текстура'),
        ('audio', 'Аудіо'),
        ('graphic', 'Графіка'),
    ]
    name = models.CharField(max_length=50)
    category = models.CharField(max_length=20, choices=CATEGORIES)
    complexity_level = models.CharField(
        max_length=10, 
        choices=[('low', 'Низька'), ('med', 'Середня'), ('high', 'Висока')],
        default='low',
        help_text="Навантаження на систему"
    )
    description = models.TextField(blank=True, help_text="Технічні деталі для ШІ")
    conflicts_with = models.ManyToManyField('self', symmetrical=True, blank=True)

    def __str__(self):
        return self.name

class Build(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="created_builds")
    components = models.ManyToManyField(Component, related_name="builds", blank=True)
    
    video_url = models.URLField(blank=True, null=True, help_text="YouTube посилання")
    tags = models.CharField(max_length=255, help_text="Low-PC, Winter, Realistic")
    
    source_file = models.FileField(upload_to='build_archives/')
    torrent_file = models.FileField(upload_to='torrents/', null=True, blank=True)
    magnet_link = models.TextField(blank=True, null=True)
    info_hash = models.CharField(max_length=40, blank=True, null=True)
    
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        is_new = not self.pk
        super().save(*args, **kwargs)
        if self.source_file and (is_new or not self.torrent_file):
            try:
                t_name, t_hash, m_link = generate_torrent(self)
                Build.objects.filter(pk=self.pk).update(
                    torrent_file=f"torrents/{t_name}",
                    info_hash=t_hash,
                    magnet_link=m_link
                )
            except Exception as e:
                print(f"Помилка генерації торента: {e}")

    def __str__(self):
        return self.title

class BuildImage(models.Model):
    build = models.ForeignKey(Build, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to='build_gallery/')
    is_cover = models.BooleanField(default=False)

class AIAnalysisLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    build = models.ForeignKey(Build, on_delete=models.CASCADE)
    specs = models.ForeignKey(PCSpecs, on_delete=models.SET_NULL, null=True)
    verdict = models.TextField()
    predicted_fps = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)