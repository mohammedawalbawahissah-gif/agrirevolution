from django.contrib import admin

from .models import Order, ProduceListing

admin.site.register(ProduceListing)
admin.site.register(Order)
