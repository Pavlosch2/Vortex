from django.apps import AppConfig


class BuildsConfig(AppConfig):
    name = "builds"

    def ready(self):
        # Реєструємо сигнали (post_save для Profile)
        import builds.models  # noqa: F401
