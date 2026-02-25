from django.contrib import admin
from .models import Profile, PCSpecs, Component, Build, BuildImage, AIAnalysisLog

class BuildImageInline(admin.TabularInline):
    model = BuildImage
    extra = 2

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'ai_credits', 'is_premium')
    list_filter = ('role', 'is_premium')

@admin.register(PCSpecs)
class PCSpecsAdmin(admin.ModelAdmin):
    list_display = ('user', 'label', 'cpu_model', 'gpu_model', 'ram_gb', 'is_active')
    list_filter = ('is_active',)

@admin.register(Component)
class ComponentAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'complexity_level')
    list_filter = ('category', 'complexity_level')

@admin.register(Build)
class BuildAdmin(admin.ModelAdmin):
    inlines = [BuildImageInline]
    list_display = ('title', 'author', 'created_at', 'is_public')
    list_filter = ('is_public', 'created_at')
    readonly_fields = ('info_hash', 'magnet_link', 'torrent_file')
    filter_horizontal = ('components',)

@admin.register(AIAnalysisLog)
class AIAnalysisLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'build', 'predicted_fps', 'created_at')
    readonly_fields = ('user', 'build', 'specs', 'verdict', 'predicted_fps', 'created_at')