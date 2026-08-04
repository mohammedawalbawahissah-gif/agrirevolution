from django.urls import path

from .views import ussd_webhook, voice_webhook

urlpatterns = [
    path("webhook/", ussd_webhook, name="ussd-webhook"),
    path("voice-webhook/", voice_webhook, name="voice-webhook"),
]
