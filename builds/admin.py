from django.contrib import admin
from .models import Profile, PCSpecs, Component, Build

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'ai_credits', 'is_premium')

@admin.register(PCSpecs)
class PCSpecsAdmin(admin.ModelAdmin):
    list_display = ('label', 'cpu_model', 'gpu_model', 'ram_gb', 'is_active')

@admin.register(Component)
class ComponentAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'fps_impact')

@admin.register(Build)
class BuildAdmin(admin.ModelAdmin):
    list_display = ('title', 'performance_score', 'info_hash')
    readonly_fields = ('info_hash', 'magnet_link', 'torrent_file')