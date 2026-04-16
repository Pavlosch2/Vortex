from django.apps import AppConfig


class BuildsConfig(AppConfig):
    name = "builds"

    def ready(self):
        import builds.models
