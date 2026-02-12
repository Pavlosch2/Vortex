from django.db import models
from django.contrib.auth.models import User
from .utils import generate_torrent

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    ai_credits = models.IntegerField(default=0, verbose_name="Баланс AI-аналізів")
    is_premium = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} (AI Credits: {self.ai_credits})"

class PCSpecs(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="saved_specs", null=True, blank=True)
    label = models.CharField(max_length=100, default="Мій ПК", help_text="Напр: Домашній ПК або Ноутбук")
    cpu_model = models.CharField(max_length=255, verbose_name="Процесор")
    gpu_model = models.CharField(max_length=255, verbose_name="Відеокарта")
    ram_gb = models.IntegerField(default=0, verbose_name="ОЗП (ГБ)")
    is_active = models.BooleanField(default=True, help_text="Використовувати для автоматичного підбору")

    def __str__(self):
        return f"{self.label} ({self.cpu_model})"
    
class Component(models.Model):
    CATEGORIES = [
        ("script", "скрипт"),
        ('texture', 'текстура'),
        ('audio', 'аудіо'),
        ('graphic', 'графіка'),
    ]
    name = models.CharField(max_length=50)
    category = models.CharField(max_length=20, choices=CATEGORIES)
    fps_impact = models.IntegerField(default=0, help_text="Вплив на FPS")
    file_url = models.URLField(help_text="Посилання на файл у хмарі")
    conflicts_with = models.ManyToManyField('self', symmetrical=True, blank=True)

    def __str__(self):
        return self.name
    
class Build(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    components = models.ManyToManyField(Component, related_name="builds", blank=True)
    is_ai_generated = models.BooleanField(default=False, verbose_name="Створено ШІ")
    performance_score = models.IntegerField(default=0, help_text="Оцінка продуктивності від ШІ")
    min_ram_required = models.IntegerField(default=4)
    tags = models.CharField(max_length=255, help_text="Наприклад: Low-PC, Winter, Realistic")
    source_file = models.FileField(upload_to='build_archives/')
    torrent_file = models.FileField(upload_to='torrents/', null=True, blank=True)
    magnet_link = models.TextField(blank=True, null=True)
    info_hash = models.CharField(max_length=40, blank=True, null=True)
    trackers = models.TextField(default="udp://tracker.openbittorrent.com:80/announce,udp://tracker.opentrackr.org:1337/announce")

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