from django.contrib import admin

from .models import USSDSession, VoiceCallLog

admin.site.register(USSDSession)
admin.site.register(VoiceCallLog)
