from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
<<<<<<< HEAD
=======

    def ready(self):
        import core.signals
>>>>>>> 9d4a0584d37ebbb0bf0e81a90981124d08d63ced
