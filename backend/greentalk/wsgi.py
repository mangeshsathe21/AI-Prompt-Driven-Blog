"""WSGI config for GreenTalk project."""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "greentalk.settings.production")
application = get_wsgi_application()
